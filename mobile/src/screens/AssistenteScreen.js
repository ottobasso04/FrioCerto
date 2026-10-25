import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Mensagem } from '../components/ui';
import { api } from '../services/api';
import { avisar, confirmar } from '../utils/dialogo';
import { cores, espaco, fonte, raio } from '../theme';

const SUGESTOES = [
  'Como está a agenda de hoje?',
  'Quais chamados estão em aberto?',
  'Quanto faturamos este mês?',
  'Vai chover em Araraquara nos próximos dias?',
  'Abra um chamado de limpeza para a Padaria Pão Quente na próxima quinta',
];

let proximoId = 1;
const novaMensagem = (papel, texto, extra = {}) => ({ id: `local-${proximoId++}`, papel, texto, ...extra });

function textoSimples(conteudo) {
  return String(conteudo)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]*[-*+•–—][ \t]+/gm, '')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/gm, '$1$2')
    .replace(/[ \t]+[–—][ \t]+/g, ', ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function quando(dataUtc) {
  const d = new Date(`${String(dataUtc).replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} às ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AssistenteScreen({ navigation }) {
  const [conversaId, setConversaId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [conversas, setConversas] = useState([]);
  const [erroConversas, setErroConversas] = useState('');
  const [abrindo, setAbrindo] = useState(false);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const listaRef = useRef(null);

  const emConversa = mensagens.length > 0 || abrindo;

  const carregarConversas = useCallback(async () => {
    try {
      setErroConversas('');
      setConversas(await api.listarConversas());
    } catch (e) {
      setErroConversas(e.message);
    }
  }, []);

  const voltar = useCallback(() => {
    if (pensando) return;
    setConversaId(null);
    setMensagens([]);
    setTexto('');
    carregarConversas();
  }, [pensando, carregarConversas]);

  useFocusEffect(
    useCallback(() => {
      if (!emConversa) carregarConversas();
      if (!emConversa) return undefined;
      const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
        voltar();
        return true;
      });
      return () => assinatura.remove();
    }, [emConversa, carregarConversas, voltar]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: emConversa ? 'Conversa' : 'Assistente IA',
      headerLeft: emConversa
        ? () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar para o início do assistente"
              onPress={voltar}
              disabled={pensando}
              hitSlop={10}
              style={[styles.voltar, pensando && { opacity: 0.4 }]}
            >
              <Ionicons name="arrow-back" size={24} color={cores.primaria} />
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, emConversa, voltar, pensando]);

  async function abrirConversa(id) {
    setAbrindo(true);
    try {
      const conversa = await api.obterConversa(id);
      setConversaId(conversa.id);
      setMensagens(conversa.mensagens.map((m) => ({ id: `srv-${m.id}`, papel: m.papel, texto: m.texto })));
    } catch (e) {
      avisar('Não foi possível abrir a conversa', e.message);
    } finally {
      setAbrindo(false);
    }
  }

  async function excluirConversa(conversa) {
    const ok = await confirmar('Excluir conversa', `Apagar "${conversa.titulo}" do histórico?`, 'Excluir', true);
    if (!ok) return;
    try {
      await api.excluirConversa(conversa.id);
      setConversas((lista) => lista.filter((c) => c.id !== conversa.id));
    } catch (e) {
      avisar('Não foi possível excluir', e.message);
    }
  }

  async function enviar(conteudo = texto) {
    const pergunta = conteudo.trim();
    if (!pergunta || pensando) return;

    setMensagens((m) => [...m, novaMensagem('usuario', pergunta)]);
    setTexto('');
    setPensando(true);

    try {
      const r = await api.perguntarAoAssistente(pergunta, conversaId);
      setConversaId(r.conversa_id);
      setMensagens((m) => [...m, novaMensagem('assistente', r.resposta)]);
    } catch (e) {
      setMensagens((m) => [...m, novaMensagem('assistente', e.message, { erro: true })]);
    } finally {
      setPensando(false);
    }
  }

  const renderItem = ({ item }) => {
    const doUsuario = item.papel === 'usuario';
    return (
      <View style={[styles.balao, doUsuario ? styles.balaoUsuario : styles.balaoAssistente, item.erro && styles.balaoErro]}>
        <Text style={[styles.balaoTexto, doUsuario && { color: '#FFFFFF' }, item.erro && { color: cores.perigo }]}>
          {doUsuario ? item.texto : textoSimples(item.texto)}
        </Text>
      </View>
    );
  };

  const inicio = (
    <View style={styles.inicio}>
      <View style={styles.cabecalho}>
        <View style={styles.icone}>
          <Ionicons name="sparkles-outline" size={28} color={cores.primaria} />
        </View>
        <Text style={styles.vazioTitulo}>Assistente FrioCerto</Text>
        <Text style={styles.vazioTexto}>
          Pergunte sobre a agenda, o faturamento ou o tempo, ou peça para abrir um chamado.
        </Text>
      </View>

      <Text style={styles.secao}>Sugestões</Text>
      {SUGESTOES.map((s) => (
        <Pressable key={s} style={styles.sugestao} onPress={() => enviar(s)}>
          <Text style={styles.sugestaoTexto}>{s}</Text>
        </Pressable>
      ))}

      <Text style={styles.secao}>Conversas anteriores</Text>
      <Mensagem texto={erroConversas} acao="Tentar de novo" onAcao={carregarConversas} />
      {!erroConversas && conversas.length === 0 ? <Text style={styles.vazioTexto}>Nenhuma conversa salva ainda.</Text> : null}
      {conversas.map((c) => (
        <Pressable key={c.id} style={styles.conversa} onPress={() => abrirConversa(c.id)} accessibilityRole="button">
          <Ionicons name="chatbubbles-outline" size={20} color={cores.primaria} />
          <View style={{ flex: 1 }}>
            <Text style={styles.conversaTitulo} numberOfLines={1}>{c.titulo}</Text>
            <Text style={styles.conversaMeta}>
              {quando(c.atualizado_em)} · {c.total_mensagens / 2} pergunta(s)
            </Text>
          </View>
          <Pressable
            onPress={() => excluirConversa(c)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Excluir conversa ${c.titulo}`}
          >
            <Ionicons name="trash-outline" size={20} color={cores.textoSuave} />
          </Pressable>
        </Pressable>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {abrindo ? (
        <View style={styles.carregando}>
          <ActivityIndicator size="large" color={cores.primaria} />
        </View>
      ) : (
        <FlatList
          ref={listaRef}
          data={mensagens}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => emConversa && listaRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={inicio}
          ListFooterComponent={
            pensando ? (
              <View style={[styles.balao, styles.balaoAssistente]}>
                <Text style={styles.pensando}>Consultando o sistema...</Text>
              </View>
            ) : null
          }
        />
      )}

      <View style={styles.barra}>
        <TextInput
          style={styles.input}
          value={texto}
          onChangeText={setTexto}
          placeholder={conversaId ? 'Continue a conversa' : 'Escreva sua pergunta'}
          placeholderTextColor={cores.textoSuave}
          multiline
          maxLength={2000}
          accessibilityLabel="Mensagem para o assistente"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          onPress={() => enviar()}
          disabled={!texto.trim() || pensando}
          style={[styles.enviar, (!texto.trim() || pensando) && { opacity: 0.5 }]}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  lista: { padding: espaco.lg, gap: espaco.sm, flexGrow: 1 },
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  voltar: { paddingHorizontal: espaco.lg },
  balao: { maxWidth: '85%', padding: espaco.md, borderRadius: raio.lg },
  balaoUsuario: { alignSelf: 'flex-end', backgroundColor: cores.primaria, borderBottomRightRadius: 4 },
  balaoAssistente: { alignSelf: 'flex-start', backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.borda, borderBottomLeftRadius: 4 },
  balaoErro: { backgroundColor: cores.perigoClaro, borderColor: cores.perigoClaro },
  balaoTexto: { fontSize: fonte.corpo, color: cores.texto, lineHeight: 21 },
  pensando: { color: cores.textoSuave, fontStyle: 'italic' },
  inicio: { gap: espaco.sm },
  cabecalho: { alignItems: 'center', gap: espaco.sm, marginBottom: espaco.sm },
  icone: { width: 56, height: 56, borderRadius: 28, backgroundColor: cores.primariaClara, alignItems: 'center', justifyContent: 'center' },
  vazioTitulo: { fontSize: fonte.media, fontWeight: '700', color: cores.texto },
  vazioTexto: { color: cores.textoSuave, textAlign: 'center' },
  secao: { fontSize: fonte.pequena, fontWeight: '700', color: cores.textoSuave, textTransform: 'uppercase', marginTop: espaco.md },
  sugestao: { backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.md, padding: espaco.md },
  sugestaoTexto: { color: cores.primariaEscura, fontWeight: '500' },
  conversa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    padding: espaco.md,
  },
  conversaTitulo: { color: cores.texto, fontWeight: '600' },
  conversaMeta: { color: cores.textoSuave, fontSize: 12, marginTop: 2 },
  barra: { flexDirection: 'row', alignItems: 'flex-end', gap: espaco.sm, padding: espaco.md, backgroundColor: cores.superficie, borderTopWidth: 1, borderTopColor: cores.borda },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: cores.fundo,
    borderRadius: raio.lg,
    paddingHorizontal: espaco.md,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: fonte.corpo,
    color: cores.texto,
  },
  enviar: { width: 44, height: 44, borderRadius: 22, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center' },
});