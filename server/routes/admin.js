const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { pool, DEFAULT_HOMEPAGE, DEFAULT_FAQ, DEFAULT_CONTACT, DEFAULT_ABOUT } = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// --- Stockage des photos de candidats sur Cloudinary ---
// IMPORTANT : le disque du service web Render (plan gratuit) est ephemere
// (efface a chaque redeploiement). Les photos sont donc hebergees sur
// Cloudinary (offre gratuite), qui renvoie une URL stable et permanente.
// Necessite les variables d'environnement CLOUDINARY_CLOUD_NAME,
// CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (voir .env.example).
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn(
    "[admin] ATTENTION: variables Cloudinary manquantes. L'upload de photos echouera tant qu'elles ne sont pas definies."
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "miss-mister-flash-adjarra/candidates",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, height: 1200, crop: "limit" }],
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Fichier non-image refuse."));
    cb(null, true);
  },
});

// Upload combine pour un candidat : une photo principale + jusqu'a 6 photos
// supplementaires pour sa galerie.
const uploadCandidate = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Fichier non-image refuse."));
    cb(null, true);
  },
}).fields([
  { name: "photo", maxCount: 1 },
  { name: "photos", maxCount: 6 },
]);

// Dossier Cloudinary separe pour l'affiche/le visuel principal de l'accueil
const posterStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "miss-mister-flash-adjarra/homepage",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1600, height: 1600, crop: "limit" }],
  },
});
const uploadPoster = multer({
  storage: posterStorage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Fichier non-image refuse."));
    cb(null, true);
  },
}).single("poster");

// Dossier Cloudinary separe pour les logos partenaires (organisation propre)
const partnerStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "miss-mister-flash-adjarra/partners",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 600, height: 600, crop: "limit" }],
  },
});
const uploadPartnerLogo = multer({
  storage: partnerStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Fichier non-image refuse."));
    cb(null, true);
  },
});


// POST /api/admin/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query("SELECT * FROM admin_users WHERE username = $1", [username]);
    const user = result.rows[0];
    if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }
    const token = jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Tout ce qui suit necessite d'etre connecte en tant qu'admin
router.use(requireAdmin);

