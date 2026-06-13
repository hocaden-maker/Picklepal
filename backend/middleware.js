const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'picklepals_secret_2024';

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return next();
  try { req.user = jwt.verify(auth.slice(7), JWT_SECRET); } catch {}
  next();
}

module.exports = { authenticate, optionalAuth, JWT_SECRET };
