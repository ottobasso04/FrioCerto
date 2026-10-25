import { Pressable } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Carregando } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { confirmar } from '../utils/dialogo';
import { cores } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ChamadosScreen from '../screens/ChamadosScreen';
import ChamadoDetalheScreen from '../screens/ChamadoDetalheScreen';
import ChamadoFormScreen from '../screens/ChamadoFormScreen';
import ClientesScreen from '../screens/ClientesScreen';
import ClienteFormScreen from '../screens/ClienteFormScreen';
import AssistenteScreen from '../screens/AssistenteScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tema = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: cores.primaria, background: cores.fundo, card: cores.superficie, text: cores.texto, border: cores.borda },
};

const ICONES = {
  Painel: 'speedometer-outline',
  Chamados: 'clipboard-outline',
  Clientes: 'people-outline',
  Assistente: 'sparkles-outline',
};

function BotaoSair() {
  const { sair } = useAuth();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sair"
      hitSlop={10}
      style={{ paddingHorizontal: 16 }}
      onPress={async () => {
        if (await confirmar('Sair', 'Deseja encerrar a sessão?', 'Sair')) sair();
      }}
    >
      <Ionicons name="log-out-outline" size={24} color={cores.texto} />
    </Pressable>
  );
}

function Abas() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONES[route.name]} size={size} color={color} />,
        headerTitleStyle: { fontWeight: '700' },
      })}
    >
      <Tab.Screen name="Painel" component={DashboardScreen} options={{ title: 'Painel', headerRight: () => <BotaoSair /> }} />
      <Tab.Screen name="Chamados" component={ChamadosScreen} />
      <Tab.Screen name="Clientes" component={ClientesScreen} />
      <Tab.Screen name="Assistente" component={AssistenteScreen} options={{ title: 'Assistente IA' }} />
    </Tab.Navigator>
  );
}

export default function Rotas() {
  const { usuario, iniciando } = useAuth();

  if (iniciando) return <Carregando texto="Abrindo o FrioCerto..." />;

  return (
    <NavigationContainer theme={tema}>
      <Stack.Navigator screenOptions={{ headerTintColor: cores.primaria, headerTitleStyle: { color: cores.texto, fontWeight: '700' } }}>
        {usuario ? (
          <>
            <Stack.Screen name="Inicio" component={Abas} options={{ headerShown: false }} />
            <Stack.Screen name="ChamadoDetalhe" component={ChamadoDetalheScreen} options={{ title: 'Chamado' }} />
            <Stack.Screen name="ChamadoForm" component={ChamadoFormScreen} options={{ title: 'Chamado' }} />
            <Stack.Screen name="ClienteForm" component={ClienteFormScreen} options={{ title: 'Cliente' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Cadastro" component={CadastroScreen} options={{ title: 'Criar conta' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
