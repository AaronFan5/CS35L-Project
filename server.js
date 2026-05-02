const express = require('express');
const authRouter = require('./routes/auth');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/auth', authRouter);

app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to (figure out app name later)</h1>
    <p>Please log-in or sign up</p>
    <a href = "/auth/login"><button>Login</button></a>
    <a href = "/auth/signup"><button>Sign up</button></a>
    `);
});

app.get('/dashboard', (req, res) => {
  res.send(`
    <h1>You have logged in.</h1>
    <p>THIS WILL BE WHERE THE MAIN STUFF ON THE WEBSITE GOES!</p>
    <a href = "/"><button>Log Out</button></a>
    `)
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
