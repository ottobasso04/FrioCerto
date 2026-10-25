const AppError = require('../../utils/AppError');
const { somenteDigitos, cnpjValido } = require('../../utils/validators');
const { buscarJson } = require('./http');

const cacheFeriados = new Map();

async function consultarCnpj(cnpjInformado) {
  const cnpj = somenteDigitos(cnpjInformado);
  if (!cnpjValido(cnpj)) throw new AppError('CNPJ inválido. Confira os dígitos.', 400);

  const { ok, status, corpo } = await buscarJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    nomeServico: 'BrasilAPI (CNPJ)',
    timeoutMs: 12000,
  });
  if (status === 404) throw new AppError('CNPJ não encontrado na Receita Federal.', 404);
  if (!ok || !corpo) throw new AppError('Não foi possível consultar o CNPJ agora.', 503);

  return {
    documento: cnpj,
    nome: corpo.nome_fantasia || corpo.razao_social || '',
    razaoSocial: corpo.razao_social || '',
    situacao: corpo.descricao_situacao_cadastral || '',
    telefone: somenteDigitos(corpo.ddd_telefone_1),
    email: corpo.email || '',
    cep: somenteDigitos(corpo.cep),
    logradouro: [corpo.descricao_tipo_de_logradouro, corpo.logradouro].filter(Boolean).join(' '),
    numero: corpo.numero || '',
    bairro: corpo.bairro || '',
    cidade: corpo.municipio || '',
    uf: corpo.uf || '',
  };
}

async function listarFeriados(ano) {
  const anoNum = Number(ano);
  if (!Number.isInteger(anoNum) || anoNum < 1900 || anoNum > 2199) {
    throw new AppError('Ano inválido para consulta de feriados.', 400);
  }
  if (cacheFeriados.has(anoNum)) return cacheFeriados.get(anoNum);

  const { ok, corpo } = await buscarJson(`https://brasilapi.com.br/api/feriados/v1/${anoNum}`, {
    nomeServico: 'BrasilAPI (feriados)',
  });
  if (!ok || !Array.isArray(corpo)) throw new AppError('Não foi possível consultar os feriados agora.', 503);

  const feriados = corpo.map((f) => ({ data: f.date, nome: f.name, tipo: f.type }));
  cacheFeriados.set(anoNum, feriados);
  return feriados;
}

async function feriadoNaData(dataIso) {
  const feriados = await listarFeriados(dataIso.slice(0, 4));
  return feriados.find((f) => f.data === dataIso) || null;
}

module.exports = { consultarCnpj, listarFeriados, feriadoNaData };
