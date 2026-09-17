require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

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
    const result = await db.pool.query("SELECT value FROM settings WHERE key = 'price_per_vote'");
    res.json({ price_per_vote: Number(result.rows[0].value) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de lire le prix du vote." });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;

// On attend que la base Postgres soit initialisee (tables creees, compte admin pret)
// avant d'accepter des requetes.
db.ready
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Miss & Mister Flash Adjarra - serveur demarre sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Impossible de demarrer le serveur (base de donnees indisponible):", err);
    process.exit(1);
  });
