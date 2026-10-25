export const somenteDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');

export function moeda(valor) {
  const numero = Number(valor) || 0;
  const [inteiro, centavos] = Math.abs(numero).toFixed(2).split('.');
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${numero < 0 ? '-' : ''}R$ ${comMilhar},${centavos}`;
}

export function isoParaBr(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export function brParaIso(br) {
  const digitos = somenteDigitos(br);
  if (digitos.length !== 8) return null;
  const d = Number(digitos.slice(0, 2));
  const m = Number(digitos.slice(2, 4));
  const a = Number(digitos.slice(4));
  const data = new Date(Date.UTC(a, m - 1, d));
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) return null;
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function diaCurto(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return DIAS_CURTOS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
}

function aplicarMascara(digitos, padrao) {
  let i = 0;
  let saida = '';
  for (const char of padrao) {
    if (i >= digitos.length) break;
    if (char === '0') {
      saida += digitos[i];
      i += 1;
    } else {
      saida += char;
    }
  }
  return saida;
}

export const mascaraCep = (v) => aplicarMascara(somenteDigitos(v).slice(0, 8), '00000-000');
export const mascaraData = (v) => aplicarMascara(somenteDigitos(v).slice(0, 8), '00/00/0000');

export function mascaraTelefone(v) {
  const d = somenteDigitos(v).slice(0, 11);
  return aplicarMascara(d, d.length > 10 ? '(00) 00000-0000' : '(00) 0000-0000');
}

export function mascaraDocumento(v) {
  const d = somenteDigitos(v).slice(0, 14);
  return d.length <= 11 ? aplicarMascara(d, '000.000.000-00') : aplicarMascara(d, '00.000.000/0000-00');
}
