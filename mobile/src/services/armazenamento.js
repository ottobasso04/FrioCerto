import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CHAVE_TOKEN = 'friocerto.token';

export async function salvarToken(token) {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(CHAVE_TOKEN, token);
    return;
  }
  await SecureStore.setItemAsync(CHAVE_TOKEN, token);
}

export async function lerToken() {
  if (Platform.OS === 'web') return window.localStorage.getItem(CHAVE_TOKEN);
  return SecureStore.getItemAsync(CHAVE_TOKEN);
}

export async function apagarToken() {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(CHAVE_TOKEN);
    return;
  }
  await SecureStore.deleteItemAsync(CHAVE_TOKEN);
}
