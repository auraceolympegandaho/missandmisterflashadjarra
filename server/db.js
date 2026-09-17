const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "vote.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('Miss','Mister')),
  bio TEXT DEFAULT '',
  photo_path TEXT DEFAULT '',
  candidacy_number TEXT DEFAULT '',
  project_desc TEXT DEFAULT '',
  votes_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL,
  votes_bought INTEGER NOT NULL,
  amount_fcfa INTEGER NOT NULL,
  voter_phone TEXT DEFAULT '',
  fedapay_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// --- Migration douce pour les bases deja existantes (ajout des nouvelles colonnes) ---
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = cols.some((c) => c.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[db] Colonne ajoutee : ${table}.${column}`);
  }
}
ensureColumn("candidates", "candidacy_number", "TEXT DEFAULT ''");
ensureColumn("candidates", "project_desc", "TEXT DEFAULT ''");

const priceRow = db.prepare("SELECT value FROM settings WHERE key = 'price_per_vote'").get();
if (!priceRow) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('price_per_vote', ?)").run(
    process.env.PRICE_PER_VOTE || "100"
  );
}

function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "changeme123";
  const existing = db.prepare("SELECT * FROM admin_users WHERE username = ?").get(username);
  const hash = bcrypt.hashSync(password, 10);
  if (!existing) {
    db.prepare("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)").run(username, hash);
    console.log(`[db] Compte admin cree : ${username}`);
  }
}
ensureAdminUser();

module.exports = db;