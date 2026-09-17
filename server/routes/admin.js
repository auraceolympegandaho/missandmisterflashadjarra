const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// --- Upload des photos de candidats ---
const uploadDir = path.join(__dirname, "..", "..", "public", "img", "candidates");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
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
  } catch (e) {
    console.error(e);
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/admin/candidates -> creer un candidat (avec photo optionnelle)
router.post("/candidates", upload.single("photo"), async (req, res) => {
  try {
    const { name, category, bio, candidacy_number, project_desc } = req.body;
    if (!name || !["Miss", "Mister"].includes(category)) {
      return res.status(400).json({ error: "Nom et categorie (Miss/Mister) requis." });
    }
    const photoPath = req.file ? `/img/candidates/${req.file.filename}` : "";
    const result = await pool.query(
      `INSERT INTO candidates (name, category, bio, photo_path, candidacy_number, project_desc)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, category, bio || "", photoPath, candidacy_number || "", project_desc || ""]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// PUT /api/admin/candidates/:id -> modifier un candidat
router.put("/candidates/:id", upload.single("photo"), async (req, res) => {
  try {
    const existingResult = await pool.query("SELECT * FROM candidates WHERE id = $1", [
      req.params.id,
    ]);
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ error: "Candidat introuvable." });

    const name = req.body.name ?? existing.name;
    const category = req.body.category ?? existing.category;
    const bio = req.body.bio ?? existing.bio;
    const candidacyNumber = req.body.candidacy_number ?? existing.candidacy_number;
    const projectDesc = req.body.project_desc ?? existing.project_desc;
    const isActive =
      req.body.is_active !== undefined ? Number(req.body.is_active) : existing.is_active;
    const photoPath = req.file ? `/img/candidates/${req.file.filename}` : existing.photo_path;

    const result = await pool.query(
      `UPDATE candidates
       SET name = $1, category = $2, bio = $3, photo_path = $4,
           candidacy_number = $5, project_desc = $6, is_active = $7
       WHERE id = $8 RETURNING *`,
      [name, category, bio, photoPath, candidacyNumber, projectDesc, isActive, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// DELETE /api/admin/candidates/:id
router.delete("/candidates/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM candidates WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// PUT /api/admin/candidates/:id/votes -> ajustement manuel des votes (ex: vote papier, correction)
router.put("/candidates/:id/votes", async (req, res) => {
  try {
    const delta = Number(req.body.delta || 0);
    const result = await pool.query(
      "UPDATE candidates SET votes_count = GREATEST(0, votes_count + $1) WHERE id = $2 RETURNING *",
      [delta, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/admin/results -> classement + total des paiements
router.get("/results", async (req, res) => {
  try {
    const candidates = await pool.query(
      "SELECT id, name, category, votes_count FROM candidates ORDER BY votes_count DESC"
    );
    const totals = await pool.query(
      `SELECT COUNT(*) as nb_transactions_approuvees, COALESCE(SUM(amount_fcfa), 0) as total_fcfa
       FROM transactions WHERE status = 'approved'`
    );
    const totalsRow = totals.rows[0];
    res.json({
      candidates: candidates.rows,
      totals: {
        nb_transactions_approuvees: Number(totalsRow.nb_transactions_approuvees),
        total_fcfa: Number(totalsRow.total_fcfa),
      },
    });
  } catch (e) {
    console.error(e);
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
    res.json(
      result.rows.map((t) => ({ ...t, amount_fcfa: Number(t.amount_fcfa) }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET/PUT /api/admin/settings/price
router.get("/settings/price", async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'price_per_vote'");
    res.json({ price_per_vote: Number(result.rows[0].value) });
  } catch (e) {
    console.error(e);
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
