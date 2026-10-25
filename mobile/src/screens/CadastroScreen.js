import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Botao, Campo, Mensagem } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { emailValido } from '../utils/validacao';
import { cores, espaco, fonte } from '../theme';

export default function CadastroScreen() {
  const { cadastrar } = useAuth();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmacao: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));

  async function enviar() {
    const novosErros = {};
    if (form.nome.trim().length < 3) novosErros.nome = 'Informe o nome com pelo menos 3 letras.';
    if (!emailValido(form.email)) novosErros.email = 'Informe um e-mail válido.';
    if (form.senha.length < 6) novosErros.senha = 'A senha deve ter pelo menos 6 caracteres.';
    if (form.confirmacao !== form.senha) novosErros.confirmacao = 'As senhas não conferem.';
    setErros(novosErros);
    setErroGeral('');
    if (Object.keys(novosErros).length) return;

    setEnviando(true);
    try {
      await cadastrar({ nome: form.nome.trim(), email: form.email.trim(), senha: form.senha });
    } catch (erro) {
      setErros(erro.campos);
      setErroGeral(erro.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={styles.texto}>Crie seu acesso para gerenciar clientes e chamados da equipe.</Text>
        <Mensagem texto={erroGeral} />
        <Campo rotulo="Nome" value={form.nome} onChangeText={alterar('nome')} erro={erros.nome} placeholder="Seu nome" />
        <Campo
          rotulo="E-mail"
          value={form.email}
          onChangeText={alterar('email')}
          erro={erros.email}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="voce@empresa.com"
        />
        <Campo
          rotulo="Senha"
          value={form.senha}
          onChangeText={alterar('senha')}
          erro={erros.senha}
          secureTextEntry
          ajuda="Mínimo de 6 caracteres."
        />
        <Campo
          rotulo="Confirme a senha"
          value={form.confirmacao}
          onChangeText={alterar('confirmacao')}
          erro={erros.confirmacao}
          secureTextEntry
          onSubmitEditing={enviar}
        />
        <Botao titulo="Criar conta e entrar" onPress={enviar} carregando={enviando} style={{ marginTop: espaco.sm }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.xl },
  texto: { fontSize: fonte.corpo, color: cores.textoSuave, marginBottom: espaco.lg },
});
