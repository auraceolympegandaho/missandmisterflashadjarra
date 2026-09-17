const jwt = require("jsonwebtoken");

// Protege les routes admin : exige un header "Authorization: Bearer <token>"
// contenant un JWT valide, signe au login avec JWT_SECRET.
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Non authentifie." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expiree, reconnectez-vous." });
  }
}

module.exports = { requireAdmin };
