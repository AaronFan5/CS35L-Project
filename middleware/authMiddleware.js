const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  throw new Error('Missing JWT_SECRET in .env');
}

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
