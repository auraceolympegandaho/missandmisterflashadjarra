const { pool } = require("../db");

const SETTINGS_KEY = "registration_settings";

// Aucune regle officielle n'est inventee : tout ce qui n'est pas defini par
// l'administration reste vide / null (= pas de contrainte appliquee).
const DEFAULT_SETTINGS = {
  open: false, // interrupteur principal : ferme tant que l'admin ne l'active pas
  starts_at: "", // ISO 8601 (UTC) ou vide
  ends_at: "",
  closed_message: "",
  edition: "2027",
  min_age: null,
  max_age: null,
  allowed_fields: [], // vide = toute filiere acceptee (saisie libre)
  allowed_levels: [], // vide = tout niveau accepte (saisie libre)
  documents: { photo: "required", student_card: "off", id_document: "off" }, // off | optional | required
  special_conditions: "",
  rules_text: "",
  rules_version: "",
  privacy_text: "",
};

const MESSAGES = {
  not_open: "Les inscriptions ne sont pas encore ouvertes. Revenez prochainement.",
  open: "Les inscriptions sont ouvertes. Dépose ta candidature dès maintenant !",
  ended: "La période officielle d'inscription est terminée. Merci pour votre intérêt.",
};

const DOC_TYPES = {
  photo: "Photo de la candidature",
  student_card: "Carte d'étudiant",
  id_document: "Pièce d'identité",
};

async function getSettings() {
  try {
    const r = await pool.query("SELECT value FROM settings WHERE key = $1", [SETTINGS_KEY]);
    const stored = r.rowCount ? JSON.parse(r.rows[0].value) : {};
    const merged = { ...DEFAULT_SETTINGS, ...stored };
    merged.documents = { ...DEFAULT_SETTINGS.documents, ...(stored.documents || {}) };
    merged.documents.photo = "required"; // la photo est toujours exigee
    return merged;
  } catch (e) {
    console.error("[registration] lecture des parametres impossible :", e.message);
    return { ...DEFAULT_SETTINGS }; // en cas de doute : inscriptions fermees
  }
}

async function saveSettings(settings) {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [SETTINGS_KEY, JSON.stringify(settings)]
  );
}

// Phase calculee avec l'heure du SERVEUR uniquement.
function computePhase(s, now = new Date()) {
  const start = s.starts_at ? new Date(s.starts_at) : null;
  const end = s.ends_at ? new Date(s.ends_at) : null;
  const ended = end && !isNaN(end) && now > end;

  if (!s.open) {
    if (s.closed_message) return { phase: "closed", message: s.closed_message };
    return ended
      ? { phase: "ended", message: MESSAGES.ended }
      : { phase: "not_open", message: MESSAGES.not_open };
  }
  if (start && !isNaN(start) && now < start) return { phase: "not_open", message: MESSAGES.not_open };
  if (ended) return { phase: "ended", message: MESSAGES.ended };
  return { phase: "open", message: MESSAGES.open };
}

function warnings(s) {
  const w = [];
  if (!s.rules_text.trim()) w.push("Le règlement du concours n'est pas encore renseigné.");
  if (!s.privacy_text.trim()) w.push("La politique de confidentialité n'est pas encore renseignée.");
  if (s.open && !s.ends_at) w.push("Aucune date de clôture n'est définie.");
  if (s.min_age == null && s.max_age == null) w.push("Aucune limite d'âge n'est définie (aucune vérification d'âge appliquée).");
  return w;
}

module.exports = { getSettings, saveSettings, computePhase, warnings, DEFAULT_SETTINGS, MESSAGES, DOC_TYPES };
