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

function renderReactPage(type) {
  const title = type === 'signup' ? 'Sign Up' : 'Login';
  const headline = type === 'signup' ? 'Create your account' : 'Sign in to your account';
  const action = type;
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          label { display: block; margin-top: 12px; }
          input, button { font-size: 16px; margin-top: 6px; }
          button { padding: 10px 14px; }
          a { color: blue; }
        </style>
        <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      </head>
      <body>
        <div>
          <div id="root"></div>
        </div>
        <script type="text/babel">
          const pageType = '${type}';
          const pageTitle = '${title}';
          const pageHeadline = '${headline}';
          const { useState } = React;

          function AuthForm() {
            const [name, setName] = useState('');
            const [email, setEmail] = useState('');
            const [username, setUsername] = useState('');
            const [password, setPassword] = useState('');
            const [result, setResult] = useState(null);
            const [error, setError] = useState('');

            const handleSubmit = async (event) => {
              event.preventDefault();
              setError('');
              setResult(null);

              try {
                const response = await fetch('/auth/${action}', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name, email, username, password })
                });
                const data = await response.json();
                if (!response.ok) {
                  throw new Error(data.message || 'Submit failed');
                }
                setResult(data);
              } catch (err) {
                setError(err.message);
              }
            };

            return (
              <div>
                <h1>{pageTitle}</h1>
                <p>{pageHeadline}</p>
                <form onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="name">Name</label>
                    <input id="name" value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="Name" required />
                  </div>
                  <div>
                    <label htmlFor="email">Email</label>
                    <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required />
                  </div>
                  <div>
                    <label htmlFor="username">Username</label>
                    <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} type="text" placeholder="Username" required />
                  </div>
                  <div>
                    <label htmlFor="password">Password</label>
                    <input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required />
                  </div>
                  <button type="submit">${title}</button>
                </form>
                <div>
                  {pageType === 'signup' ? <span>Already have an account? <a href="/auth/login">Login</a></span> : <span>Need an account? <a href="/auth/signup">Sign up</a></span>}
                </div>
                {error && <div>{error}</div>}
                {result && (
                  <div>
                    <strong>{result.type === 'signup' ? 'Signup Received' : 'Login Received'}</strong>
                    <p>Name: {result.name}</p>
                    <p>Email: {result.email}</p>
                    <p>Username: {result.username}</p>
                    <p>Password: {result.password}</p>
                  </div>
                )}
              </div>
            );
          }

          ReactDOM.createRoot(document.getElementById('root')).render(<AuthForm />);
        </script>
      </body>
    </html>
  `;
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
  res.send(renderReactPage('login'));
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
  res.send(renderReactPage('signup'));
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
