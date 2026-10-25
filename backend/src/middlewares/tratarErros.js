const AppError = require('../utils/AppError');

function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: `Rota ${req.method} ${req.originalUrl || req.url} não encontrada.` });
}

function tratarErros(erro, req, res, next) {
  if (erro instanceof AppError) {
    return res.status(erro.status).json({ erro: erro.message, ...(erro.detalhes && { campos: erro.detalhes }) });
  }
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'Corpo da requisição não é um JSON válido.' });
  }
  console.error(erro);
  return res.status(500).json({ erro: 'Erro interno no servidor. Tente novamente.' });
}

module.exports = { rotaNaoEncontrada, tratarErros };