// GET /api/admin/candidates -> liste complete (y compris inactifs)
router.get("/candidates", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM candidates ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/admin/candidates -> creer un candidat (photo principale + galerie optionnelles)
router.post("/candidates", uploadCandidate, async (req, res) => {
  try {
    const {
      name,
      category,
      bio,
      candidacy_number,
      project_desc,
      study_year,
      field_of_study,
      video_url,
    } = req.body;
    if (!name || !["Miss", "Mister"].includes(category)) {
      return res.status(400).json({ error: "Nom et categorie (Miss/Mister) requis." });
    }
    const photoFile = req.files && req.files.photo ? req.files.photo[0] : null;
    const galleryFiles = req.files && req.files.photos ? req.files.photos : [];
    const photoPath = photoFile ? photoFile.path : "";
    const photos = galleryFiles.map((f) => f.path);

    const result = await pool.query(
      `INSERT INTO candidates
         (name, category, candidacy_number, bio, project_desc, photo_path, photos,
          study_year, field_of_study, video_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        name,
        category,
        candidacy_number || "",
        bio || "",
        project_desc || "",
        photoPath,
        JSON.stringify(photos),
        study_year || "",
        field_of_study || "",
        video_url || "",
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de creer le candidat." });
  }
});

// PUT /api/admin/candidates/:id -> modifier un candidat
// La ou les nouvelles photos de galerie envoyees s'ajoutent aux photos existantes
// (pour retirer une photo precise, voir DELETE /candidates/:id/photos).
router.put("/candidates/:id", uploadCandidate, async (req, res) => {
  try {
    const existingRes = await pool.query("SELECT * FROM candidates WHERE id = $1", [
      req.params.id,
    ]);
    const existing = existingRes.rows[0];
    if (!existing) return res.status(404).json({ error: "Candidat introuvable." });

    const name = req.body.name ?? existing.name;
    const category = req.body.category ?? existing.category;
    const candidacyNumber = req.body.candidacy_number ?? existing.candidacy_number;
    const bio = req.body.bio ?? existing.bio;
    const projectDesc = req.body.project_desc ?? existing.project_desc;
    const studyYear = req.body.study_year ?? existing.study_year;
    const fieldOfStudy = req.body.field_of_study ?? existing.field_of_study;
    const videoUrl = req.body.video_url ?? existing.video_url;
    const isActive =
      req.body.is_active !== undefined ? Number(req.body.is_active) : existing.is_active;

    const photoFile = req.files && req.files.photo ? req.files.photo[0] : null;
    const galleryFiles = req.files && req.files.photos ? req.files.photos : [];
    const photoPath = photoFile ? photoFile.path : existing.photo_path;
    const existingPhotos = Array.isArray(existing.photos) ? existing.photos : [];
    const photos = galleryFiles.length
      ? [...existingPhotos, ...galleryFiles.map((f) => f.path)]
      : existingPhotos;

    const updated = await pool.query(
      `UPDATE candidates
       SET name = $1, category = $2, candidacy_number = $3, bio = $4, project_desc = $5,
           photo_path = $6, photos = $7, study_year = $8, field_of_study = $9,
           video_url = $10, is_active = $11
       WHERE id = $12 RETURNING *`,
      [
        name,
        category,
        candidacyNumber,
        bio,
        projectDesc,
        photoPath,
        JSON.stringify(photos),
        studyYear,
        fieldOfStudy,
        videoUrl,
        isActive,
        req.params.id,
      ]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de modifier le candidat." });
  }
});

// DELETE /api/admin/candidates/:id/photos -> retirer une photo precise de la galerie
// Corps attendu : { "url": "https://.../photo.jpg" }
router.delete("/candidates/:id/photos", async (req, res) => {
  try {
    const { url } = req.body;
    const existingRes = await pool.query("SELECT * FROM candidates WHERE id = $1", [
      req.params.id,
    ]);
    const existing = existingRes.rows[0];
    if (!existing) return res.status(404).json({ error: "Candidat introuvable." });

    const remaining = (Array.isArray(existing.photos) ? existing.photos : []).filter(
      (p) => p !== url
    );
    const updated = await pool.query(
      "UPDATE candidates SET photos = $1 WHERE id = $2 RETURNING *",
      [JSON.stringify(remaining), req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de retirer cette photo." });
  }
});

// DELETE /api/admin/candidates/:id
router.delete("/candidates/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM candidates WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de supprimer le candidat." });
  }
});

// PUT /api/admin/candidates/:id/votes -> ajustement manuel des votes (ex: vote papier, correction)
router.put("/candidates/:id/votes", async (req, res) => {
  try {
    const delta = Number(req.body.delta || 0);
    const updated = await pool.query(
      "UPDATE candidates SET votes_count = GREATEST(0, votes_count + $1) WHERE id = $2 RETURNING *",
      [delta, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible d'ajuster les votes." });
  }
});

// GET /api/admin/results -> classement + total des paiements
router.get("/results", async (req, res) => {
  try {
    const candidatesRes = await pool.query(
      "SELECT id, name, category, votes_count FROM candidates ORDER BY votes_count DESC"
    );
    const totalsRes = await pool.query(
      `SELECT COUNT(*) as nb_transactions_approuvees, COALESCE(SUM(amount_fcfa),0) as total_fcfa
       FROM transactions WHERE status = 'approved'`
    );
    const totals = totalsRes.rows[0];
    res.json({
      candidates: candidatesRes.rows,
      totals: {
        nb_transactions_approuvees: Number(totals.nb_transactions_approuvees),
        total_fcfa: Number(totals.total_fcfa),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/admin/transactions -> historique des transactions (pour verification/support)
router.get("/transactions", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.name as candidate_name FROM transactions t
       LEFT JOIN candidates c ON c.id = t.candidate_id
       ORDER BY t.created_at DESC LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET/PUT /api/admin/settings/price
router.get("/settings/price", async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'price_per_vote'");
    res.json({ price_per_vote: Number(result.rows[0].value) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});
router.put("/settings/price", async (req, res) => {
  try {
    const price = Number(req.body.price_per_vote);
    if (!price || price < 1) return res.status(400).json({ error: "Prix invalide." });
    await pool.query("UPDATE settings SET value = $1 WHERE key = 'price_per_vote'", [
      String(price),
    ]);
    res.json({ price_per_vote: price });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET/PUT /api/admin/settings/countdown -> date/libelle du compte a rebours affiche sur l'accueil
router.get("/settings/countdown", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT key, value FROM settings WHERE key IN ('countdown_target', 'countdown_label')"
    );
    const map = Object.fromEntries(result.rows.map((r) => [r.key, r.value]));
    res.json({
      countdown_target: map.countdown_target || "",
      countdown_label: map.countdown_label || "Clôture des votes",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.put("/settings/countdown", async (req, res) => {
  try {
    const { countdown_target, countdown_label } = req.body;

    // countdown_target doit etre vide (pas d'echeance affichee) ou une date ISO valide
    if (countdown_target && isNaN(Date.parse(countdown_target))) {
      return res.status(400).json({ error: "Date invalide." });
    }

    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('countdown_target', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [countdown_target || ""]
    );
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('countdown_label', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [countdown_label || "Clôture des votes"]
    );

    res.json({ countdown_target: countdown_target || "", countdown_label: countdown_label || "Clôture des votes" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET/PUT /api/admin/settings/public-display
// Controle ce que le public voit sur les fiches candidats et le classement.
router.get("/settings/public-display", async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'public_display'");
    const stored = result.rowCount ? JSON.parse(result.rows[0].value) : {};
    res.json({ show_votes: true, show_ranking: true, ...stored });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.put("/settings/public-display", async (req, res) => {
  try {
    const value = {
      show_votes: req.body.show_votes !== false,
      show_ranking: req.body.show_ranking !== false,
    };
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('public_display', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(value)]
    );
    res.json(value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/admin/announcements -> liste complete (y compris masquees)
router.get("/announcements", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM announcements ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/admin/announcements -> creer une actualite
router.post("/announcements", async (req, res) => {
  try {
    const { tag, content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Le contenu de l'actualité est requis." });
    }
    const result = await pool.query(
      `INSERT INTO announcements (tag, content) VALUES ($1, $2) RETURNING *`,
      [tag || "", content.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de créer l'actualité." });
  }
});

// PUT /api/admin/announcements/:id -> modifier une actualite (contenu, tag, visibilite)
router.put("/announcements/:id", async (req, res) => {
  try {
    const existingRes = await pool.query("SELECT * FROM announcements WHERE id = $1", [
      req.params.id,
    ]);
    const existing = existingRes.rows[0];
    if (!existing) return res.status(404).json({ error: "Actualité introuvable." });

    const tag = req.body.tag ?? existing.tag;
    const content = req.body.content !== undefined ? req.body.content : existing.content;
    const isActive =
      req.body.is_active !== undefined ? Number(req.body.is_active) : existing.is_active;

    const updated = await pool.query(
      `UPDATE announcements SET tag = $1, content = $2, is_active = $3 WHERE id = $4 RETURNING *`,
      [tag, content, isActive, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de modifier l'actualité." });
  }
});

// DELETE /api/admin/announcements/:id
router.delete("/announcements/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM announcements WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de supprimer l'actualité." });
  }
});

// --- Partenaires ---

// GET /api/admin/partners -> liste complete (y compris masques), triee par ordre d'affichage
router.get("/partners", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM partners ORDER BY display_order ASC, created_at ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/admin/partners -> creer un partenaire (logo optionnel a la creation)
router.post("/partners", uploadPartnerLogo.single("logo"), async (req, res) => {
  try {
    const { name, website_url, display_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le nom du partenaire est requis." });
    }
    const logoPath = req.file ? req.file.path : "";
    const result = await pool.query(
      `INSERT INTO partners (name, logo_path, website_url, display_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), logoPath, website_url || "", Number(display_order) || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de créer le partenaire." });
  }
});

// PUT /api/admin/partners/:id -> modifier un partenaire (logo optionnel = on garde l'ancien)
router.put("/partners/:id", uploadPartnerLogo.single("logo"), async (req, res) => {
  try {
    const existingRes = await pool.query("SELECT * FROM partners WHERE id = $1", [req.params.id]);
    const existing = existingRes.rows[0];
    if (!existing) return res.status(404).json({ error: "Partenaire introuvable." });

    const name = req.body.name !== undefined && req.body.name.trim() ? req.body.name.trim() : existing.name;
    const websiteUrl = req.body.website_url ?? existing.website_url;
    const displayOrder =
      req.body.display_order !== undefined ? Number(req.body.display_order) : existing.display_order;
    const isActive =
      req.body.is_active !== undefined ? Number(req.body.is_active) : existing.is_active;
    const logoPath = req.file ? req.file.path : existing.logo_path;

    const updated = await pool.query(
      `UPDATE partners SET name = $1, logo_path = $2, website_url = $3, display_order = $4, is_active = $5
       WHERE id = $6 RETURNING *`,
      [name, logoPath, websiteUrl, displayOrder, isActive, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de modifier le partenaire." });
  }
});

// DELETE /api/admin/partners/:id
router.delete("/partners/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM partners WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de supprimer le partenaire." });
  }
});

