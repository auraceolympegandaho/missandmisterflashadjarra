const express = require("express");
const db = require("../db");

const router = express.Router();

// GET /api/candidates?category=Miss  -> liste publique des candidats actifs
router.get("/", (req, res) => {
  const { category } = req.query;
  let rows;
  if (category) {
    rows = db
      .prepare(
        "SELECT id, name, category, bio, photo_path, votes_count FROM candidates WHERE is_active = 1 AND category = ? ORDER BY votes_count DESC"
      )
      .all(category);
  } else {
    rows = db
      .prepare(
        "SELECT id, name, category, bio, photo_path, votes_count FROM candidates WHERE is_active = 1 ORDER BY votes_count DESC"
      )
      .all();
  }
  res.json(rows);
});

// GET /api/candidates/:id -> detail d'un candidat
router.get("/:id", (req, res) => {
  const row = db
    .prepare(
      "SELECT id, name, category, bio, photo_path, votes_count FROM candidates WHERE id = ? AND is_active = 1"
    )
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: "Candidat introuvable." });
  res.json(row);
});

module.exports = router;
