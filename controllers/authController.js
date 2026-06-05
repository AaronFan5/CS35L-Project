const jwt = require('jsonwebtoken');
const authService = require('../services/authService');
const { SECRET_KEY } = require('../middleware/authMiddleware');

const TOKEN_TTL_SECONDS = 3600;

function setAuthCookie(res, username) {
  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: TOKEN_TTL_SECONDS });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_TTL_SECONDS * 1000
  });
}

// Shape the user record into a safe response (never expose the password hash).
function publicUser(type, user) {
  return {
    type,
    name: user.name || '',
    email: user.email || '',
    username: user.username || '',
    password: user.password ? '••••••••' : ''
  };
}

async function login(req, res) {
  const { username, password } = req.body;

  try {
    const user = await authService.findUserByUsername(username);
    if (!user) {
      return res.status(400).json({ message: 'No account was found with that username' });
    }

    const isPasswordValid = await authService.verifyPassword(user, password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    setAuthCookie(res, user.username);
    res.json(publicUser('login', user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function signup(req, res) {
  const { name, email, username, password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({
      message: 'Incorrect password. Password must be at least 8 characters long'
    });
  }

  try {
    if (await authService.findUserByUsernameOrEmail(username, email)) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const newUser = await authService.createUser({ name, email, username, password });
    setAuthCookie(res, newUser.username);
    res.json(publicUser('signup', newUser));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

function me(req, res) {
  res.json({ username: req.user.username });
}

function logout(req, res) {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
}

module.exports = { login, signup, me, logout };
