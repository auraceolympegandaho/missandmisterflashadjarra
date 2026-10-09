const crypto = require("crypto");

// Secret de signature : JWT_SECRET (variable d'environnement). A defaut, un
// secret aleatoire propre au processus (les jetons expirent au redemarrage).
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

function hmac(value) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
}

// --- Jeton de formulaire (anti-robots / anti-soumission croisee) ---
// Delivre au chargement du formulaire. Valide entre MIN_AGE_MS et MAX_AGE_MS.
const MIN_AGE_MS = 8 * 1000;
const MAX_AGE_MS = 3 * 60 * 60 * 1000;

function issueFormToken() {
  const ts = Date.now().toString(36);
  const nonce = crypto.randomBytes(6).toString("base64url");
  const body = `${ts}.${nonce}`;
  return `${body}.${hmac(body)}`;
}

function verifyFormToken(token) {
  if (typeof token !== "string" || token.length > 120) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const body = `${parts[0]}.${parts[1]}`;
  const expected = hmac(body);
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const age = Date.now() - parseInt(parts[0], 36);
  return age >= MIN_AGE_MS && age <= MAX_AGE_MS;
}

function hashIp(ip) {
  return crypto.createHmac("sha256", SECRET).update(String(ip || "")).digest("hex").slice(0, 32);
}

// --- Limiteur de debit en memoire (sans dependance) ---
function createLimiter({ windowMs, max, message }) {
  const hits = new Map();
  setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [k, arr] of hits) {
      const kept = arr.filter((t) => t > cutoff);
      if (kept.length) hits.set(k, kept);
      else hits.delete(k);
    }
  }, Math.min(windowMs, 60 * 1000)).unref();

  return function limiter(req, res, next) {
    const key = req.ip || "unknown";
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => t > now - windowMs);
    if (arr.length >= max) {
      res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: message || "Trop de requêtes. Réessayez plus tard." });
    }
    arr.push(now);
    hits.set(key, arr);
    next();
  };
}

// Verifie le VRAI type du fichier a partir de ses premiers octets (jamais le
// nom ni le type MIME declares par le navigateur).
function detectImageType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" };
  return null;
}

module.exports = { issueFormToken, verifyFormToken, hashIp, createLimiter, detectImageType };
