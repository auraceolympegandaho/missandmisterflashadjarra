const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
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
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM admin_users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
    return res.status(401).json({ error: "Identifiants incorrects." });
  }
  const token = jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: "12h",
  });
  res.json({ token });
});

// Tout ce qui suit necessite d'etre connecte en tant qu'admin
router.use(requireAdmin);

// GET /api/admin/candidates -> liste complete (y compris inactifs)
router.get("/candidates", (req, res) => {
  const rows = db.prepare("SELECT * FROM candidates ORDER BY created_at DESC").all();
  res.json(rows);
});

// POST /api/admin/candidates -> creer un candidat (avec photo optionnelle)
router.post("/candidates", upload.single("photo"), (req, res) => {
  const { name, category, bio } = req.body;
  if (!name || !["Miss", "Mister"].includes(category)) {
    return res.status(400).json({ error: "Nom et categorie (Miss/Mister) requis." });
  }
  const photoPath = req.file ? `/img/candidates/${req.file.filename}` : "";
  const result = db
    .prepare("INSERT INTO candidates (name, category, bio, photo_path) VALUES (?, ?, ?, ?)")
    .run(name, category, bio || "", photoPath);
  const created = db.prepare("SELECT * FROM candidates WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/admin/candidates/:id -> modifier un candidat
router.put("/candidates/:id", upload.single("photo"), (req, res) => {
  const existing = db.prepare("SELECT * FROM candidates WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Candidat introuvable." });

  const name = req.body.name ?? existing.name;
  const category = req.body.category ?? existing.category;
  const bio = req.body.bio ?? existing.bio;
  const isActive = req.body.is_active !== undefined ? Number(req.body.is_active) : existing.is_active;
  const photoPath = req.file ? `/img/candidates/${req.file.filename}` : existing.photo_path;

  db.prepare(
    "UPDATE candidates SET name = ?, category = ?, bio = ?, photo_path = ?, is_active = ? WHERE id = ?"
  ).run(name, category, bio, photoPath, isActive, req.params.id);

  const updated = db.prepare("SELECT * FROM candidates WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// DELETE /api/admin/candidates/:id
router.delete("/candidates/:id", (req, res) => {
  db.prepare("DELETE FROM candidates WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// PUT /api/admin/candidates/:id/votes -> ajustement manuel des votes (ex: vote papier, correction)
router.put("/candidates/:id/votes", (req, res) => {
  const delta = Number(req.body.delta || 0);
  db.prepare("UPDATE candidates SET votes_count = MAX(0, votes_count + ?) WHERE id = ?").run(
    delta,
    req.params.id
  );
  const updated = db.prepare("SELECT * FROM candidates WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// GET /api/admin/results -> classement + total des paiements
router.get("/results", (req, res) => {
  const candidates = db
    .prepare("SELECT id, name, category, votes_count FROM candidates ORDER BY votes_count DESC")
    .all();
  const totals = db
    .prepare(
      "SELECT COUNT(*) as nb_transactions_approuvees, COALESCE(SUM(amount_fcfa),0) as total_fcfa FROM transactions WHERE status = 'approved'"
    )
    .get();
  res.json({ candidates, totals });
});

// GET /api/admin/transactions -> historique des transactions (pour verification/support)
router.get("/transactions", (req, res) => {
  const rows = db
    .prepare(
      `SELECT t.*, c.name as candidate_name FROM transactions t
       LEFT JOIN candidates c ON c.id = t.candidate_id
       ORDER BY t.created_at DESC LIMIT 200`
    )
    .all();
  res.json(rows);
});

// GET/PUT /api/admin/settings/price
router.get("/settings/price", (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'price_per_vote'").get();
  res.json({ price_per_vote: Number(row.value) });
});
router.put("/settings/price", (req, res) => {
  const price = Number(req.body.price_per_vote);
  if (!price || price < 1) return res.status(400).json({ error: "Prix invalide." });
  db.prepare("UPDATE settings SET value = ? WHERE key = 'price_per_vote'").run(String(price));
  res.json({ price_per_vote: price });
});

module.exports = router;
