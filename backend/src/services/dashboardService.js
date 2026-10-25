const db = require('../db/database');
const config = require('../config');
const { hojeIso, somarDias } = require('../utils/validators');
const brasilApi = require('./externos/brasilApi');
const openMeteo = require('./externos/openMeteo');

const LIMITE_CALOR = 30;

function indicadores() {
  const hoje = hojeIso();
  const mes = hoje.slice(0, 7);
  const em7dias = somarDias(hoje, 7);

  const porStatus = Object.fromEntries(
    db.prepare('SELECT status, COUNT(*) AS total FROM chamados GROUP BY status').all().map((l) => [l.status, l.total]),
  );

  const { total: hojeTotal } = db
    .prepare("SELECT COUNT(*) AS total FROM chamados WHERE data_agendada = ? AND status IN ('aberto', 'em_andamento')")
    .get(hoje);
  const { total: proximos7 } = db
    .prepare("SELECT COUNT(*) AS total FROM chamados WHERE data_agendada BETWEEN ? AND ? AND status IN ('aberto', 'em_andamento')")
    .get(hoje, em7dias);
  const { total: atrasados } = db
    .prepare("SELECT COUNT(*) AS total FROM chamados WHERE data_agendada < ? AND status IN ('aberto', 'em_andamento')")
    .get(hoje);
  const faturamento = db
    .prepare("SELECT IFNULL(SUM(valor), 0) AS total, COUNT(*) AS qtd FROM chamados WHERE status = 'concluido' AND substr(concluido_em, 1, 7) = ?")
    .get(mes);
  const { total: clientes } = db.prepare('SELECT COUNT(*) AS total FROM clientes').get();
  const porTipo = db
    .prepare("SELECT tipo, COUNT(*) AS total FROM chamados WHERE status <> 'cancelado' GROUP BY tipo ORDER BY total DESC")
    .all();
  const agendaHoje = db
    .prepare(`
      SELECT ch.id, ch.tipo, ch.status, ch.prioridade, c.nome AS cliente_nome, c.bairro AS cliente_bairro
      FROM chamados ch JOIN clientes c ON c.id = ch.cliente_id
      WHERE ch.data_agendada = ? AND ch.status IN ('aberto', 'em_andamento')
      ORDER BY CASE ch.prioridade WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END
    `)
    .all(hoje);

  return {
    data: hoje,
    chamados: {
      abertos: porStatus.aberto || 0,
      em_andamento: porStatus.em_andamento || 0,
      concluidos: porStatus.concluido || 0,
      cancelados: porStatus.cancelado || 0,
      hoje: hojeTotal,
      proximos_7_dias: proximos7,
      atrasados,
    },
    faturamento_mes: faturamento.total,
    concluidos_mes: faturamento.qtd,
    ticket_medio_mes: faturamento.qtd ? Math.round((faturamento.total / faturamento.qtd) * 100) / 100 : 0,
    clientes,
    por_tipo: porTipo,
    agenda_hoje: agendaHoje,
    capacidade_diaria: config.capacidadeDiaria,
  };
}

async function contextoExterno() {
  const hoje = hojeIso();
  const [clima, feriados] = await Promise.allSettled([
    openMeteo.previsaoPorCidade(config.empresaCidade, config.empresaUf),
    brasilApi.listarFeriados(hoje.slice(0, 4)),
  ]);

  let previsao = null;
  if (clima.status === 'fulfilled') {
    const dias = clima.value.dias.slice(0, 5);
    const diaQuente = dias.find((d) => d.maxima >= LIMITE_CALOR);
    previsao = {
      cidade: clima.value.cidade,
      uf: clima.value.uf,
      dias,
      alerta: diaQuente
        ? `Calor de ${Math.round(diaQuente.maxima)}°C previsto em ${diaQuente.data.split('-').reverse().slice(0, 2).join('/')}: a procura por manutenção e reparo costuma subir.`
        : null,
    };
  }

  let proximoFeriado = null;
  if (feriados.status === 'fulfilled') {
    proximoFeriado = feriados.value.find((f) => f.data >= hoje) || null;
  }

  return {
    previsao,
    proximo_feriado: proximoFeriado,
    indisponiveis: [
      ...(clima.status === 'rejected' ? ['previsão do tempo'] : []),
      ...(feriados.status === 'rejected' ? ['feriados'] : []),
    ],
  };
}

async function resumoCompleto() {
  return { ...indicadores(), externo: await contextoExterno() };
}

module.exports = { indicadores, resumoCompleto };
