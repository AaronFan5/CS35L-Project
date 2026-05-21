const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { requireAuth, SECRET_KEY } = require('../middleware/authMiddleware');
const supabase = require('../services/supabaseClient');
const router = express.Router();

async function findUser(username, email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`username.eq.${username},email.eq.${email}`)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function resultResponse(type, data) {
  return {
    type,
    name: data.name || '',
    email: data.email || '',
    username: data.username || '',
    password: data.password ? '••••••••' : ''
  };
}

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ message: error.message });
  }
  
  if (!user) {
    return res.status(400).json({ message: 'Invalid username or password' });
  }

  const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '1h' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: false, 
    maxAge: 3600000
  });

  res.json(resultResponse('login', user));
});

router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'signup.html'));
});

router.post('/signup', async (req, res) => {
  const { name, email, username, password } = req.body;
  try {
    if (await findUser(username, email)) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
  
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({ name, email, username, password })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

// automatically log user in after signing up
  const token = jwt.sign({ username: newUser.username }, SECRET_KEY, { expiresIn: '1h' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: false, 
    maxAge: 3600000
  });

  res.json(resultResponse('signup', newUser));
});

// route to securely check who is logged in
router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});

// route to log out (clears the cookie)
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
