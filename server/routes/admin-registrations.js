// Gestion des candidatures (admin). Monte dans routes/admin.js APRES
// requireAdmin : toutes ces routes exigent un jeton administrateur valide.
const express = require("express");
const { pool } = require("../db");
const { getSettings, saveSettings, computePhase, warnings, DEFAULT_SETTINGS } = require("../registration/config");
const { STATUSES } = require("./registration");

const router = express.Router();
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const STATUS_KEYS = Object.keys(STATUSES);
const adminName = (req) => (req.admin && req.admin.username) || "admin";
const asId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const like = (s) => "%" + String(s).replace(/[\\%_]/g, (c) => "\\" + c) + "%";

// ---------- Tableau de bord ----------
router.get("/stats", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE category = 'Miss')::int AS miss,
        COUNT(*) FILTER (WHERE category = 'Mister')::int AS mister,
        COUNT(*) FILTER (WHERE status IN ('submitted','in_review'))::int AS pending,
        COUNT(*) FILTER (WHERE status = 'incomplete')::int AS incomplete,
        COUNT(*) FILTER (WHERE status = 'validated')::int AS validated,
        COUNT(*) FILTER (WHERE status = 'shortlisted')::int AS shortlisted
      FROM registration_applications`);
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ---------- Parametres ----------
router.get("/settings", async (req, res) => {
  try {
    const s = await getSettings();
    res.json({ settings: s, phase: computePhase(s), warnings: warnings(s), now: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

function cleanList(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((x) => String(x).trim()).filter(Boolean))].slice(0, 60).map((x) => x.slice(0, 100));
}
function intOrNull(v, name, errors) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 120) {
    errors.push(`${name} invalide.`);
    return null;
  }
  return n;
}
function isoOrEmpty(v, name, errors) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) {
    errors.push(`${name} invalide.`);
    return "";
  }
  return d.toISOString();
}

router.put("/settings", async (req, res) => {
  try {
    const b = req.body || {};
    const errors = [];
    const current = await getSettings();
    const s = { ...current };

    s.open = b.open === true;
    s.starts_at = isoOrEmpty(b.starts_at, "Date de début", errors);
    s.ends_at = isoOrEmpty(b.ends_at, "Date de clôture", errors);
    if (s.starts_at && s.ends_at && new Date(s.ends_at) <= new Date(s.starts_at))
      errors.push("La clôture doit être postérieure à l'ouverture.");
    s.closed_message = String(b.closed_message || "").trim().slice(0, 500);
    s.edition = /^\d{4}$/.test(String(b.edition || "")) ? String(b.edition) : current.edition;
    s.min_age = intOrNull(b.min_age, "Âge minimum", errors);
    s.max_age = intOrNull(b.max_age, "Âge maximum", errors);
    if (s.min_age != null && s.max_age != null && s.min_age > s.max_age)
      errors.push("L'âge minimum dépasse l'âge maximum.");
    s.allowed_fields = cleanList(b.allowed_fields);
    s.allowed_levels = cleanList(b.allowed_levels);

    const docs = b.documents && typeof b.documents === "object" ? b.documents : {};
    s.documents = { photo: "required" };
    for (const k of ["student_card", "id_document"]) {
      s.documents[k] = ["off", "optional", "required"].includes(docs[k]) ? docs[k] : "off";
    }

    s.special_conditions = String(b.special_conditions || "").slice(0, 10000);
    const rules = String(b.rules_text || "").slice(0, 30000);
    if (rules !== current.rules_text) s.rules_version = new Date().toISOString().slice(0, 10) + "-" + Date.now().toString(36);
    s.rules_text = rules;
    s.privacy_text = String(b.privacy_text || "").slice(0, 30000);

    if (errors.length) return res.status(400).json({ error: errors.join(" ") });
    await saveSettings(s);
    res.json({ settings: s, phase: computePhase(s), warnings: warnings(s) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ---------- Liste + filtres ----------
function buildFilter(query) {
  const where = [];
  const params = [];
  const add = (sql, val) => {
    params.push(val);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (query.q) {
    params.push(like(String(query.q).slice(0, 80)));
    const p = `$${params.length}`;
    where.push(`(last_name ILIKE ${p} OR first_names ILIKE ${p} OR reference ILIKE ${p} OR phone ILIKE ${p})`);
  }
  if (["Miss", "Mister"].includes(query.category)) add("category = ?", query.category);
  if (STATUS_KEYS.includes(query.status)) add("status = ?", query.status);
  if (query.field) add("field_of_study ILIKE ?", like(String(query.field).slice(0, 100)));
  if (query.complete === "1") where.push("is_complete = TRUE");
  if (query.complete === "0") where.push("is_complete = FALSE");
  return { sql: where.length ? "WHERE " + where.join(" AND ") : "", params };
}

router.get("/", async (req, res) => {
  try {
    const { sql, params } = buildFilter(req.query);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const total = await pool.query(`SELECT COUNT(*)::int AS n FROM registration_applications ${sql}`, params);
    const rows = await pool.query(
      `SELECT id, reference, last_name, first_names, category, field_of_study, study_level, status, is_complete, created_at
       FROM registration_applications ${sql}
       ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params
    );
    const fields = await pool.query(
      "SELECT DISTINCT field_of_study FROM registration_applications ORDER BY field_of_study LIMIT 200"
    );
    res.json({
      total: total.rows[0].n,
      page,
      limit,
      rows: rows.rows,
      fields: fields.rows.map((f) => f.field_of_study),
      statuses: Object.fromEntries(STATUS_KEYS.map((k) => [k, STATUSES[k].label])),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ---------- Export CSV (donnees minimales) ----------
// Declaree AVANT "/:id". Les pieces et documents ne sont jamais exportes ;
// les coordonnees ne le sont que sur demande explicite (?contacts=1).
function csvCell(v) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise l'injection de formules (Excel)
  return `"${s.replace(/"/g, '""')}"`;
}
router.get("/export.csv", async (req, res) => {
  try {
    const withContacts = req.query.contacts === "1";
    const { sql, params } = buildFilter(req.query);
    const r = await pool.query(
      `SELECT reference, last_name, first_names, category, field_of_study, study_level, academic_year,
              city, phone, whatsapp, email, status, is_complete, created_at
       FROM registration_applications ${sql} ORDER BY created_at ASC, id ASC`,
      params
    );
    const head = ["Référence", "Nom", "Prénoms", "Catégorie", "Filière", "Niveau", "Année académique", "Ville", "Statut", "Dossier complet", "Date de soumission"];
    if (withContacts) head.push("Téléphone", "WhatsApp", "Email");
    const lines = [head.map(csvCell).join(";")];
    for (const x of r.rows) {
      const row = [
        x.reference, x.last_name, x.first_names, x.category, x.field_of_study, x.study_level, x.academic_year,
        x.city, (STATUSES[x.status] || {}).label || x.status, x.is_complete ? "Oui" : "Non",
        new Date(x.created_at).toISOString(),
      ];
      if (withContacts) row.push(x.phone, x.whatsapp, x.email);
      lines.push(row.map(csvCell).join(";"));
    }
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", 'attachment; filename="candidatures-mmfa.csv"');
    res.send("\uFEFF" + lines.join("\r\n"));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ---------- Detail d'une candidature ----------
router.get("/:id", async (req, res) => {
  const id = asId(req.params.id);
  if (!id) return res.status(404).json({ error: "Candidature introuvable." });
  try {
    const a = await pool.query(
      `SELECT id, reference, edition, last_name, first_names, category, birth_date::text AS birth_date, nationality, city,
              phone, whatsapp, email, field_of_study, study_level, academic_year, answers, status, public_message,
              is_complete, created_at, updated_at
       FROM registration_applications WHERE id = $1`,
      [id]
    );
    if (!a.rowCount) return res.status(404).json({ error: "Candidature introuvable." });
    const [docs, hist, consents] = await Promise.all([
      pool.query("SELECT id, doc_type, mime_type, file_size, created_at FROM registration_documents WHERE application_id = $1 ORDER BY id", [id]),
      pool.query("SELECT id, event_type, old_status, new_status, note, visible_to_candidate, changed_by, created_at FROM registration_status_history WHERE application_id = $1 ORDER BY created_at DESC, id DESC", [id]),
      pool.query("SELECT consent_type, accepted, rules_version, created_at FROM registration_consents WHERE application_id = $1 ORDER BY id", [id]),
    ]);
    res.json({
      application: a.rows[0],
      documents: docs.rows,
      history: hist.rows,
      consents: consents.rows,
      statuses: Object.fromEntries(STATUS_KEYS.map((k) => [k, STATUSES[k].label])),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ---------- Fichier prive (jamais une URL publique) ----------
router.get("/:id/documents/:docId", async (req, res) => {
  const id = asId(req.params.id);
  const docId = asId(req.params.docId);
  if (!id || !docId) return res.status(404).json({ error: "Document introuvable." });
  try {
    const r = await pool.query(
      "SELECT doc_type, mime_type, data FROM registration_documents WHERE id = $1 AND application_id = $2",
      [docId, id]
    );
    if (!r.rowCount) return res.status(404).json({ error: "Document introuvable." });
    const d = r.rows[0];
    res.set({
      "Content-Type": d.mime_type,
      "Content-Disposition": `inline; filename="${d.doc_type}-${id}.${d.mime_type === "image/png" ? "png" : "jpg"}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });
    res.send(d.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ---------- Changement de statut + message visible ----------
router.put("/:id/status", async (req, res) => {
  const id = asId(req.params.id);
  const b = req.body || {};
  if (!id) return res.status(404).json({ error: "Candidature introuvable." });
  if (!STATUS_KEYS.includes(b.status)) return res.status(400).json({ error: "Statut invalide." });
  const publicMessage = String(b.public_message || "").trim().slice(0, 1500);
  const internalNote = String(b.internal_note || "").trim().slice(0, 1500);
  if (b.status === "incomplete" && !publicMessage)
    return res.status(400).json({ error: "Indique au candidat les corrections ou pièces à fournir." });
  try {
    const cur = await pool.query("SELECT status FROM registration_applications WHERE id = $1", [id]);
    if (!cur.rowCount) return res.status(404).json({ error: "Candidature introuvable." });
    const old = cur.rows[0].status;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "UPDATE registration_applications SET status = $2, public_message = $3, updated_at = NOW() WHERE id = $1",
        [id, b.status, publicMessage]
      );
      await client.query(
        `INSERT INTO registration_status_history (application_id, event_type, old_status, new_status, note, visible_to_candidate, changed_by)
         VALUES ($1,'status',$2,$3,$4,TRUE,$5)`,
        [id, old, b.status, internalNote, adminName(req)]
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      if (e.code === "23505")
        return res.status(409).json({ error: "Impossible de réactiver : le numéro est utilisé par une autre candidature." });
      throw e;
    } finally {
      client.release();
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ---------- Dossier complet / commentaire interne ----------
router.put("/:id/complete", async (req, res) => {
  const id = asId(req.params.id);
  if (!id) return res.status(404).json({ error: "Candidature introuvable." });
  const complete = req.body && req.body.is_complete === true;
  try {
    const r = await pool.query(
      "UPDATE registration_applications SET is_complete = $2, updated_at = NOW() WHERE id = $1 RETURNING id",
      [id, complete]
    );
    if (!r.rowCount) return res.status(404).json({ error: "Candidature introuvable." });
    await pool.query(
      `INSERT INTO registration_status_history (application_id, event_type, note, visible_to_candidate, changed_by)
       VALUES ($1,'complete',$2,FALSE,$3)`,
      [id, complete ? "Dossier marqué comme complet" : "Dossier marqué comme non complet", adminName(req)]
    );
    res.json({ ok: true, is_complete: complete });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/:id/note", async (req, res) => {
  const id = asId(req.params.id);
  const note = String((req.body && req.body.note) || "").trim().slice(0, 1500);
  if (!id) return res.status(404).json({ error: "Candidature introuvable." });
  if (!note) return res.status(400).json({ error: "Commentaire vide." });
  try {
    const ex = await pool.query("SELECT 1 FROM registration_applications WHERE id = $1", [id]);
    if (!ex.rowCount) return res.status(404).json({ error: "Candidature introuvable." });
    await pool.query(
      `INSERT INTO registration_status_history (application_id, event_type, note, visible_to_candidate, changed_by)
       VALUES ($1,'note',$2,FALSE,$3)`,
      [id, note, adminName(req)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
