import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BotaoFlutuante, Campo, Cartao, Carregando, Mensagem, Selo, Vazio } from '../components/ui';
import { api } from '../services/api';
import { mascaraTelefone } from '../utils/formatacao';
import { cores, espaco } from '../theme';

export default function ClientesScreen({ navigation }) {
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState(null);
  const [erro, setErro] = useState('');
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setErro('');
      setClientes(await api.listarClientes(busca.trim()));
    } catch (e) {
      setErro(e.message);
    }
  }, [busca]);

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

  return (
    <View style={styles.tela}>
      <View style={styles.topo}>
        <Campo
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome, cidade, telefone ou documento"
          returnKeyType="search"
          accessibilityLabel="Buscar clientes"
          style={{ marginBottom: 0 }}
        />
      </View>
      <View style={{ paddingHorizontal: espaco.lg }}>
        <Mensagem texto={erro} acao="Tentar de novo" onAcao={carregar} />
      </View>

      {clientes === null && !erro ? (
        <Carregando />
      ) : (
        <FlatList
          data={clientes || []}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[cores.primaria]} />}
          ListEmptyComponent={
            <Vazio
              icone="people-outline"
              titulo={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              acao="Cadastrar cliente"
              onAcao={() => navigation.navigate('ClienteForm')}
            />
          }
          renderItem={({ item }) => (
            <Cartao style={styles.item} onPress={() => navigation.navigate('ClienteForm', { id: item.id })}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTexto}>{item.nome.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.nome}>{item.nome}</Text>
                <View style={styles.meta}>
                  <Ionicons name="location-outline" size={14} color={cores.textoSuave} />
                  <Text style={styles.metaTexto}>{item.bairro} · {item.cidade}/{item.uf}</Text>
                </View>
                <View style={styles.meta}>
                  <Ionicons name="call-outline" size={14} color={cores.textoSuave} />
                  <Text style={styles.metaTexto}>{mascaraTelefone(item.telefone)}</Text>
                </View>
              </View>
              {item.chamados_ativos > 0 ? (
                <Selo texto={`${item.chamados_ativos} ativo(s)`} cor={cores.primaria} fundo={cores.primariaClara} />
              ) : null}
            </Cartao>
          )}
        />
      )}

      <BotaoFlutuante rotulo="Novo cliente" onPress={() => navigation.navigate('ClienteForm')} />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: { padding: espaco.lg, paddingBottom: espaco.sm },
  lista: { padding: espaco.lg, paddingBottom: 96, gap: espaco.md, flexGrow: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: cores.primariaClara, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: cores.primariaEscura, fontWeight: '800', fontSize: 18 },
  nome: { fontSize: 16, fontWeight: '700', color: cores.texto },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTexto: { color: cores.textoSuave, fontSize: 13, flexShrink: 1 },
});
