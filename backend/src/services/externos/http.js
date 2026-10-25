const AppError = require('../../utils/AppError');

async function buscarJson(url, { nomeServico, timeoutMs = 8000, opcoes = {} } = {}) {
  let resposta;
  try {
    resposta = await fetch(url, { ...opcoes, signal: AbortSignal.timeout(timeoutMs) });
  } catch (erro) {
    const motivo = erro.name === 'TimeoutError' ? 'não respondeu a tempo' : 'está indisponível no momento';
    throw new AppError(`O serviço ${nomeServico} ${motivo}. Tente novamente em instantes.`, 503);
  }

  let corpo = null;
  try {
    corpo = await resposta.json();
  } catch {
    corpo = null;
  }

  return { ok: resposta.ok, status: resposta.status, corpo };
}

module.exports = { buscarJson };