// --- Accueil (contenu editable) ---

// GET /api/admin/homepage -> contenu actuel (complete avec les valeurs par
// defaut si des champs manquent, ex: apres une mise a jour du site)
// GET/PUT /api/admin/about -> contenu propre a la page A propos
// (steps du deroulement, texte du projet d'impact, texte de transparence).
router.get("/about", async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'about_content'");
    const stored = result.rows[0] ? JSON.parse(result.rows[0].value) : {};
    res.json({ ...DEFAULT_ABOUT, ...stored });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.put("/about", async (req, res) => {
  try {
    const { steps, project_text, transparency_text } = req.body;
    if (!Array.isArray(steps) || !steps.length) {
      return res.status(400).json({ error: "Ajoutez au moins une étape au déroulement." });
    }
    for (const s of steps) {
      if (!s || !String(s.title || "").trim() || !String(s.text || "").trim()) {
        return res.status(400).json({ error: "Chaque étape doit avoir un titre et un texte." });
      }
    }
    if (!String(project_text || "").trim()) {
      return res.status(400).json({ error: "Le texte du projet d'impact ne peut pas être vide." });
    }
    if (!String(transparency_text || "").trim()) {
      return res.status(400).json({ error: "Le texte de transparence ne peut pas être vide." });
    }

    const value = {
      steps: steps.map((s) => ({ title: s.title.trim(), text: s.text.trim() })),
      project_text: project_text.trim(),
      transparency_text: transparency_text.trim(),
    };
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('about_content', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(value)]
    );
    res.json(value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET/PUT /api/admin/faq -> contenu de la page FAQ publique
router.get("/faq", async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'faq_content'");
    const stored = result.rows[0] ? JSON.parse(result.rows[0].value) : {};
    res.json({ ...DEFAULT_FAQ, ...stored });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.put("/faq", async (req, res) => {
  try {
    const { sections } = req.body;
    if (!Array.isArray(sections)) {
      return res.status(400).json({ error: "Format invalide : 'sections' doit etre une liste." });
    }
    // Validation minimale : chaque section a un titre et une liste de questions/reponses non vides
    for (const s of sections) {
      if (!s || typeof s.title !== "string" || !s.title.trim()) {
        return res.status(400).json({ error: "Chaque section doit avoir un titre." });
      }
      if (!Array.isArray(s.items)) {
        return res.status(400).json({ error: "Chaque section doit avoir une liste de questions." });
      }
      for (const it of s.items) {
        if (!it || !String(it.q || "").trim() || !String(it.a || "").trim()) {
          return res.status(400).json({ error: "Chaque question doit avoir une reponse non vide." });
        }
      }
    }
    const value = { sections };
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('faq_content', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(value)]
    );
    res.json(value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET/PUT /api/admin/contact -> coordonnees affichees sur la page Contact
router.get("/contact", async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'contact_content'");
    const stored = result.rows[0] ? JSON.parse(result.rows[0].value) : {};
    res.json({ ...DEFAULT_CONTACT, ...stored });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.put("/contact", async (req, res) => {
  try {
    const { whatsapp, email, address, subjects } = req.body;

    // Le numero WhatsApp doit rester au format international sans "+" ni espaces
    const cleanWhatsapp = String(whatsapp || "").replace(/\D/g, "");
    if (!cleanWhatsapp || cleanWhatsapp.length < 8) {
      return res.status(400).json({ error: "Numéro WhatsApp invalide (format international, sans +)." });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Adresse e-mail invalide." });
    }
    if (!Array.isArray(subjects) || !subjects.length) {
      return res.status(400).json({ error: "Ajoutez au moins un sujet de contact." });
    }

    const value = {
      whatsapp: cleanWhatsapp,
      email: email.trim(),
      address: (address || "").trim(),
      subjects: subjects.map((s) => String(s).trim()).filter(Boolean),
    };
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('contact_content', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(value)]
    );
    res.json(value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/homepage", async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'homepage_content'");
    const stored = result.rows[0] ? JSON.parse(result.rows[0].value) : {};
    res.json({ ...DEFAULT_HOMEPAGE, ...stored });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// PUT /api/admin/homepage -> mettre a jour le contenu de l'accueil
// Envoye en multipart/form-data : champs texte simples + objectives/buttons
// en JSON (chaine), + fichier "poster" optionnel (nouvelle affiche/visuel).
router.put("/homepage", uploadPoster, async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'homepage_content'");
    const current = { ...DEFAULT_HOMEPAGE, ...(result.rows[0] ? JSON.parse(result.rows[0].value) : {}) };

    const b = req.body;
    let objectives = current.objectives;
    let buttons = current.buttons;
    try {
      if (b.objectives !== undefined) objectives = JSON.parse(b.objectives);
      if (b.buttons !== undefined) buttons = JSON.parse(b.buttons);
    } catch (e) {
      return res.status(400).json({ error: "Format invalide pour les objectifs ou les boutons." });
    }

    const updated = {
      hero_edition: b.hero_edition ?? current.hero_edition,
      hero_title: b.hero_title ?? current.hero_title,
      hero_slogan: b.hero_slogan ?? current.hero_slogan,
      hero_description: b.hero_description ?? current.hero_description,
      organizer_text: b.organizer_text ?? current.organizer_text,
      poster_path: req.file ? req.file.path : current.poster_path,
      objectives,
      buttons,
    };

    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('homepage_content', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(updated)]
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de mettre à jour l'accueil." });
  }
});

module.exports = router;
