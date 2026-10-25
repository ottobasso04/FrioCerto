const config = require('../../config');
const AppError = require('../../utils/AppError');

const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const STATUS_DE_SOBRECARGA = [429, 500, 502, 503, 504];

let primarioPausadoAte = 0;

class FalhaDoModelo extends Error {
  constructor(mensagem, { status = 0, sobrecarga = false } = {}) {
    super(mensagem);
    this.status = status;
    this.sobrecarga = sobrecarga;
  }
}

async function chamarModelo(modelo, corpo) {
  let resposta;
  try {
    resposta = await fetch(`${URL_BASE}/${modelo}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiApiKey },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(25000),
    });
  } catch (erro) {
    const motivo = erro.name === 'TimeoutError' ? 'demorou demais para responder' : 'está indisponível';
    throw new FalhaDoModelo(`O modelo ${modelo} ${motivo}.`, { sobrecarga: true });
  }

  const dados = await resposta.json().catch(() => null);
  if (resposta.ok) return dados;

  const mensagem = dados?.error?.message || `HTTP ${resposta.status}`;
  throw new FalhaDoModelo(mensagem, {
    status: resposta.status,
    sobrecarga: STATUS_DE_SOBRECARGA.includes(resposta.status),
  });
}

function ordemDosModelos(preferido) {
  const primario = config.geminiModel;
  const reserva = config.geminiModelReserva && config.geminiModelReserva !== primario ? config.geminiModelReserva : null;
  if (preferido === reserva) return [reserva];
  if (reserva && Date.now() < primarioPausadoAte) return [reserva];
  return reserva ? [primario, reserva] : [primario];
}

async function gerarConteudo(corpo, { preferido } = {}) {
  if (!config.geminiApiKey) {
    throw new AppError('Assistente não configurado: defina GEMINI_API_KEY no arquivo .env da API.', 503);
  }

  const modelos = ordemDosModelos(preferido);
  let ultimaFalha = null;

  for (const modelo of modelos) {
    try {
      const dados = await chamarModelo(modelo, corpo);
      return { dados, modelo, reserva: modelo !== config.geminiModel };
    } catch (falha) {
      ultimaFalha = falha;
      if (!falha.sobrecarga) break;
      if (modelo === config.geminiModel) {
        primarioPausadoAte = Date.now() + config.geminiPausaPrimarioMs;
        console.warn(`Gemini: ${modelo} sobrecarregado (${falha.status || 'sem resposta'}), usando o modelo reserva.`);
      }
    }
  }

  if (ultimaFalha.sobrecarga) {
    throw new AppError('O Gemini está com demanda alta e os dois modelos estão indisponíveis. Tente novamente em alguns instantes.', 503);
  }
  if ([400, 401, 403].includes(ultimaFalha.status) && /api key/i.test(ultimaFalha.message)) {
    throw new AppError('Chave da API do Gemini inválida. Confira GEMINI_API_KEY.', 502);
  }
  throw new AppError(`Erro ao consultar o Gemini: ${ultimaFalha.message}`, 502);
}

function reiniciarPausa() {
  primarioPausadoAte = 0;
}

module.exports = { gerarConteudo, reiniciarPausa };
