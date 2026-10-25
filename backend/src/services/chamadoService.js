const db = require('../db/database');
const config = require('../config');
const AppError = require('../utils/AppError');
const { texto, dataIsoValida, hojeIso, diaDaSemana } = require('../utils/validators');
const brasilApi = require('./externos/brasilApi');
const openMeteo = require('./externos/openMeteo');

const TIPOS = ['instalacao', 'manutencao', 'limpeza', 'reparo'];
const PRIORIDADES = ['baixa', 'media', 'alta'];
const STATUS = ['aberto', 'em_andamento', 'concluido', 'cancelado'];
const TRANSICOES = {
  aberto: ['em_andamento', 'cancelado'],
  em_andamento: ['concluido', 'cancelado'],
  concluido: [],
  cancelado: [],
};
const ROTULO_STATUS = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado' };
const LIMITE_CHUVA_INSTALACAO = 70;

const SELECT_BASE = `
  SELECT ch.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone, c.cidade AS cliente_cidade, c.uf AS cliente_uf,
    c.logradouro AS cliente_logradouro, c.numero AS cliente_numero, c.bairro AS cliente_bairro
  FROM chamados ch
  JOIN clientes c ON c.id = ch.cliente_id
`;

function validarCampos(dados = {}) {
  const erros = {};
  const chamado = {
    cliente_id: Number(dados.cliente_id),
    tipo: texto(dados.tipo),
    descricao: texto(dados.descricao),
    prioridade: texto(dados.prioridade) || 'media',
    data_agendada: texto(dados.data_agendada),
    valor: dados.valor === undefined || dados.valor === null || dados.valor === '' ? 0 : Number(String(dados.valor).replace(',', '.')),
  };

  if (!Number.isInteger(chamado.cliente_id) || chamado.cliente_id <= 0) erros.cliente_id = 'Selecione o cliente.';
  if (!TIPOS.includes(chamado.tipo)) erros.tipo = 'Tipo inválido. Use instalação, manutenção, limpeza ou reparo.';
  if (chamado.descricao.length < 5) erros.descricao = 'Descreva o serviço (mínimo 5 caracteres).';
  if (!PRIORIDADES.includes(chamado.prioridade)) erros.prioridade = 'Prioridade inválida.';
  if (!dataIsoValida(chamado.data_agendada)) erros.data_agendada = 'Data inválida.';
  if (!Number.isFinite(chamado.valor) || chamado.valor < 0) erros.valor = 'O valor deve ser um número maior ou igual a zero.';

  if (Object.keys(erros).length) throw new AppError('Confira os campos destacados.', 422, erros);

  const cliente = db.prepare('SELECT id, cidade, uf FROM clientes WHERE id = ?').get(chamado.cliente_id);
  if (!cliente) throw new AppError('Cliente não encontrado.', 404, { cliente_id: 'Cliente não encontrado.' });

  return { chamado, cliente };
}

async function aplicarRegrasDeAgenda(chamado, cliente, { idAtual = null, dataMudou = true } = {}) {
  const avisos = [];
  const data = chamado.data_agendada;

  if (dataMudou) {
    if (data < hojeIso()) {
      throw new AppError('Não é possível agendar em uma data que já passou.', 422, { data_agendada: 'Data no passado.' });
    }
    if (diaDaSemana(data) === 0) {
      throw new AppError('A equipe não atende aos domingos. Escolha outra data.', 422, { data_agendada: 'Domingo.' });
    }

    try {
      const feriado = await brasilApi.feriadoNaData(data);
      if (feriado) {
        throw new AppError(`${data.split('-').reverse().join('/')} é feriado nacional (${feriado.nome}). Escolha outra data.`, 422, {
          data_agendada: `Feriado: ${feriado.nome}`,
        });
      }
    } catch (erro) {
      if (erro.status === 422) throw erro;
      avisos.push('Não foi possível verificar feriados agora (BrasilAPI indisponível). Confira a data manualmente.');
    }

    const { total } = db
      .prepare("SELECT COUNT(*) AS total FROM chamados WHERE data_agendada = ? AND status IN ('aberto', 'em_andamento') AND id <> ?")
      .get(data, idAtual ?? 0);
    if (total >= config.capacidadeDiaria) {
      throw new AppError(`A agenda de ${data.split('-').reverse().join('/')} já está cheia (${config.capacidadeDiaria} atendimentos). Escolha outra data.`, 422, {
        data_agendada: 'Agenda cheia.',
      });
    }
  }

  if (chamado.tipo === 'instalacao') {
    try {
      const previsao = await openMeteo.previsaoNaData(cliente.cidade, cliente.uf, data);
      if (previsao && previsao.chanceChuva !== null && previsao.chanceChuva >= LIMITE_CHUVA_INSTALACAO) {
        avisos.push(`Previsão de ${previsao.chanceChuva}% de chuva em ${cliente.cidade} nesse dia. Instalação de condensadora externa pode precisar ser remarcada.`);
      }
    } catch {
      avisos.push('Previsão do tempo indisponível no momento.');
    }
  }

  return avisos;
}

