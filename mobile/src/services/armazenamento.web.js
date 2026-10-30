const CHAVE_TOKEN = 'friocerto.token';

function armazenamento() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export async function salvarToken(token) {
  try {
    armazenamento()?.setItem(CHAVE_TOKEN, token);
  } catch {}
}

export async function lerToken() {
  try {
    return armazenamento()?.getItem(CHAVE_TOKEN) ?? null;
  } catch {
    return null;
  }
}

export async function apagarToken() {
  try {
    armazenamento()?.removeItem(CHAVE_TOKEN);
  } catch {}
}
