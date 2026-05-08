const express = require('express');
const authRouter = require('./routes/auth');
const pollsRouter = require('./routes/polls');
const dashboardRouter = require('./routes/dashboard');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.use('/auth', authRouter);
app.use('/polls', pollsRouter);
app.use('/dashboard', dashboardRouter);

app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to (figure out app name later)</h1>
    <p>Please log-in or sign up</p>
    <a href = "/auth/login"><button>Login</button></a>
    <a href = "/auth/signup"><button>Sign up</button></a>
    `);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
