const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const usersFile = path.join(__dirname, '..', 'data', 'users.json');

function loadUsers() {
  try {
    const text = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(text || '[]');
  } catch (err) {
    return [];
  }
}

function saveUsers(users) {
  fs.mkdirSync(path.dirname(usersFile), { recursive: true });
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
}

function findUser(username, email) {
  const users = loadUsers();
  return users.find((user) => user.username === username || user.email === email);
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

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find((userData) => userData.username === username && userData.password === password);
  if (!user) {
    return res.status(400).json({ message: 'Invalid username or password' });
  }
  res.json(resultResponse('login', user));
});

router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'signup.html'));
});

router.post('/signup', (req, res) => {
  const { name, email, username, password } = req.body;
  if (findUser(username, email)) {
    return res.status(400).json({ message: 'Username or email already exists' });
  }
  const users = loadUsers();
  users.push({ name, email, username, password });
  saveUsers(users);
  res.json(resultResponse('signup', req.body));
});

module.exports = router;
