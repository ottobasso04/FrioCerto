import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Botao, Campo, Mensagem } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../services/api';
import { emailValido } from '../utils/validacao';
import { cores, espaco, fonte } from '../theme';

export default function LoginScreen({ navigation }) {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const senhaRef = useRef(null);

  async function enviar() {
    const novosErros = {};
    if (!emailValido(email)) novosErros.email = 'Informe um e-mail válido.';
    if (!senha) novosErros.senha = 'Informe a senha.';
    setErros(novosErros);
    setErroGeral('');
    if (Object.keys(novosErros).length) return;

    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
    } catch (erro) {
      setErros(erro.campos);
      setErroGeral(erro.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.tela}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <View style={styles.marca}>
            <View style={styles.logo}>
              <Ionicons name="snow-outline" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.titulo}>FrioCerto</Text>
            <Text style={styles.subtitulo}>Chamados de climatização sob controle</Text>
          </View>

          <Mensagem texto={erroGeral} />

          <Campo
            rotulo="E-mail"
            value={email}
            onChangeText={setEmail}
            erro={erros.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => senhaRef.current?.focus()}
            placeholder="voce@empresa.com"
          />
          <Campo
            ref={senhaRef}
            rotulo="Senha"
            value={senha}
            onChangeText={setSenha}
            erro={erros.senha}
            secureTextEntry
            autoComplete="password"
            returnKeyType="go"
            onSubmitEditing={enviar}
            placeholder="Sua senha"
          />

          <Botao titulo="Entrar" onPress={enviar} carregando={enviando} style={{ marginTop: espaco.sm }} />
          <Botao
            titulo="Criar conta"
            variante="secundario"
            onPress={() => navigation.navigate('Cadastro')}
            style={{ marginTop: espaco.md }}
          />

          <Text style={styles.dica}>Demonstração: gestor@friocerto.com / 123456</Text>
          <Text style={styles.dica}>API: {API_URL}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: espaco.xl },
  marca: { alignItems: 'center', marginBottom: espaco.xl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espaco.md,
  },
  titulo: { fontSize: fonte.destaque, fontWeight: '800', color: cores.texto },
  subtitulo: { fontSize: fonte.corpo, color: cores.textoSuave, marginTop: espaco.xs },
  dica: { textAlign: 'center', color: cores.textoSuave, fontSize: fonte.pequena, marginTop: espaco.md },
});
