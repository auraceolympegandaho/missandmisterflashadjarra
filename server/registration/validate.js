const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}' .-]{1,79}$/u;
const YEAR_RE = /^\d{4}\s?[-/]\s?\d{4}$/;

const ANSWER_LIMITS = {
  q1_presentation: { label: "Présentation", min: 20, max: 600 },
  q2_motivation: { label: "Motivation", min: 20, max: 800 },
  q3_qualities: { label: "Qualités", min: 10, max: 400 },
  q4_talents: { label: "Talents", min: 5, max: 400 },
  q5_leadership: { label: "Vision du leadership", min: 20, max: 600 },
  q6_contribution: { label: "Apport à la FLASH Adjarra", min: 20, max: 800 },
};

const CONSENTS = [
  "info_accuracy",
  "rules_read",
  "conditions_accepted",
  "privacy_read",
  "photo_consent",
];

// Retire les caracteres de controle ; conserve les retours a la ligne.
function clean(v) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

function normalizePhone(v) {
  const s = clean(v).replace(/[\s.\-()]/g, "");
  if (!/^\+?\d{8,15}$/.test(s)) return null;
  return s;
}

function parseDate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + "T00:00:00Z");
  if (isNaN(d) || d.toISOString().slice(0, 10) !== v) return null;
  return d;
}

function ageOn(birth, ref = new Date()) {
  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const m = ref.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

function inList(list, value) {
  return list.some((x) => x.toLowerCase() === value.toLowerCase());
}

// Valide et normalise. Retourne { errors, value }.
function validateApplication(raw, settings) {
  const errors = {};
  const d = raw && typeof raw === "object" ? raw : {};
  const v = {};

  v.last_name = clean(d.last_name);
  if (!NAME_RE.test(v.last_name)) errors.last_name = "Nom invalide (2 à 80 lettres).";
  v.first_names = clean(d.first_names);
  if (!NAME_RE.test(v.first_names)) errors.first_names = "Prénoms invalides (2 à 80 lettres).";

  v.category = clean(d.category);
  if (!["Miss", "Mister"].includes(v.category)) errors.category = "Choisis MISS ou MISTER.";

  const birth = parseDate(clean(d.birth_date));
  const today = new Date();
  if (!birth || birth > today || birth.getUTCFullYear() < 1900) {
    errors.birth_date = "Date de naissance invalide.";
  } else {
    v.birth_date = clean(d.birth_date);
    const age = ageOn(birth, today);
    // Seules les limites definies par l'administration s'appliquent.
    if (settings.min_age != null && age < settings.min_age)
      errors.birth_date = `Âge minimum requis : ${settings.min_age} ans.`;
    if (settings.max_age != null && age > settings.max_age)
      errors.birth_date = `Âge maximum autorisé : ${settings.max_age} ans.`;
  }

  v.nationality = clean(d.nationality);
  if (v.nationality.length < 2 || v.nationality.length > 60) errors.nationality = "Nationalité requise.";
  v.city = clean(d.city);
  if (v.city.length < 2 || v.city.length > 80) errors.city = "Ville de résidence requise.";

  v.phone = normalizePhone(d.phone);
  if (!v.phone) errors.phone = "Numéro de téléphone invalide (8 à 15 chiffres).";
  v.whatsapp = normalizePhone(d.whatsapp);
  if (!v.whatsapp) errors.whatsapp = "Numéro WhatsApp invalide (8 à 15 chiffres).";

  v.email = clean(d.email).toLowerCase();
  if (v.email && (v.email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)))
    errors.email = "Adresse électronique invalide.";

  v.field_of_study = clean(d.field_of_study);
  if (v.field_of_study.length < 2 || v.field_of_study.length > 100) errors.field_of_study = "Filière requise.";
  else if (settings.allowed_fields.length && !inList(settings.allowed_fields, v.field_of_study))
    errors.field_of_study = "Cette filière n'est pas autorisée pour cette édition.";

  v.study_level = clean(d.study_level);
  if (v.study_level.length < 1 || v.study_level.length > 50) errors.study_level = "Niveau d'études requis.";
  else if (settings.allowed_levels.length && !inList(settings.allowed_levels, v.study_level))
    errors.study_level = "Ce niveau n'est pas autorisé pour cette édition.";

  v.academic_year = clean(d.academic_year);
  if (!YEAR_RE.test(v.academic_year)) errors.academic_year = "Format attendu : 2026-2027.";

  v.answers = {};
  const a = d.answers && typeof d.answers === "object" ? d.answers : {};
  for (const [key, lim] of Object.entries(ANSWER_LIMITS)) {
    const text = clean(a[key]);
    if (text.length < lim.min) errors[key] = `Réponse trop courte (minimum ${lim.min} caractères).`;
    else if (text.length > lim.max) errors[key] = `Réponse trop longue (maximum ${lim.max} caractères).`;
    v.answers[key] = text;
  }

  const c = d.consents && typeof d.consents === "object" ? d.consents : {};
  v.consents = {};
  for (const k of CONSENTS) {
    v.consents[k] = c[k] === true;
    if (c[k] !== true) errors[`consent_${k}`] = "Cette case doit être cochée.";
  }

  return { errors, value: v };
}

module.exports = { validateApplication, ANSWER_LIMITS, CONSENTS, clean };
