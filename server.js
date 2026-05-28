const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const authRouter = require('./routes/auth');
const pollsRouter = require('./routes/polls');
const dashboardRouter = require('./routes/dashboard');
const usersRouter = require('./routes/users');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));
app.use('/auth', authRouter);
app.use('/polls', pollsRouter);
app.use('/users', usersRouter);
app.use('/dashboard', dashboardRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
