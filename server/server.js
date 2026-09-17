require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { pool, ready } = require("./db");

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
  const row = await pool.query("SELECT value FROM settings WHERE key = 'price_per_vote'");
  res.json({ price_per_vote: Number(row.rows[0].value) });
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;

ready.then(() => {
  app.listen(PORT, () => {
    console.log(`Miss & Mister Flash Adjarra - serveur demarre sur le port ${PORT}`);
  });
});
