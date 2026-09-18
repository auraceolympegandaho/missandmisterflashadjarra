require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { pool, initSchema } = require("./db");

const candidatesRoutes = require("./routes/candidates");
const votesRoutes = require("./routes/votes");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(cors());

// IMPORTANT: la route webhook a besoin du corps brut (raw), donc on ne met pas
// express.json() global avant elle. On l'applique route par route a la place.
app.use((req, res, next) => {
  if (req.path === "/api/votes/webhook") return next();
  express.json({ limit: "2mb" })(req, res, next);
});

// Fichiers statiques (site public + photos uploadees)
app.use(express.static(path.join(__dirname, "..", "public")));

// API
app.use("/api/candidates", candidatesRoutes);
app.use("/api/votes", votesRoutes);
app.use("/api/admin", adminRoutes);

// Prix courant du vote (public, utilise par la page de vote)
app.get("/api/settings/price", async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'price_per_vote'");
    res.json({ price_per_vote: Number(result.rows[0].value) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Compte a rebours affiche sur l'accueil (public, lecture seule ; reglable depuis l'admin)
app.get("/api/settings/countdown", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT key, value FROM settings WHERE key IN ('countdown_target', 'countdown_label')"
    );
    const map = Object.fromEntries(result.rows.map((r) => [r.key, r.value]));
    res.json({
      countdown_target: map.countdown_target || "",
      countdown_label: map.countdown_label || "Clôture des votes",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Actualites publiees (public, lecture seule ; gerees depuis l'admin)
app.get("/api/announcements", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, tag, content, created_at FROM announcements WHERE is_active = 1 ORDER BY created_at DESC LIMIT 12"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Partenaires actifs (public, lecture seule ; geres depuis l'admin)
app.get("/api/partners", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, logo_path, website_url FROM partners WHERE is_active = 1 ORDER BY display_order ASC, created_at ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;

initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Miss & Mister Flash Adjarra - serveur demarre sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Impossible d'initialiser la base de donnees :", err);
    process.exit(1);
  });
