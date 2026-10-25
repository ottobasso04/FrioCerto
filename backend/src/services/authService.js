const jwt = require('jsonwebtoken');
const db = require('../db/database');
const config = require('../config');
const AppError = require('../utils/AppError');
const { texto, emailValido } = require('../utils/validators');
const senhaUtil = require('../utils/senha');

function gerarToken(usuario) {
  return jwt.sign({ sub: String(usuario.id), nome: usuario.nome }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function publico(usuario) {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email };
}

function cadastrar({ nome, email, senha } = {}) {
  const erros = {};
  const nomeLimpo = texto(nome);
  const emailLimpo = texto(email).toLowerCase();
  if (nomeLimpo.length < 3) erros.nome = 'Informe o nome com pelo menos 3 letras.';
  if (!emailValido(emailLimpo)) erros.email = 'Informe um e-mail válido.';
  if (typeof senha !== 'string' || senha.length < 6) erros.senha = 'A senha deve ter pelo menos 6 caracteres.';
  if (Object.keys(erros).length) throw new AppError('Confira os campos destacados.', 422, erros);

  const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailLimpo);
  if (existente) throw new AppError('Já existe uma conta com este e-mail.', 409, { email: 'E-mail já cadastrado.' });

  const { lastInsertRowid } = db
    .prepare('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)')
    .run(nomeLimpo, emailLimpo, senhaUtil.gerarHash(senha));

  const usuario = db.prepare('SELECT id, nome, email FROM usuarios WHERE id = ?').get(lastInsertRowid);
  return { token: gerarToken(usuario), usuario: publico(usuario) };
}

function entrar({ email, senha } = {}) {
  const emailLimpo = texto(email).toLowerCase();
  if (!emailLimpo || typeof senha !== 'string' || !senha) {
    throw new AppError('Informe e-mail e senha.', 422, {
      ...(!emailLimpo && { email: 'Informe o e-mail.' }),
      ...(!senha && { senha: 'Informe a senha.' }),
    });
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(emailLimpo);
  if (!usuario || !senhaUtil.conferir(senha, usuario.senha_hash)) {
    throw new AppError('E-mail ou senha inválidos.', 401);
  }
  return { token: gerarToken(usuario), usuario: publico(usuario) };
}

function buscarPorId(id) {
  const usuario = db.prepare('SELECT id, nome, email FROM usuarios WHERE id = ?').get(id);
  if (!usuario) throw new AppError('Usuário não encontrado.', 404);
  return publico(usuario);
}

module.exports = { cadastrar, entrar, buscarPorId };
