const db = require('../db/database');
const AppError = require('../utils/AppError');

const TAMANHO_TITULO = 60;

function gerarTitulo(primeiraMensagem) {
  const limpo = primeiraMensagem.replace(/\s+/g, ' ').trim();
  return limpo.length > TAMANHO_TITULO ? `${limpo.slice(0, TAMANHO_TITULO - 1)}…` : limpo;
}

function obterDoUsuario(conversaId, usuarioId) {
  const conversa = db.prepare('SELECT * FROM conversas WHERE id = ? AND usuario_id = ?').get(Number(conversaId), usuarioId);
  if (!conversa) throw new AppError('Conversa não encontrada.', 404);
  return conversa;
}

function listar(usuarioId) {
  return db
    .prepare(`
      SELECT c.id, c.titulo, c.criado_em, c.atualizado_em,
        (SELECT COUNT(*) FROM mensagens m WHERE m.conversa_id = c.id) AS total_mensagens
      FROM conversas c
      WHERE c.usuario_id = ?
      ORDER BY c.atualizado_em DESC, c.id DESC
    `)
    .all(usuarioId);
}

function mensagensDe(conversaId) {
  return db
    .prepare('SELECT id, papel, texto, funcoes, modelo, criado_em FROM mensagens WHERE conversa_id = ? ORDER BY id')
    .all(conversaId)
    .map((m) => ({ ...m, funcoes: m.funcoes ? JSON.parse(m.funcoes) : [] }));
}

function obter(conversaId, usuarioId) {
  const conversa = obterDoUsuario(conversaId, usuarioId);
  return { ...conversa, mensagens: mensagensDe(conversa.id) };
}

function historicoParaModelo(conversaId, limite) {
  return mensagensDe(conversaId)
    .slice(-limite)
    .map((m) => ({ papel: m.papel, texto: m.texto }));
}

function registrarTroca({ conversaId, usuarioId, pergunta, resposta, funcoes, modelo }) {
  db.exec('BEGIN');
  try {
    let id = conversaId;
    if (!id) {
      id = db.prepare('INSERT INTO conversas (usuario_id, titulo) VALUES (?, ?)').run(usuarioId, gerarTitulo(pergunta)).lastInsertRowid;
    }
    const inserir = db.prepare('INSERT INTO mensagens (conversa_id, papel, texto, funcoes, modelo) VALUES (?, ?, ?, ?, ?)');
    inserir.run(id, 'usuario', pergunta, null, null);
    inserir.run(id, 'assistente', resposta, JSON.stringify(funcoes || []), modelo || null);
    db.prepare("UPDATE conversas SET atualizado_em = datetime('now') WHERE id = ?").run(id);
    db.exec('COMMIT');
    return Number(id);
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}

function excluir(conversaId, usuarioId) {
  const conversa = obterDoUsuario(conversaId, usuarioId);
  db.prepare('DELETE FROM conversas WHERE id = ?').run(conversa.id);
}

module.exports = { listar, obter, obterDoUsuario, historicoParaModelo, registrarTroca, excluir };
