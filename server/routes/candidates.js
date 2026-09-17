const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// GET /api/candidates?category=Miss  -> liste publique des candidats actifs
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const fields =
      "id, name, category, candidacy_number, bio, project_desc, photo_path, votes_count";
    let result;
    if (category) {
      result = await pool.query(
        `SELECT ${fields} FROM candidates WHERE is_active = 1 AND category = $1 ORDER BY votes_count DESC`,
        [category]
      );
    } else {
      result = await pool.query(
        `SELECT ${fields} FROM candidates WHERE is_active = 1 ORDER BY votes_count DESC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger les candidats." });
  }
});

// GET /api/candidates/:id -> detail d'un candidat
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, category, candidacy_number, bio, project_desc, photo_path, votes_count
       FROM candidates WHERE id = $1 AND is_active = 1`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Candidat introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger ce candidat." });
  }
});

module.exports = router;
