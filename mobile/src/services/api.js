import Constants from 'expo-constants';

function descobrirUrlDaApi() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri ? hostUri.split(':')[0] : 'localhost';
  return `http://${host}:3333/api`;
}

export const API_URL = descobrirUrlDaApi();

export class ApiError extends Error {
  constructor(mensagem, status = 0, campos = {}) {
    super(mensagem);
    this.status = status;
    this.campos = campos || {};
  }
}

let tokenAtual = null;
let aoPerderSessao = null;

export const definirToken = (token) => {
  tokenAtual = token;
};

export const aoExpirarSessao = (callback) => {
  aoPerderSessao = callback;
};

async function requisitar(metodo, caminho, corpo, { timeoutMs = 20000 } = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  let resposta;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(tokenAtual && { Authorization: `Bearer ${tokenAtual}` }),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: controlador.signal,
    });
  } catch (erro) {
    const mensagem =
      erro.name === 'AbortError'
        ? 'O servidor demorou demais para responder. Tente novamente.'
        : `Não foi possível conectar à API (${API_URL}). Verifique se o backend está rodando e se o celular está na mesma rede Wi-Fi do computador.`;
    throw new ApiError(mensagem, 0);
  } finally {
    clearTimeout(temporizador);
  }

  if (resposta.status === 204) return null;

  let dados = null;
  try {
    dados = await resposta.json();
  } catch {
    dados = null;
  }

  if (!resposta.ok) {
    if (resposta.status === 401 && tokenAtual && aoPerderSessao) aoPerderSessao();
    throw new ApiError(dados?.erro || `Erro inesperado (HTTP ${resposta.status}).`, resposta.status, dados?.campos);
  }
  return dados;
}

const query = (params = {}) => {
  const partes = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return partes.length ? `?${partes.join('&')}` : '';
};

export const api = {
  login: (email, senha) => requisitar('POST', '/auth/login', { email, senha }),
  cadastrar: (dados) => requisitar('POST', '/auth/cadastro', dados),
  eu: () => requisitar('GET', '/auth/eu'),

  dashboard: () => requisitar('GET', '/dashboard'),

  listarClientes: (busca) => requisitar('GET', `/clientes${query({ busca })}`),
  obterCliente: (id) => requisitar('GET', `/clientes/${id}`),
  criarCliente: (dados) => requisitar('POST', '/clientes', dados),
  atualizarCliente: (id, dados) => requisitar('PUT', `/clientes/${id}`, dados),
  excluirCliente: (id) => requisitar('DELETE', `/clientes/${id}`),

  listarChamados: (filtros) => requisitar('GET', `/chamados${query(filtros)}`),
  obterChamado: (id) => requisitar('GET', `/chamados/${id}`),
  criarChamado: (dados) => requisitar('POST', '/chamados', dados),
  atualizarChamado: (id, dados) => requisitar('PUT', `/chamados/${id}`, dados),
  alterarStatus: (id, status) => requisitar('PATCH', `/chamados/${id}/status`, { status }),
  excluirChamado: (id) => requisitar('DELETE', `/chamados/${id}`),

  consultarCep: (cep) => requisitar('GET', `/externos/cep/${cep}`),
  consultarCnpj: (cnpj) => requisitar('GET', `/externos/cnpj/${cnpj}`),

  perguntarAoAssistente: (mensagem, conversaId) =>
    requisitar('POST', '/assistente', { mensagem, conversa_id: conversaId || undefined }, { timeoutMs: 90000 }),
  listarConversas: () => requisitar('GET', '/assistente/conversas'),
  obterConversa: (id) => requisitar('GET', `/assistente/conversas/${id}`),
  excluirConversa: (id) => requisitar('DELETE', `/assistente/conversas/${id}`),
};
