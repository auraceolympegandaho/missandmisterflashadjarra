const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

if (!process.env.DATABASE_URL) {
  console.warn("[db] ATTENTION: DATABASE_URL n'est pas definie.");
}

// Sur Render, la base Postgres geree exige SSL pour les connexions externes.
// Pour desactiver (ex: Postgres local sans SSL), mettre PGSSL=false dans .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Miss','Mister')),
      candidacy_number TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      project_desc TEXT DEFAULT '',
      photo_path TEXT DEFAULT '',
      votes_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      candidate_id INTEGER NOT NULL REFERENCES candidates(id),
      votes_bought INTEGER NOT NULL,
      amount_fcfa INTEGER NOT NULL,
      voter_phone TEXT DEFAULT '',
      fedapay_transaction_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      tag TEXT DEFAULT '',
      content TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS partners (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      logo_path TEXT DEFAULT '',
      website_url TEXT DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Filet de securite si la table candidates existait deja sans ces colonnes
  // (ex: ancienne base) : on les ajoute si besoin sans rien casser.
  await pool.query(`
    ALTER TABLE candidates ADD COLUMN IF NOT EXISTS candidacy_number TEXT DEFAULT '';
    ALTER TABLE candidates ADD COLUMN IF NOT EXISTS project_desc TEXT DEFAULT '';
    ALTER TABLE candidates ADD COLUMN IF NOT EXISTS study_year TEXT DEFAULT '';
    ALTER TABLE candidates ADD COLUMN IF NOT EXISTS field_of_study TEXT DEFAULT '';
    ALTER TABLE candidates ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '';
    ALTER TABLE candidates ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]';
  `);

  const priceRow = await pool.query("SELECT value FROM settings WHERE key = 'price_per_vote'");
  if (priceRow.rowCount === 0) {
    await pool.query("INSERT INTO settings (key, value) VALUES ('price_per_vote', $1)", [
      process.env.PRICE_PER_VOTE || "100",
    ]);
  }

  // Contenu de la page d'accueil, editable depuis l'admin, stocke en JSON
  // dans la table settings (cle unique 'homepage_content').
  const homepageRow = await pool.query("SELECT value FROM settings WHERE key = 'homepage_content'");
  if (homepageRow.rowCount === 0) {
    await pool.query("INSERT INTO settings (key, value) VALUES ('homepage_content', $1)", [
      JSON.stringify(DEFAULT_HOMEPAGE),
    ]);
  }

  // Parametres d'affichage public (votes / classement) : visibles par defaut.
  const displayRow = await pool.query("SELECT value FROM settings WHERE key = 'public_display'");
  if (displayRow.rowCount === 0) {
    await pool.query("INSERT INTO settings (key, value) VALUES ('public_display', $1)", [
      JSON.stringify({ show_votes: true, show_ranking: true }),
    ]);
  }

  await ensureAdminUser();
}

// Contenu par defaut de l'accueil (correspond au design d'origine du site).
// Sert de base au premier demarrage et de filet si des champs manquent.
const DEFAULT_HOMEPAGE = {
  hero_edition: "Édition 2027",
  hero_title: "MISS & MISTER FLASH ADJARRA",
  hero_slogan: "« Là où le talent devient couronne »",
  hero_description:
    "Un concours étudiant qui célèbre l'élégance, la confiance en soi et l'engagement de la jeunesse universitaire de la FLASH Adjarra. Candidat(e)s, votes en ligne, projets porteurs de sens : découvrez celles et ceux qui incarnent cette édition.",
  poster_path: "",
  organizer_text:
    "Organisé par le <b>Bureau Sectoriel de l'Union Nationale des Étudiants du Bénin (UNEB) – FLASH Adjarra</b>",
  objectives: [
    { title: "Valoriser les talents", text: "Mettre en lumière les talents et qualités des étudiant(e)s de la FLASH Adjarra." },
    { title: "Expression personnelle", text: "Offrir un espace où chaque candidat(e) peut exprimer sa personnalité avec fierté." },
    { title: "Créativité", text: "Encourager l'originalité et la créativité à travers les prestations et les projets." },
    { title: "Engagement des jeunes", text: "Fédérer les étudiant(e)s autour de projets porteurs de sens pour leur communauté." },
  ],
  buttons: [
    { label: "Découvrir les candidats", url: "/candidats.html" },
    { label: "Découvrir le concours", url: "#objectifs" },
  ],
};

async function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "changeme123";
  const existing = await pool.query("SELECT id FROM admin_users WHERE username = $1", [username]);
  if (existing.rowCount === 0) {
    const hash = bcrypt.hashSync(password, 10);
    await pool.query("INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)", [
      username,
      hash,
    ]);
    console.log(`[db] Compte admin cree : ${username}`);
  }
}

module.exports = { pool, initSchema, DEFAULT_HOMEPAGE };
