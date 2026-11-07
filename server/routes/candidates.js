const express = require("express");
const { pool } = require("../db");

const router = express.Router();

const PUBLIC_FIELDS = `id, name, category, candidacy_number, bio, project_desc, photo_path, photos,
                       study_year, field_of_study, video_url, votes_count`;

// Sous-requetes de classement : rang du candidat dans SA categorie
// (les ex aequo partagent le meme rang) + effectif de la categorie.
const RANK_FIELDS = `
  (SELECT COUNT(*) + 1 FROM candidates r
     WHERE r.is_active = 1 AND r.category = c.category AND r.votes_count > c.votes_count) AS rank,
  (SELECT COUNT(*) FROM candidates t
     WHERE t.is_active = 1 AND t.category = c.category) AS category_total`;

// Parametres d'affichage public (votes / classement visibles ou non).
// Regles par defaut si la cle n'existe pas encore en base : tout est visible.
async function getPublicDisplay() {
  const defaults = { show_votes: true, show_ranking: true };
  try {
    const r = await pool.query("SELECT value FROM settings WHERE key = 'public_display'");
    if (r.rowCount === 0) return defaults;
    return { ...defaults, ...JSON.parse(r.rows[0].value) };
  } catch (e) {
    return defaults;
  }
}

// Retire cote serveur ce qui ne doit pas etre public : ainsi un chiffre masque
// reste introuvable meme en inspectant les requetes reseau.
function applyDisplayRules(row, display) {
  const out = { ...row, rank: Number(row.rank), category_total: Number(row.category_total) };
  if (!display.show_votes) delete out.votes_count;
  if (!display.show_ranking) {
    delete out.rank;
    delete out.category_total;
  }
  out.display = display;
  return out;
}

// GET /api/candidates?category=Miss -> liste publique des candidats actifs
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const display = await getPublicDisplay();
    const params = [];
    let where = "c.is_active = 1";
    if (category) {
      params.push(category);
      where += ` AND c.category = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT ${PUBLIC_FIELDS}, ${RANK_FIELDS}
       FROM candidates c
       WHERE ${where}
       ORDER BY c.votes_count DESC, c.name ASC`,
      params
    );
    res.json(result.rows.map((row) => applyDisplayRules(row, display)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger les candidats." });
  }
});

// GET /api/candidates/:id -> fiche publique d'un candidat
// Distingue trois cas pour que la page affiche un message clair :
//  - id invalide / inexistant        -> 404 reason "not_found"
//  - candidat existant mais retire   -> 404 reason "disabled"
//  - candidat actif                  -> 200 avec la fiche
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: "Candidat introuvable.", reason: "not_found" });
  }
  try {
    const display = await getPublicDisplay();
    const result = await pool.query(
      `SELECT ${PUBLIC_FIELDS}, c.is_active, ${RANK_FIELDS}
       FROM candidates c WHERE c.id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Candidat introuvable.", reason: "not_found" });
    }
    const row = result.rows[0];
    if (row.is_active !== 1) {
      return res.status(404).json({
        error: "Ce profil n'est plus disponible.",
        reason: "disabled",
      });
    }
    delete row.is_active;
    res.json(applyDisplayRules(row, display));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger ce candidat." });
  }
});

module.exports = { router, getPublicDisplay };
