const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { pool } = require("../db");
const { getSettings, computePhase, DOC_TYPES } = require("../registration/config");
const { validateApplication } = require("../registration/validate");
const { issueFormToken, verifyFormToken, hashIp, createLimiter, detectImageType } = require("../registration/security");
const { enqueue } = require("../registration/notify");

const router = express.Router();
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const MAX_FILE_MB = Number(process.env.REG_MAX_FILE_MB) || 3;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const STATUSES = {
  submitted: { label: "Candidature soumise", info: "Ton dossier a bien été reçu. Il sera examiné par le comité d'organisation." },
  in_review: { label: "Dossier en cours de vérification", info: "Ton dossier est en cours d'examen par l'organisation." },
  incomplete: { label: "Dossier incomplet", info: "Des éléments sont manquants ou à corriger. Consulte le message de l'organisation ci-dessous." },
  validated: { label: "Candidature validée administrativement", info: "Ton dossier est conforme. Cette étape ne signifie pas encore une sélection." },
  shortlisted: { label: "Candidature retenue pour la présélection", info: "Ton dossier est retenu pour la présélection. L'organisation te contactera." },
  rejected: { label: "Candidature non retenue", info: "Ta candidature n'a pas été retenue pour cette édition. Merci de ta participation." },
  withdrawn: { label: "Candidature retirée", info: "Cette candidature a été retirée." },
};

const submitLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  // Plusieurs etudiants peuvent partager la meme IP (wifi du campus, reseau mobile) :
  // la limite reste donc genereuse. Reglable via REG_SUBMIT_MAX_PER_HOUR.
  max: Number(process.env.REG_SUBMIT_MAX_PER_HOUR) || 30,
  message: "Trop de tentatives de dépôt depuis ce réseau. Réessayez plus tard.",
});
const trackLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: "Trop de tentatives. Réessayez dans quelques minutes.",
});
const configLimiter = createLimiter({ windowMs: 60 * 1000, max: 60 });

const upload = multer({
  storage: multer.memoryStorage(), // jamais ecrit sur le disque, jamais dans /public
  limits: { fileSize: MAX_FILE_BYTES, files: 3, fields: 10, fieldSize: 200 * 1024, parts: 20 },
}).fields([
  { name: "photo", maxCount: 1 },
  { name: "student_card", maxCount: 1 },
  { name: "id_document", maxCount: 1 },
]);

// Alphabet sans caracteres ambigus (0/O, 1/I/L)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomString(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return s;
}
const makeReference = (edition) => `MMFA-${edition}-${randomString(6)}`;
const makeTrackingCode = () => `${randomString(4)}-${randomString(4)}`;

