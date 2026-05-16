const jwt = require('jsonwebtoken');
const { extractAuthToken } = require('../config/auth');
const { env } = require('../config/env');

function requireAuth(req, res, next) {
  const token = extractAuthToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = { id: decoded.id };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = {
  requireAuth,
};
