const express = require('express');
const authRouter = require('./routes/auth');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/auth', authRouter);

app.get('/', (req, res) => {
  res.send('<h1>Welcome to localhost</h1><p>Open <a href="http://localhost:3000">http://localhost:3000</a></p>');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
