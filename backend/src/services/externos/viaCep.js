const AppError = require('../../utils/AppError');
const { somenteDigitos } = require('../../utils/validators');
const { buscarJson } = require('./http');

const cache = new Map();

async function consultarCep(cepInformado) {
  const cep = somenteDigitos(cepInformado);
  if (cep.length !== 8) throw new AppError('CEP inválido. Informe os 8 dígitos.', 400);
  if (cache.has(cep)) return cache.get(cep);

  const { ok, corpo } = await buscarJson(`https://viacep.com.br/ws/${cep}/json/`, { nomeServico: 'ViaCEP' });
  if (!ok || !corpo || corpo.erro === true || corpo.erro === 'true') {
    throw new AppError('CEP não encontrado.', 404);
  }

  const endereco = {
    cep,
    logradouro: corpo.logradouro || '',
    bairro: corpo.bairro || '',
    cidade: corpo.localidade || '',
    uf: corpo.uf || '',
  };
  cache.set(cep, endereco);
  return endereco;
}

module.exports = { consultarCep };
