const express = require('express');
const cors = require('cors');
const rotas = require('./routes');
const { rotaNaoEncontrada, tratarErros } = require('./middlewares/tratarErros');

const app = express();

app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - inicio}ms)`));
  next();
});

app.use('/api', rotas);
app.use(rotaNaoEncontrada);
app.use(tratarErros);

module.exports = app;
