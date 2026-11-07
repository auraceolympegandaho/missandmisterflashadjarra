/* ============================================================
   URL propres du site (sans extension) + redirections 301.

   Hebergement : Render (Node/Express). Aucune configuration
   Apache/Nginx n'est utilisee : tout est gere ici.

   Fonctionnement :
   - Chaque fichier public/<nom>.html est servi sur /<nom>
     (public/index.html est servi sur /).
   - Les anciennes adresses sont redirigees en 301 (permanent),
     avec conservation de la query string (?id=, ?vote=, ?tx=...).
     Les ancres (#...) sont conservees par le navigateur.
         /index.html        -> /
         /index             -> /
         /candidats.html    -> /candidats
         /candidats/        -> /candidats
         /Candidats         -> /candidats
   - Une nouvelle page = un nouveau fichier .html dans public/ :
     sa route propre existe automatiquement, rien a declarer.

   Securite : l'adresse de redirection est toujours reconstruite
   a partir du nom d'une page connue (liste blanche). Aucune
   partie du chemin saisi par le visiteur n'est recopiee dans
   l'en-tete Location (pas de redirection ouverte).
   ============================================================ */
const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public");

// Noms qui ne doivent jamais etre pris pour une page (ils appartiennent a l'API ou aux ressources).
const RESERVED = new Set(["api", "health", "css", "js", "img"]);

function discoverPages(dir = PUBLIC_DIR) {
  const pages = new Map(); // nom en minuscules -> chemin absolu du fichier
  for (const file of fs.readdirSync(dir)) {
    if (!/^[a-z0-9-]+\.html$/i.test(file)) continue;
    const name = file.slice(0, -5).toLowerCase();
    if (RESERVED.has(name)) continue;
    pages.set(name, path.join(dir, file));
  }
  return pages;
}

// Adresse propre d'une page : "index" -> "/", sinon "/<nom>".
function canonicalPath(name) {
  return name === "index" ? "/" : "/" + name;
}

/**
 * Middleware Express : sert les pages sur leurs URL propres et redirige
 * (301) toute variante historique ou non canonique vers l'URL propre.
 * Ne touche ni a /api, ni aux ressources (/css, /js, /img), ni aux
 * methodes autres que GET/HEAD.
 */
function cleanUrls(dir = PUBLIC_DIR) {
  const pages = discoverPages(dir);

  return function cleanUrlsMiddleware(req, res, next) {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    // "/" = accueil
    let name;
    if (req.path === "/") {
      name = "index";
    } else {
      // /<nom>, /<nom>/, /<nom>.html (sans autre caractere : pas de sous-dossier)
      const m = /^\/([A-Za-z0-9-]+)(?:\.html)?\/?$/i.exec(req.path);
      if (!m) return next();
      name = m[1].toLowerCase();
    }

    const file = pages.get(name);
    if (!file) return next();

    const canonical = canonicalPath(name);
    if (req.path !== canonical) {
      // Variante (ancienne URL, casse, slash final...) -> 301 vers l'URL propre, query string conservee.
      const q = req.originalUrl.indexOf("?");
      const qs = q === -1 ? "" : req.originalUrl.slice(q);
      return res.redirect(301, canonical + qs);
    }

    return res.sendFile(file, (err) => {
      if (err && !res.headersSent) next(err);
    });
  };
}

/**
 * Convertit un lien interne ancien format ("/candidats.html?x=1#a") en URL propre
 * ("/candidats?x=1#a"). Sert pour les liens saisis en administration et deja
 * enregistres en base (ex. boutons de l'accueil). Toute autre valeur est renvoyee telle quelle.
 */
function cleanInternalUrl(url) {
  if (typeof url !== "string") return url;
  const m = /^\/([A-Za-z0-9-]+)\.html(?=$|[?#])(.*)$/i.exec(url.trim());
  if (!m) return url;
  const name = m[1].toLowerCase();
  if (RESERVED.has(name)) return url;
  return canonicalPath(name) + m[2];
}

module.exports = { cleanUrls, cleanInternalUrl, discoverPages, canonicalPath };
