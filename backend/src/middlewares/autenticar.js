const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const db = require('../db/database');

function autenticar(req, res, next) {
  const [esquema, token] = String(req.headers.authorization || '').split(' ');
  if (esquema !== 'Bearer' || !token) throw new AppError('Faça login para continuar.', 401);

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (erro) {
    const mensagem = erro.name === 'TokenExpiredError' ? 'Sua sessão expirou. Entre novamente.' : 'Sessão inválida. Entre novamente.';
    throw new AppError(mensagem, 401);
  }

  const usuario = db.prepare('SELECT id, nome, email FROM usuarios WHERE id = ?').get(Number(payload.sub));
  if (!usuario) throw new AppError('Usuário não encontrado. Entre novamente.', 401);

  req.usuario = usuario;
  next();
}

module.exports = autenticar;
