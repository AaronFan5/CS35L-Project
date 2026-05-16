const jwt = require('jsonwebtoken');
const SECRET_KEY = 'super-secret-development-key';

function requireAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    // verify token and extract user payload
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // attach user info to request object
    next(); // pass control to actual route handler
  } catch (error) {
    res.status(403).json({ message: 'Forbidden: Invalid token' });
  }
}

module.exports = { requireAuth, SECRET_KEY };