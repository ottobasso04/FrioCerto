import { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Botao, Campo, Carregando, Mensagem, Opcoes, Vazio } from '../components/ui';
import Calendario from '../components/Calendario';
import { api } from '../services/api';
import { avisar } from '../utils/dialogo';
import { diaCurto, isoParaBr } from '../utils/formatacao';
import { cores, espaco, fonte, PRIORIDADES, raio, TIPOS } from '../theme';

const OPCOES_TIPO = Object.entries(TIPOS).map(([valor, t]) => ({ valor, rotulo: t.rotulo }));
const OPCOES_PRIORIDADE = Object.entries(PRIORIDADES).map(([valor, p]) => ({ valor, rotulo: p.rotulo }));

export default function ChamadoFormScreen({ navigation, route }) {
  const id = route.params?.id;
  const [form, setForm] = useState({ cliente_id: null, tipo: 'manutencao', prioridade: 'media', data_agendada: '', valor: '', descricao: '' });
  const [clientes, setClientes] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: id ? `Editar chamado #${id}` : 'Novo chamado' });
    (async () => {
      try {
        const [listaClientes, chamado] = await Promise.all([api.listarClientes(), id ? api.obterChamado(id) : null]);
        setClientes(listaClientes);
        if (chamado) {
          setForm({
            cliente_id: chamado.cliente_id,
            tipo: chamado.tipo,
            prioridade: chamado.prioridade,
            data_agendada: chamado.data_agendada,
            valor: String(chamado.valor).replace('.', ','),
            descricao: chamado.descricao,
          });
        }
      } catch (e) {
        setErroGeral(e.message);
      } finally {
        setCarregando(false);
      }
    })();
  }, [id, navigation]);

  const alterar = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const clienteSelecionado = clientes?.find((c) => c.id === form.cliente_id);
  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    return (clientes || []).filter((c) => !termo || c.nome.toLowerCase().includes(termo) || c.cidade.toLowerCase().includes(termo));
  }, [clientes, buscaCliente]);

  async function salvar() {
    const novosErros = {};
    const dataIso = form.data_agendada;
    const valor = form.valor.trim() === '' ? 0 : Number(form.valor.replace(/\./g, '').replace(',', '.'));
    if (!form.cliente_id) novosErros.cliente_id = 'Selecione o cliente.';
    if (!dataIso) novosErros.data_agendada = 'Escolha a data do atendimento.';
    if (!Number.isFinite(valor) || valor < 0) novosErros.valor = 'Informe um valor válido.';
    if (form.descricao.trim().length < 5) novosErros.descricao = 'Descreva o serviço (mínimo 5 caracteres).';
    setErros(novosErros);
    setErroGeral('');
    if (Object.keys(novosErros).length) return;

    const dados = {
      cliente_id: form.cliente_id,
      tipo: form.tipo,
      prioridade: form.prioridade,
      data_agendada: dataIso,
      valor,
      descricao: form.descricao.trim(),
    };

    setSalvando(true);
    try {
      const { chamado, avisos } = id ? await api.atualizarChamado(id, dados) : await api.criarChamado(dados);
      if (avisos?.length) avisar(`Chamado #${chamado.id} salvo com avisos`, avisos.join('\n\n'));
      navigation.goBack();
    } catch (e) {
      setErros(e.campos);
      setErroGeral(e.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <Carregando />;

  if (clientes && clientes.length === 0) {
    return (
      <Vazio
        icone="people-outline"
        titulo="Cadastre um cliente primeiro"
        texto="Todo chamado precisa estar ligado a um cliente."
        acao="Cadastrar cliente"
        onAcao={() => navigation.replace('ClienteForm')}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Mensagem texto={erroGeral} />

        <Text style={styles.rotulo}>CLIENTE</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Selecionar cliente"
          onPress={() => setSeletorAberto(true)}
          style={[styles.seletor, erros.cliente_id && { borderColor: cores.perigo }]}
        >
          <Text style={clienteSelecionado ? styles.seletorTexto : styles.seletorPlaceholder}>
            {clienteSelecionado ? `${clienteSelecionado.nome} · ${clienteSelecionado.cidade}/${clienteSelecionado.uf}` : 'Toque para escolher'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={cores.textoSuave} />
        </Pressable>
        {erros.cliente_id ? <Text style={styles.erro}>{erros.cliente_id}</Text> : <View style={{ height: espaco.md }} />}

        <Opcoes rotulo="Tipo de serviço" opcoes={OPCOES_TIPO} valor={form.tipo} onChange={alterar('tipo')} erro={erros.tipo} />
        <Opcoes rotulo="Prioridade" opcoes={OPCOES_PRIORIDADE} valor={form.prioridade} onChange={alterar('prioridade')} erro={erros.prioridade} />

        <Text style={styles.rotulo}>DATA DO ATENDIMENTO</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Escolher a data do atendimento"
          onPress={() => setCalendarioAberto(true)}
          style={[styles.seletor, erros.data_agendada && { borderColor: cores.perigo }]}
        >
          <Text style={form.data_agendada ? styles.seletorTexto : styles.seletorPlaceholder}>
            {form.data_agendada ? `${diaCurto(form.data_agendada)}, ${isoParaBr(form.data_agendada)}` : 'Toque para escolher no calendário'}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={cores.primaria} />
        </Pressable>
        {erros.data_agendada ? <Text style={styles.erro}>{erros.data_agendada}</Text> : <View style={{ height: espaco.md }} />}

        <Campo
          rotulo="Valor (R$)"
          value={form.valor}
          onChangeText={(v) => alterar('valor')(v.replace(/[^\d,]/g, ''))}
          erro={erros.valor}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />

        <Campo
          rotulo="Descrição do serviço"
          value={form.descricao}
          onChangeText={alterar('descricao')}
          erro={erros.descricao}
          multiline
          placeholder="Ex.: split 12.000 BTUs não está gelando"
        />

        <Text style={styles.ajuda}>
          A agenda não aceita datas passadas, domingos, feriados nacionais nem dias com a equipe lotada.
        </Text>

        <Botao titulo={id ? 'Salvar alterações' : 'Abrir chamado'} onPress={salvar} carregando={salvando} style={{ marginTop: espaco.md }} />
      </ScrollView>

      <Modal visible={calendarioAberto} transparent animationType="fade" onRequestClose={() => setCalendarioAberto(false)}>
        <View style={styles.fundoEscuro}>
          <View style={styles.janelaCalendario}>
            <View style={styles.modalTopo}>
              <Text style={styles.modalTitulo}>Data do atendimento</Text>
              <Pressable onPress={() => setCalendarioAberto(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar calendário">
                <Ionicons name="close" size={26} color={cores.texto} />
              </Pressable>
            </View>
            <Calendario
              valor={form.data_agendada}
              onSelecionar={(iso) => {
                alterar('data_agendada')(iso);
                setErros((e) => ({ ...e, data_agendada: undefined }));
                setCalendarioAberto(false);
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={seletorAberto} animationType="slide" onRequestClose={() => setSeletorAberto(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalTopo}>
            <Text style={styles.modalTitulo}>Escolha o cliente</Text>
            <Pressable onPress={() => setSeletorAberto(false)} hitSlop={10} accessibilityLabel="Fechar">
              <Ionicons name="close" size={26} color={cores.texto} />
            </Pressable>
          </View>
          <Campo value={buscaCliente} onChangeText={setBuscaCliente} placeholder="Buscar por nome ou cidade" style={{ marginHorizontal: espaco.lg }} />
          <FlatList
            data={clientesFiltrados}
            keyExtractor={(c) => String(c.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: espaco.lg, paddingBottom: espaco.xl }}
            ListEmptyComponent={<Text style={styles.ajuda}>Nenhum cliente encontrado.</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.opcaoCliente, item.id === form.cliente_id && styles.opcaoClienteAtiva]}
                onPress={() => {
                  alterar('cliente_id')(item.id);
                  setErros((e) => ({ ...e, cliente_id: undefined }));
                  setSeletorAberto(false);
                }}
              >
                <Text style={styles.seletorTexto}>{item.nome}</Text>
                <Text style={styles.ajuda}>{item.bairro} · {item.cidade}/{item.uf}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.lg, paddingBottom: espaco.xl * 2 },
  rotulo: { fontSize: fonte.pequena, fontWeight: '600', color: cores.textoSuave, marginBottom: espaco.xs },
  seletor: {
    minHeight: 48,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seletorTexto: { fontSize: fonte.corpo, color: cores.texto, fontWeight: '500', flexShrink: 1 },
  seletorPlaceholder: { fontSize: fonte.corpo, color: cores.textoSuave },
  erro: { color: cores.perigo, fontSize: fonte.pequena, marginTop: espaco.xs, marginBottom: espaco.md },
  fundoEscuro: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', padding: espaco.lg },
  janelaCalendario: { backgroundColor: cores.superficie, borderRadius: raio.lg, width: '100%', maxWidth: 420, alignSelf: 'center', overflow: 'hidden' },
  ajuda: { color: cores.textoSuave, fontSize: 13 },
  modal: { flex: 1, backgroundColor: cores.fundo },
  modalTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: espaco.lg },
  modalTitulo: { fontSize: fonte.titulo, fontWeight: '800', color: cores.texto },
  opcaoCliente: {
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    padding: espaco.md,
    marginBottom: espaco.sm,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  opcaoClienteAtiva: { borderColor: cores.primaria, backgroundColor: cores.primariaClara },
});
