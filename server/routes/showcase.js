// Presentation publique des candidats (page d'accueil + profil).
// Lecture seule. Ne renvoie JAMAIS de votes, de classement ni de rang :
// ce n'est pas un espace de vote. Seuls les profils publies par l'administration
// (is_published = 1) ET actifs (is_active = 1) sont visibles.
const express = require("express");
const { pool } = require("../db");

const router = express.Router();

const CARD_FIELDS = `id, name, category, candidacy_number, bio, photo_path, study_year, field_of_study`;
const PROFILE_FIELDS = `${CARD_FIELDS}, academic_path, interests, talent, project_desc, motivation`;
const VISIBLE = "is_published = 1 AND is_active = 1";

// Retire les champs vides pour que le client n'affiche que ce qui est renseigne.
function compact(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

// GET /api/showcase -> { miss: [...], mister: [...] }
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${CARD_FIELDS} FROM candidates
       WHERE ${VISIBLE}
       ORDER BY NULLIF(regexp_replace(candidacy_number, '\\D', '', 'g'), '')::int ASC NULLS LAST, name ASC`
    );
    const rows = result.rows.map(compact);
    res.set("Cache-Control", "public, max-age=60");
    res.json({
      miss: rows.filter((r) => r.category === "Miss"),
      mister: rows.filter((r) => r.category === "Mister"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger les candidats." });
  }
});

// GET /api/showcase/:id -> profil detaille (404 si non publie)
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: "Profil introuvable." });
  }
  try {
    const result = await pool.query(
      `SELECT ${PROFILE_FIELDS} FROM candidates WHERE id = $1 AND ${VISIBLE}`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Ce profil n'est pas disponible." });
    }
    res.set("Cache-Control", "public, max-age=60");
    res.json(compact(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger ce profil." });
  }
});

module.exports = router;
