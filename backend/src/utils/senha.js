const crypto = require('node:crypto');

const TAMANHO_CHAVE = 64;

function gerarHash(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, sal, TAMANHO_CHAVE).toString('hex');
  return `${sal}:${hash}`;
}

function conferir(senha, armazenado) {
  const [sal, hash] = String(armazenado).split(':');
  if (!sal || !hash) return false;
  const calculado = crypto.scryptSync(senha, sal, TAMANHO_CHAVE);
  const esperado = Buffer.from(hash, 'hex');
  return esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado);
}

module.exports = { gerarHash, conferir };
