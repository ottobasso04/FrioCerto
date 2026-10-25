import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BotaoFlutuante, Campo, Cartao, Carregando, Mensagem, Opcoes, Selo, Vazio } from '../components/ui';
import { api } from '../services/api';
import { isoParaBr, moeda } from '../utils/formatacao';
import { cores, espaco, PRIORIDADES, STATUS, TIPOS } from '../theme';

const FILTROS = [
  { valor: 'aberto,em_andamento', rotulo: 'Ativos' },
  { valor: 'aberto', rotulo: 'Abertos' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'concluido', rotulo: 'Concluídos' },
  { valor: 'cancelado', rotulo: 'Cancelados' },
  { valor: '', rotulo: 'Todos' },
];

export default function ChamadosScreen({ navigation, route }) {
  const [status, setStatus] = useState('aberto,em_andamento');
  const [busca, setBusca] = useState('');
  const [chamados, setChamados] = useState(null);
  const [erro, setErro] = useState('');
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    if (route.params?.status !== undefined) {
      setStatus(route.params.status);
      navigation.setParams({ status: undefined });
    }
  }, [route.params?.status, navigation]);

  const carregar = useCallback(async () => {
    try {
      setErro('');
      setChamados(await api.listarChamados({ status, busca: busca.trim() }));
    } catch (e) {
      setErro(e.message);
    }
  }, [status, busca]);

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(carregar, 250);
      return () => clearTimeout(t);
    }, [carregar]),
  );

  async function atualizar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  const renderItem = ({ item }) => {
    const s = STATUS[item.status];
    return (
      <Cartao style={styles.item} onPress={() => navigation.navigate('ChamadoDetalhe', { id: item.id })}>
        <View style={styles.itemTopo}>
          <Text style={styles.itemId}>#{item.id}</Text>
          <Selo texto={s.rotulo} cor={s.cor} fundo={s.fundo} />
        </View>
        <Text style={styles.itemTitulo}>{item.cliente_nome}</Text>
        <Text style={styles.itemDescricao} numberOfLines={2}>{item.descricao}</Text>
        <View style={styles.itemRodape}>
          <View style={styles.meta}>
            <Ionicons name={TIPOS[item.tipo].icone} size={14} color={cores.textoSuave} />
            <Text style={styles.metaTexto}>{TIPOS[item.tipo].rotulo}</Text>
          </View>
          <View style={styles.meta}>
            <Ionicons name="calendar-outline" size={14} color={cores.textoSuave} />
            <Text style={styles.metaTexto}>{isoParaBr(item.data_agendada)}</Text>
          </View>
          <View style={styles.meta}>
            <View style={[styles.ponto, { backgroundColor: PRIORIDADES[item.prioridade].cor }]} />
            <Text style={styles.metaTexto}>{PRIORIDADES[item.prioridade].rotulo}</Text>
          </View>
          <Text style={styles.valor}>{moeda(item.valor)}</Text>
        </View>
      </Cartao>
    );
  };

  return (
    <View style={styles.tela}>
      <View style={styles.topo}>
        <Campo
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por cliente, descrição ou nº"
          returnKeyType="search"
          accessibilityLabel="Buscar chamados"
          style={{ marginBottom: espaco.sm }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Opcoes opcoes={FILTROS} valor={status} onChange={setStatus} />
        </ScrollView>
      </View>

      <Mensagem texto={erro} acao="Tentar de novo" onAcao={carregar} />

      {chamados === null && !erro ? (
        <Carregando />
      ) : (
        <FlatList
          data={chamados || []}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[cores.primaria]} />}
          ListEmptyComponent={
            <Vazio
              icone="clipboard-outline"
              titulo="Nenhum chamado encontrado"
              texto="Ajuste os filtros ou abra um novo chamado."
              acao="Novo chamado"
              onAcao={() => navigation.navigate('ChamadoForm')}
            />
          }
        />
      )}

      <BotaoFlutuante rotulo="Novo chamado" onPress={() => navigation.navigate('ChamadoForm')} />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: { paddingHorizontal: espaco.lg, paddingTop: espaco.md },
  lista: { padding: espaco.lg, paddingBottom: 96, gap: espaco.md, flexGrow: 1 },
  item: { gap: espaco.xs },
  itemTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemId: { color: cores.textoSuave, fontWeight: '600' },
  itemTitulo: { fontSize: 16, fontWeight: '700', color: cores.texto },
  itemDescricao: { color: cores.textoSuave },
  itemRodape: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: espaco.md, marginTop: espaco.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTexto: { color: cores.textoSuave, fontSize: 13 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  valor: { marginLeft: 'auto', fontWeight: '700', color: cores.texto },
});
