import * as SecureStore from 'expo-secure-store';

const CHAVE_TOKEN = 'friocerto.token';

export async function salvarToken(token) {
  await SecureStore.setItemAsync(CHAVE_TOKEN, token);
}

export async function lerToken() {
  return SecureStore.getItemAsync(CHAVE_TOKEN);
}

export async function apagarToken() {
  await SecureStore.deleteItemAsync(CHAVE_TOKEN);
}
