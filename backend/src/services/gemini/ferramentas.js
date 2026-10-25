const chamadoService = require('../chamadoService');
const clienteService = require('../clienteService');
const dashboardService = require('../dashboardService');
const brasilApi = require('../externos/brasilApi');
const openMeteo = require('../externos/openMeteo');

const declaracoes = [
  {
    name: 'obter_indicadores',
    description: 'Retorna os indicadores atuais do negócio: chamados por status, chamados de hoje, próximos 7 dias, atrasados, faturamento e ticket médio do mês, total de clientes e agenda do dia.',
  },
  {
    name: 'listar_chamados',
    description: 'Lista chamados técnicos com filtros opcionais. Use para perguntas sobre agenda, pendências, chamados de um cliente ou de um período.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Um ou mais status separados por vírgula: aberto, em_andamento, concluido, cancelado.',
        },
        data_inicio: { type: 'string', description: 'Data inicial no formato AAAA-MM-DD.' },
        data_fim: { type: 'string', description: 'Data final no formato AAAA-MM-DD.' },
        busca: { type: 'string', description: 'Trecho do nome do cliente ou da descrição do serviço.' },
      },
    },
  },
  {
    name: 'buscar_clientes',
    description: 'Busca clientes cadastrados por nome, cidade, telefone ou documento. Use para descobrir o cliente_id antes de criar um chamado.',
    parameters: {
      type: 'object',
      properties: { termo: { type: 'string', description: 'Texto a procurar. Vazio lista todos.' } },
    },
  },
  {
    name: 'criar_chamado',
    description: 'Abre um novo chamado técnico. As regras de agenda (data futura, sem domingos, sem feriados nacionais, capacidade diária) são aplicadas pelo sistema.',
    parameters: {
      type: 'object',
      properties: {
        cliente_id: { type: 'integer', description: 'ID do cliente (obtido com buscar_clientes).' },
        tipo: { type: 'string', enum: ['instalacao', 'manutencao', 'limpeza', 'reparo'] },
        descricao: { type: 'string', description: 'Descrição do serviço a ser feito.' },
        data_agendada: { type: 'string', description: 'Data do atendimento no formato AAAA-MM-DD.' },
        prioridade: { type: 'string', enum: ['baixa', 'media', 'alta'] },
        valor: { type: 'number', description: 'Valor previsto do serviço em reais.' },
      },
      required: ['cliente_id', 'tipo', 'descricao', 'data_agendada'],
    },
  },
  {
    name: 'atualizar_status_chamado',
    description: 'Muda o status de um chamado. Fluxo permitido: aberto -> em_andamento ou cancelado; em_andamento -> concluido ou cancelado.',
    parameters: {
      type: 'object',
      properties: {
        chamado_id: { type: 'integer' },
        novo_status: { type: 'string', enum: ['em_andamento', 'concluido', 'cancelado'] },
      },
      required: ['chamado_id', 'novo_status'],
    },
  },
  {
    name: 'consultar_previsao_tempo',
    description: 'Consulta a previsão do tempo dos próximos dias (máxima, mínima e chance de chuva) para uma cidade brasileira.',
    parameters: {
      type: 'object',
      properties: {
        cidade: { type: 'string' },
        uf: { type: 'string', description: 'Sigla do estado, por exemplo SP.' },
      },
      required: ['cidade', 'uf'],
    },
  },
  {
    name: 'consultar_feriados',
    description: 'Lista os feriados nacionais de um ano.',
    parameters: {
      type: 'object',
      properties: { ano: { type: 'integer' } },
      required: ['ano'],
    },
  },
];

const resumirChamado = (c) => ({
  id: c.id,
  cliente: c.cliente_nome,
  cidade: c.cliente_cidade,
  tipo: c.tipo,
  status: c.status,
  prioridade: c.prioridade,
  data_agendada: c.data_agendada,
  valor: c.valor,
  descricao: c.descricao,
});

const executores = {
  obter_indicadores: () => dashboardService.indicadores(),
  listar_chamados: (args) => {
    const lista = chamadoService.listar(args);
    return { total: lista.length, chamados: lista.slice(0, 30).map(resumirChamado) };
  },
  buscar_clientes: ({ termo } = {}) => {
    const lista = clienteService.listar({ busca: termo });
    return {
      total: lista.length,
      clientes: lista.slice(0, 20).map((c) => ({ id: c.id, nome: c.nome, cidade: c.cidade, uf: c.uf, telefone: c.telefone, chamados_ativos: c.chamados_ativos })),
    };
  },
  criar_chamado: async (args, contexto) => {
    const { chamado, avisos } = await chamadoService.criar(args, contexto.usuarioId);
    return { criado: resumirChamado(chamado), avisos };
  },
  atualizar_status_chamado: ({ chamado_id: id, novo_status: status }) => ({
    atualizado: resumirChamado(chamadoService.alterarStatus(id, status)),
  }),
  consultar_previsao_tempo: async ({ cidade, uf }) => {
    const previsao = await openMeteo.previsaoPorCidade(cidade, uf);
    return { ...previsao, dias: previsao.dias.slice(0, 7) };
  },
  consultar_feriados: async ({ ano }) => ({ feriados: await brasilApi.listarFeriados(ano) }),
};

async function executar(nome, args, contexto) {
  const executor = executores[nome];
  if (!executor) return { erro: `Função ${nome} não existe.` };
  try {
    return await executor(args || {}, contexto);
  } catch (erro) {
    return { erro: erro.message, detalhes: erro.detalhes };
  }
}

module.exports = { declaracoes, executar };
