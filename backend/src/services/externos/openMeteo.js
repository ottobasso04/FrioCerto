const AppError = require('../../utils/AppError');
const config = require('../../config');
const { buscarJson } = require('./http');

const ESTADOS = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

const TEMPO_CACHE_MS = 30 * 60 * 1000;
const cacheCoordenadas = new Map();
const cachePrevisao = new Map();

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

async function localizarCidade(cidade, uf) {
  const chave = `${normalizar(cidade)}-${String(uf || '').toUpperCase()}`;
  if (cacheCoordenadas.has(chave)) return cacheCoordenadas.get(chave);

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=10&language=pt&countryCode=BR&format=json`;
  const { ok, corpo } = await buscarJson(url, { nomeServico: 'Open-Meteo (geocodificação)' });
  if (!ok) throw new AppError('Não foi possível localizar a cidade agora.', 503);

  const resultados = (corpo && corpo.results) || [];
  const estado = ESTADOS[String(uf || '').toUpperCase()];
  const escolhido =
    resultados.find((r) => estado && normalizar(r.admin1) === normalizar(estado)) || (estado ? null : resultados[0]);
  if (!escolhido) throw new AppError(`Cidade "${cidade}${uf ? `/${uf}` : ''}" não encontrada para previsão do tempo.`, 404);

  const local = { cidade: escolhido.name, uf: String(uf || '').toUpperCase(), latitude: escolhido.latitude, longitude: escolhido.longitude };
  cacheCoordenadas.set(chave, local);
  return local;
}

async function previsaoPorCidade(cidade = config.empresaCidade, uf = config.empresaUf) {
  const local = await localizarCidade(cidade, uf);
  const chave = `${local.latitude},${local.longitude}`;
  const emCache = cachePrevisao.get(chave);
  if (emCache && Date.now() - emCache.em < TEMPO_CACHE_MS) return emCache.dados;

  const params = new URLSearchParams({
    latitude: String(local.latitude),
    longitude: String(local.longitude),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: config.timezone,
    forecast_days: '16',
  });
  const { ok, corpo } = await buscarJson(`https://api.open-meteo.com/v1/forecast?${params}`, {
    nomeServico: 'Open-Meteo (previsão)',
  });
  if (!ok || !corpo || !corpo.daily) throw new AppError('Não foi possível obter a previsão do tempo agora.', 503);

  const { time, temperature_2m_max: maximas, temperature_2m_min: minimas, precipitation_probability_max: chuva } = corpo.daily;
  const dias = time.map((data, i) => ({
    data,
    maxima: maximas[i],
    minima: minimas[i],
    chanceChuva: chuva ? chuva[i] : null,
  }));

  const dados = { cidade: local.cidade, uf: local.uf, dias };
  cachePrevisao.set(chave, { em: Date.now(), dados });
  return dados;
}

async function previsaoNaData(cidade, uf, dataIso) {
  const previsao = await previsaoPorCidade(cidade, uf);
  return previsao.dias.find((d) => d.data === dataIso) || null;
}

module.exports = { previsaoPorCidade, previsaoNaData };
