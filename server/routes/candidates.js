const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// Le nombre de votes et le classement ne sont exposes publiquement que si
// l'organisateur l'autorise (reglage "show_votes_public" dans l'admin).
async function isVotesPublic() {
  const result = await pool.query("SELECT value FROM settings WHERE key = 'show_votes_public'");
  return result.rows[0] ? result.rows[0].value === "1" : true;
}

function stripVotes(row) {
  const { votes_count, rank, category_total, ...rest } = row;
  return rest;
}

const RANKED = `
  SELECT id, name, category, candidacy_number, bio, project_desc, photo_path, photos,
         study_year, field_of_study, video_url, votes_count,
         (RANK() OVER (PARTITION BY category ORDER BY votes_count DESC))::int AS rank,
         (COUNT(*) OVER (PARTITION BY category))::int AS category_total
  FROM candidates WHERE is_active = 1`;

// GET /api/candidates?category=Miss -> { candidates: [...], show_votes: bool }
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    // Le classement est calcule sur tous les candidats actifs de la categorie,
    // puis on filtre : le rang reste correct meme avec ?category=.
    const result = category
      ? await pool.query(
          `SELECT * FROM (${RANKED}) t WHERE category = $1 ORDER BY votes_count DESC, id ASC`,
          [category]
        )
      : await pool.query(`SELECT * FROM (${RANKED}) t ORDER BY category ASC, votes_count DESC, id ASC`);
    const votesPublic = await isVotesPublic();
    res.json({
      candidates: votesPublic ? result.rows : result.rows.map(stripVotes),
      show_votes: votesPublic,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger les candidats." });
  }
});

// GET /api/candidates/:id -> detail. Distingue "introuvable" de "desactive".
router.get("/:id", async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(404).json({ error: "Candidat introuvable.", reason: "not_found" });
    }
    const result = await pool.query(`SELECT * FROM (${RANKED}) t WHERE id = $1`, [req.params.id]);

    if (result.rowCount === 0) {
      const exists = await pool.query("SELECT 1 FROM candidates WHERE id = $1", [req.params.id]);
      if (exists.rowCount === 0) {
        return res.status(404).json({ error: "Candidat introuvable.", reason: "not_found" });
      }
      return res
        .status(404)
        .json({ error: "Ce profil a été désactivé par l'organisation.", reason: "inactive" });
    }

    const votesPublic = await isVotesPublic();
    const row = votesPublic ? result.rows[0] : stripVotes(result.rows[0]);
    res.json({ ...row, show_votes: votesPublic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger ce candidat." });
  }
});

module.exports = router;
