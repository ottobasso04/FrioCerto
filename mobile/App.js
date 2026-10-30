import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import Rotas from './src/navigation/Rotas';
import LimiteDeErro from './src/components/LimiteDeErro';

export default function App() {
  return (
    <LimiteDeErro>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Rotas />
        </AuthProvider>
      </SafeAreaProvider>
    </LimiteDeErro>
  );
}