// GET /api/registration/config -> informations PUBLIQUES uniquement
router.get("/config", configLimiter, async (req, res) => {
  try {
    const s = await getSettings();
    const p = computePhase(s);
    res.json({
      phase: p.phase,
      message: p.message,
      edition: s.edition,
      starts_at: s.starts_at || null,
      ends_at: s.ends_at || null,
      min_age: s.min_age,
      max_age: s.max_age,
      allowed_fields: s.allowed_fields,
      allowed_levels: s.allowed_levels,
      documents: s.documents,
      document_labels: DOC_TYPES,
      special_conditions: s.special_conditions,
      rules_text: s.rules_text,
      privacy_text: s.privacy_text,
      max_file_mb: MAX_FILE_MB,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Service momentanément indisponible." });
  }
});

// GET /api/registration/form-token -> jeton signe pour le formulaire
router.get("/form-token", configLimiter, (req, res) => {
  res.json({ token: issueFormToken() });
});

function runUpload(req, res) {
  return new Promise((resolve, reject) => upload(req, res, (err) => (err ? reject(err) : resolve())));
}

// POST /api/registration/submit
router.post("/submit", submitLimiter, async (req, res) => {
  try {
    await runUpload(req, res);
  } catch (err) {
    const msg =
      err && err.code === "LIMIT_FILE_SIZE"
        ? `Fichier trop volumineux (maximum ${MAX_FILE_MB} Mo).`
        : "Envoi des fichiers invalide.";
    return res.status(400).json({ error: msg });
  }

  try {
    const body = req.body || {};
    if (body.website) return res.status(400).json({ error: "Requête invalide." }); // champ piege (robots)
    if (!verifyFormToken(body.form_token)) {
      return res.status(400).json({
        error: "Session de formulaire expirée ou invalide. Recharge la page et réessaie.",
        code: "bad_token",
      });
    }

    // Controle de la periode d'inscription avec l'heure du serveur
    const settings = await getSettings();
    const phase = computePhase(settings);
    if (phase.phase !== "open") {
      return res.status(403).json({ error: phase.message, code: "closed" });
    }

    let data;
    try {
      data = JSON.parse(body.data || "{}");
    } catch (e) {
      return res.status(400).json({ error: "Données invalides." });
    }

    const { errors, value } = validateApplication(data, settings);

    // Fichiers : presence selon la configuration + verification du vrai type
    const files = req.files || {};
    const docs = [];
    for (const type of Object.keys(DOC_TYPES)) {
      const mode = settings.documents[type] || "off";
      const f = files[type] && files[type][0];
      if (!f) {
        if (mode === "required") errors[`file_${type}`] = `${DOC_TYPES[type]} obligatoire.`;
        continue;
      }
      if (mode === "off") continue; // fichier non demande : ignore
      const real = detectImageType(f.buffer);
      if (!real) {
        errors[`file_${type}`] = "Format non accepté. Utilise un fichier JPG, JPEG ou PNG.";
        continue;
      }
      docs.push({
        type,
        buffer: f.buffer,
        mime: real.mime,
        // nom interne aleatoire : le nom fourni par le candidat n'est jamais utilise
        key: `${crypto.randomBytes(16).toString("hex")}.${real.ext}`,
        sha256: crypto.createHash("sha256").update(f.buffer).digest("hex"),
      });
    }

    if (Object.keys(errors).length) {
      return res.status(422).json({ error: "Certains champs sont à corriger.", fields: errors });
    }

    const trackingCode = makeTrackingCode();
    const trackingHash = await bcrypt.hash(trackingCode, 10);
    const ipHash = hashIp(req.ip);

    let result = null;
    for (let attempt = 0; attempt < 5 && !result; attempt++) {
      const reference = makeReference(settings.edition);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const ins = await client.query(
          `INSERT INTO registration_applications
             (reference, tracking_code_hash, edition, last_name, first_names, category, birth_date,
              nationality, city, phone, whatsapp, email, field_of_study, study_level, academic_year,
              answers, status, submitted_ip_hash)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'submitted',$17)
           RETURNING id, created_at`,
          [
            reference, trackingHash, settings.edition, value.last_name, value.first_names, value.category,
            value.birth_date, value.nationality, value.city, value.phone, value.whatsapp, value.email,
            value.field_of_study, value.study_level, value.academic_year, JSON.stringify(value.answers), ipHash,
          ]
        );
        const appId = ins.rows[0].id;
        for (const d of docs) {
          await client.query(
            `INSERT INTO registration_documents (application_id, doc_type, storage_key, mime_type, file_size, sha256, data)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [appId, d.type, d.key, d.mime, d.buffer.length, d.sha256, d.buffer]
          );
        }
        for (const [type, accepted] of Object.entries(value.consents)) {
          await client.query(
            `INSERT INTO registration_consents (application_id, consent_type, accepted, rules_version) VALUES ($1,$2,$3,$4)`,
            [appId, type, accepted, settings.rules_version || ""]
          );
        }
        await client.query(
          `INSERT INTO registration_status_history (application_id, event_type, old_status, new_status, visible_to_candidate, changed_by)
           VALUES ($1,'status',NULL,'submitted',TRUE,'candidat')`,
          [appId]
        );
        await client.query("COMMIT");
        result = { id: appId, reference, created_at: ins.rows[0].created_at };
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        if (e.code === "23505") {
          if (String(e.constraint || "").includes("phone")) {
            return res.status(409).json({
              error: "Une candidature existe déjà avec ce numéro de téléphone.",
              fields: { phone: "Une candidature existe déjà avec ce numéro." },
            });
          }
          continue; // collision de reference (tres improbable) : on regenere
        }
        throw e;
      } finally {
        client.release();
      }
    }
    if (!result) throw new Error("Impossible de generer une reference unique.");

    // Notifications : apres validation de la transaction, jamais bloquantes
    const emailSent = await enqueue("applicant_receipt", result.id, value.email);
    await enqueue("admin_new_application", result.id, "");

    res.status(201).json({
      reference: result.reference,
      tracking_code: trackingCode, // affiche une seule fois ; seul son hash est conserve
      submitted_at: result.created_at,
      email_sent: emailSent,
    });
  } catch (err) {
    console.error("[registration] submit :", err);
    res.status(500).json({ error: "Une erreur est survenue. Ta candidature n'a pas pu être enregistrée, réessaie." });
  }
});

// POST /api/registration/track { reference, code }
const GENERIC_FAIL = "Référence ou code de suivi incorrect.";
const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;
const DUMMY_HASH = bcrypt.hashSync("dummy-value-for-timing", 10);

router.post("/track", trackLimiter, async (req, res) => {
  try {
    const reference = String((req.body && req.body.reference) || "").trim().toUpperCase();
    const code = String((req.body && req.body.code) || "").trim().toUpperCase();
    if (!/^MMFA-\d{4}-[A-Z0-9]{6}$/.test(reference) || !/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(code)) {
      return res.status(401).json({ error: GENERIC_FAIL });
    }
    const normalizedCode = code.includes("-") ? code : `${code.slice(0, 4)}-${code.slice(4)}`;

    const r = await pool.query(
      `SELECT id, reference, tracking_code_hash, last_name, first_names, category, status, public_message,
              created_at, updated_at, track_failed_attempts, track_locked_until
       FROM registration_applications WHERE reference = $1`,
      [reference]
    );
    const row = r.rows[0];

    if (!row) {
      bcrypt.compareSync(normalizedCode, DUMMY_HASH); // meme duree de traitement
      return res.status(401).json({ error: GENERIC_FAIL });
    }
    if (row.track_locked_until && new Date(row.track_locked_until) > new Date()) {
      return res.status(429).json({ error: "Trop de tentatives. Réessaie dans quelques minutes." });
    }

    if (!bcrypt.compareSync(normalizedCode, row.tracking_code_hash)) {
      const attempts = row.track_failed_attempts + 1;
      const lock = attempts >= LOCK_AFTER;
      await pool.query(
        `UPDATE registration_applications
         SET track_failed_attempts = $2,
             track_locked_until = CASE WHEN $3 THEN NOW() + ($4 || ' minutes')::interval ELSE track_locked_until END
         WHERE id = $1`,
        [row.id, lock ? 0 : attempts, lock, String(LOCK_MINUTES)]
      );
      return res.status(401).json({ error: GENERIC_FAIL });
    }

    await pool.query(
      "UPDATE registration_applications SET track_failed_attempts = 0, track_locked_until = NULL WHERE id = $1",
      [row.id]
    );
    const hist = await pool.query(
      `SELECT new_status, note, created_at FROM registration_status_history
       WHERE application_id = $1 AND visible_to_candidate = TRUE AND event_type = 'status'
       ORDER BY created_at ASC, id ASC`,
      [row.id]
    );
    const st = STATUSES[row.status] || STATUSES.submitted;
    // Uniquement le necessaire au suivi : aucune coordonnee, aucun fichier.
    res.json({
      reference: row.reference,
      name: `${row.first_names} ${row.last_name}`,
      category: row.category,
      status: row.status,
      status_label: st.label,
      status_info: st.info,
      message: row.public_message || "",
      submitted_at: row.created_at,
      updated_at: row.updated_at,
      timeline: hist.rows.map((h) => ({
        label: (STATUSES[h.new_status] || {}).label || h.new_status,
        at: h.created_at,
      })),
    });
  } catch (err) {
    console.error("[registration] track :", err);
    res.status(500).json({ error: "Service momentanément indisponible." });
  }
});

module.exports = { router, STATUSES };
