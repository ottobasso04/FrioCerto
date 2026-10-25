const db = require('../db/database');
const AppError = require('../utils/AppError');
const { texto, somenteDigitos, emailValido, cpfValido, cnpjValido } = require('../utils/validators');

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

function validar(dados = {}) {
  const erros = {};
  const cliente = {
    nome: texto(dados.nome),
    documento: somenteDigitos(dados.documento) || null,
    telefone: somenteDigitos(dados.telefone),
    email: texto(dados.email).toLowerCase() || null,
    cep: somenteDigitos(dados.cep),
    logradouro: texto(dados.logradouro),
    numero: texto(String(dados.numero ?? '')),
    bairro: texto(dados.bairro),
    cidade: texto(dados.cidade),
    uf: texto(dados.uf).toUpperCase(),
  };

  if (cliente.nome.length < 3) erros.nome = 'Informe o nome com pelo menos 3 letras.';
  if (cliente.documento) {
    if (cliente.documento.length === 11 && !cpfValido(cliente.documento)) erros.documento = 'CPF inválido.';
    else if (cliente.documento.length === 14 && !cnpjValido(cliente.documento)) erros.documento = 'CNPJ inválido.';
    else if (![11, 14].includes(cliente.documento.length)) erros.documento = 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).';
  }
  if (![10, 11].includes(cliente.telefone.length)) erros.telefone = 'Telefone deve ter DDD + número (10 ou 11 dígitos).';
  if (cliente.email && !emailValido(cliente.email)) erros.email = 'E-mail inválido.';
  if (cliente.cep.length !== 8) erros.cep = 'CEP deve ter 8 dígitos.';
  if (!cliente.logradouro) erros.logradouro = 'Informe o logradouro.';
  if (!cliente.numero) erros.numero = 'Informe o número.';
  if (!cliente.bairro) erros.bairro = 'Informe o bairro.';
  if (!cliente.cidade) erros.cidade = 'Informe a cidade.';
  if (!UFS.includes(cliente.uf)) erros.uf = 'UF inválida.';

  if (Object.keys(erros).length) throw new AppError('Confira os campos destacados.', 422, erros);
  return cliente;
}

function garantirDocumentoUnico(documento, idAtual = null) {
  if (!documento) return;
  const outro = db.prepare('SELECT id FROM clientes WHERE documento = ? AND id <> ?').get(documento, idAtual ?? 0);
  if (outro) throw new AppError('Já existe um cliente com este CPF/CNPJ.', 409, { documento: 'Documento já cadastrado.' });
}

function listar({ busca } = {}) {
  const termo = `%${texto(busca)}%`;
  return db
    .prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM chamados ch WHERE ch.cliente_id = c.id AND ch.status IN ('aberto', 'em_andamento')) AS chamados_ativos
      FROM clientes c
      WHERE c.nome LIKE ? OR c.cidade LIKE ? OR IFNULL(c.documento, '') LIKE ? OR c.telefone LIKE ?
      ORDER BY c.nome COLLATE NOCASE
    `)
    .all(termo, termo, termo, termo);
}

function obter(id) {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(Number(id));
  if (!cliente) throw new AppError('Cliente não encontrado.', 404);
  const chamados = db
    .prepare('SELECT id, tipo, status, data_agendada, valor FROM chamados WHERE cliente_id = ? ORDER BY data_agendada DESC')
    .all(cliente.id);
  return { ...cliente, chamados };
}

function criar(dados) {
  const c = validar(dados);
  garantirDocumentoUnico(c.documento);
  const { lastInsertRowid } = db
    .prepare(`
      INSERT INTO clientes (nome, documento, telefone, email, cep, logradouro, numero, bairro, cidade, uf)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(c.nome, c.documento, c.telefone, c.email, c.cep, c.logradouro, c.numero, c.bairro, c.cidade, c.uf);
  return obter(lastInsertRowid);
}

function atualizar(id, dados) {
  obter(id);
  const c = validar(dados);
  garantirDocumentoUnico(c.documento, Number(id));
  db.prepare(`
    UPDATE clientes SET nome = ?, documento = ?, telefone = ?, email = ?, cep = ?, logradouro = ?, numero = ?,
      bairro = ?, cidade = ?, uf = ?, atualizado_em = datetime('now')
    WHERE id = ?
  `).run(c.nome, c.documento, c.telefone, c.email, c.cep, c.logradouro, c.numero, c.bairro, c.cidade, c.uf, Number(id));
  return obter(id);
}

function excluir(id) {
  obter(id);
  const { ativos } = db
    .prepare("SELECT COUNT(*) AS ativos FROM chamados WHERE cliente_id = ? AND status IN ('aberto', 'em_andamento')")
    .get(Number(id));
  if (ativos > 0) {
    throw new AppError(`Este cliente tem ${ativos} chamado(s) em aberto. Conclua ou cancele antes de excluir.`, 409);
  }
  db.prepare('DELETE FROM clientes WHERE id = ?').run(Number(id));
}

module.exports = { listar, obter, criar, atualizar, excluir };