function listar({ status, busca, data_inicio: dataInicio, data_fim: dataFim, cliente_id: clienteId } = {}) {
  const filtros = [];
  const params = [];
  if (status) {
    const lista = String(status).split(',').filter((s) => STATUS.includes(s));
    if (lista.length) {
      filtros.push(`ch.status IN (${lista.map(() => '?').join(',')})`);
      params.push(...lista);
    }
  }
  if (texto(busca)) {
    filtros.push('(c.nome LIKE ? OR ch.descricao LIKE ? OR CAST(ch.id AS TEXT) = ?)');
    params.push(`%${texto(busca)}%`, `%${texto(busca)}%`, texto(busca));
  }
  if (dataIsoValida(dataInicio)) {
    filtros.push('ch.data_agendada >= ?');
    params.push(dataInicio);
  }
  if (dataIsoValida(dataFim)) {
    filtros.push('ch.data_agendada <= ?');
    params.push(dataFim);
  }
  if (clienteId) {
    filtros.push('ch.cliente_id = ?');
    params.push(Number(clienteId));
  }
  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
  return db.prepare(`${SELECT_BASE} ${where} ORDER BY ch.data_agendada ASC, ch.id ASC`).all(...params);
}

function obterRegistro(id) {
  const chamado = db.prepare(`${SELECT_BASE} WHERE ch.id = ?`).get(Number(id));
  if (!chamado) throw new AppError('Chamado não encontrado.', 404);
  return chamado;
}

async function obter(id) {
  const chamado = obterRegistro(id);
  let previsao = null;
  try {
    previsao = await openMeteo.previsaoNaData(chamado.cliente_cidade, chamado.cliente_uf, chamado.data_agendada);
  } catch {
    previsao = null;
  }
  return { ...chamado, previsao, proximos_status: TRANSICOES[chamado.status] };
}

async function criar(dados, usuarioId) {
  const { chamado, cliente } = validarCampos(dados);
  const avisos = await aplicarRegrasDeAgenda(chamado, cliente);
  const { lastInsertRowid } = db
    .prepare(`
      INSERT INTO chamados (cliente_id, tipo, descricao, prioridade, data_agendada, valor, criado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(chamado.cliente_id, chamado.tipo, chamado.descricao, chamado.prioridade, chamado.data_agendada, chamado.valor, usuarioId ?? null);
  return { chamado: obterRegistro(lastInsertRowid), avisos };
}

async function atualizar(id, dados) {
  const atual = obterRegistro(id);
  if (['concluido', 'cancelado'].includes(atual.status)) {
    throw new AppError(`Chamado ${ROTULO_STATUS[atual.status].toLowerCase()} não pode ser editado.`, 409);
  }
  const { chamado, cliente } = validarCampos(dados);
  const avisos = await aplicarRegrasDeAgenda(chamado, cliente, {
    idAtual: atual.id,
    dataMudou: chamado.data_agendada !== atual.data_agendada,
  });
  db.prepare(`
    UPDATE chamados SET cliente_id = ?, tipo = ?, descricao = ?, prioridade = ?, data_agendada = ?, valor = ?,
      atualizado_em = datetime('now')
    WHERE id = ?
  `).run(chamado.cliente_id, chamado.tipo, chamado.descricao, chamado.prioridade, chamado.data_agendada, chamado.valor, atual.id);
  return { chamado: obterRegistro(atual.id), avisos };
}

function alterarStatus(id, novoStatus) {
  const atual = obterRegistro(id);
  const status = texto(novoStatus);
  if (!STATUS.includes(status)) throw new AppError('Status inválido.', 422, { status: 'Status inválido.' });
  if (!TRANSICOES[atual.status].includes(status)) {
    const permitidos = TRANSICOES[atual.status].map((s) => ROTULO_STATUS[s]).join(' ou ');
    throw new AppError(
      permitidos
        ? `Um chamado "${ROTULO_STATUS[atual.status]}" só pode ir para ${permitidos}.`
        : `Chamado ${ROTULO_STATUS[atual.status].toLowerCase()} não pode mudar de status.`,
      409,
    );
  }
  db.prepare(`
    UPDATE chamados SET status = ?, concluido_em = CASE WHEN ? = 'concluido' THEN datetime('now', 'localtime') ELSE concluido_em END,
      atualizado_em = datetime('now')
    WHERE id = ?
  `).run(status, status, atual.id);
  return obterRegistro(atual.id);
}

function excluir(id) {
  const atual = obterRegistro(id);
  if (atual.status === 'concluido') {
    throw new AppError('Chamados concluídos fazem parte do faturamento e não podem ser excluídos.', 409);
  }
  db.prepare('DELETE FROM chamados WHERE id = ?').run(atual.id);
}

module.exports = { listar, obter, criar, atualizar, alterarStatus, excluir, TIPOS, PRIORIDADES, STATUS };
