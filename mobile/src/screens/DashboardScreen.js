import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Cartao, Carregando, Mensagem, Selo } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { diaCurto, isoParaBr, moeda } from '../utils/formatacao';
import { cores, espaco, fonte, PRIORIDADES, raio, STATUS, TIPOS } from '../theme';

function Indicador({ titulo, valor, icone, cor = cores.primaria, onPress }) {
  return (
    <Cartao style={styles.indicador} onPress={onPress}>
      <Ionicons name={icone} size={20} color={cor} />
      <Text style={styles.indicadorValor}>{valor}</Text>
      <Text style={styles.indicadorTitulo}>{titulo}</Text>
    </Cartao>
  );
}

export default function DashboardScreen({ navigation }) {
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setErro('');
      setDados(await api.dashboard());
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  async function atualizar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  if (!dados && !erro) return <Carregando texto="Montando o painel..." />;

  const irParaChamados = (status) => navigation.navigate('Chamados', { status });
  const maiorTipo = Math.max(1, ...(dados?.por_tipo || []).map((t) => t.total));

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[cores.primaria]} />}
    >
      <Text style={styles.ola}>Olá, {usuario?.nome?.split(' ')[0]}</Text>
      <Mensagem texto={erro} acao="Tentar de novo" onAcao={carregar} />

      {dados ? (
        <>
          <Text style={styles.data}>{isoParaBr(dados.data)}</Text>

          <View style={styles.grade}>
            <Indicador titulo="Abertos" valor={dados.chamados.abertos} icone="folder-open-outline" onPress={() => irParaChamados('aberto')} />
            <Indicador titulo="Em andamento" valor={dados.chamados.em_andamento} icone="time-outline" cor={cores.alerta} onPress={() => irParaChamados('em_andamento')} />
            <Indicador titulo="Hoje" valor={dados.chamados.hoje} icone="today-outline" />
            <Indicador titulo="Atrasados" valor={dados.chamados.atrasados} icone="alert-circle-outline" cor={dados.chamados.atrasados ? cores.perigo : cores.textoSuave} />
          </View>

          <Cartao style={styles.secao}>
            <Text style={styles.secaoTitulo}>Faturamento do mês</Text>
            <Text style={styles.destaque}>{moeda(dados.faturamento_mes)}</Text>
            <Text style={styles.suave}>
              {dados.concluidos_mes} serviço(s) concluído(s) · ticket médio {moeda(dados.ticket_medio_mes)}
            </Text>
            <Text style={styles.suave}>
              {dados.chamados.proximos_7_dias} atendimento(s) nos próximos 7 dias · {dados.clientes} cliente(s)
            </Text>
          </Cartao>

          <Cartao style={styles.secao}>
            <Text style={styles.secaoTitulo}>
              Previsão {dados.externo.previsao ? `· ${dados.externo.previsao.cidade}/${dados.externo.previsao.uf}` : ''}
            </Text>
            {dados.externo.previsao ? (
              <>
                <View style={styles.clima}>
                  {dados.externo.previsao.dias.map((d) => (
                    <View key={d.data} style={styles.climaDia}>
                      <Text style={styles.suave}>{diaCurto(d.data)}</Text>
                      <Ionicons
                        name={d.chanceChuva >= 60 ? 'rainy-outline' : d.maxima >= 30 ? 'sunny-outline' : 'partly-sunny-outline'}
                        size={22}
                        color={d.chanceChuva >= 60 ? cores.primaria : cores.alerta}
                      />
                      <Text style={styles.climaTemp}>{Math.round(d.maxima)}°</Text>
                      <Text style={styles.suave}>{d.chanceChuva ?? '-'}%</Text>
                    </View>
                  ))}
                </View>
                {dados.externo.previsao.alerta ? <Mensagem tipo="alerta" texto={dados.externo.previsao.alerta} /> : null}
              </>
            ) : (
              <Text style={styles.suave}>Previsão indisponível no momento.</Text>
            )}
            {dados.externo.proximo_feriado ? (
              <Text style={styles.suave}>
                Próximo feriado: {dados.externo.proximo_feriado.nome} ({isoParaBr(dados.externo.proximo_feriado.data)}) — sem agendamentos.
              </Text>
            ) : null}
          </Cartao>

          <Cartao style={styles.secao}>
            <Text style={styles.secaoTitulo}>Agenda de hoje</Text>
            {dados.agenda_hoje.length === 0 ? (
              <Text style={styles.suave}>Nenhum atendimento para hoje.</Text>
            ) : (
              dados.agenda_hoje.map((c) => (
                <Cartao key={c.id} style={styles.itemAgenda} onPress={() => navigation.navigate('ChamadoDetalhe', { id: c.id })}>
                  <View style={[styles.ponto, { backgroundColor: PRIORIDADES[c.prioridade].cor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitulo}>{c.cliente_nome}</Text>
                    <Text style={styles.suave}>{TIPOS[c.tipo].rotulo} · {c.cliente_bairro}</Text>
                  </View>
                  <Selo texto={STATUS[c.status].rotulo} cor={STATUS[c.status].cor} fundo={STATUS[c.status].fundo} />
                </Cartao>
              ))
            )}
            <Text style={styles.suave}>Capacidade da equipe: {dados.capacidade_diaria} atendimentos por dia.</Text>
          </Cartao>

          <Cartao style={styles.secao}>
            <Text style={styles.secaoTitulo}>Serviços por tipo</Text>
            {dados.por_tipo.map((t) => (
              <View key={t.tipo} style={styles.barraLinha}>
                <Text style={styles.barraRotulo}>{TIPOS[t.tipo].rotulo}</Text>
                <View style={styles.barraTrilho}>
                  <View style={[styles.barra, { width: `${(t.total / maiorTipo) * 100}%` }]} />
                </View>
                <Text style={styles.barraValor}>{t.total}</Text>
              </View>
            ))}
          </Cartao>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.lg, paddingBottom: espaco.xl * 2 },
  ola: { fontSize: fonte.titulo, fontWeight: '800', color: cores.texto },
  data: { color: cores.textoSuave, marginBottom: espaco.md },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md, marginBottom: espaco.md },
  indicador: { width: '47%', flexGrow: 1, gap: 2 },
  indicadorValor: { fontSize: fonte.destaque, fontWeight: '800', color: cores.texto },
  indicadorTitulo: { color: cores.textoSuave, fontSize: 13 },
  secao: { marginBottom: espaco.md, gap: espaco.sm },
  secaoTitulo: { fontSize: fonte.media, fontWeight: '700', color: cores.texto },
  destaque: { fontSize: fonte.destaque, fontWeight: '800', color: cores.sucesso },
  suave: { color: cores.textoSuave, fontSize: 13 },
  clima: { flexDirection: 'row', justifyContent: 'space-between' },
  climaDia: { alignItems: 'center', gap: 2, flex: 1 },
  climaTemp: { fontWeight: '700', color: cores.texto },
  itemAgenda: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, padding: espaco.md },
  itemTitulo: { fontWeight: '600', color: cores.texto },
  ponto: { width: 10, height: 10, borderRadius: 5 },
  barraLinha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  barraRotulo: { width: 92, color: cores.texto, fontSize: 13 },
  barraTrilho: { flex: 1, height: 10, backgroundColor: cores.fundo, borderRadius: raio.pilula, overflow: 'hidden' },
  barra: { height: 10, backgroundColor: cores.primaria, borderRadius: raio.pilula },
  barraValor: { width: 28, textAlign: 'right', fontWeight: '700', color: cores.texto },
});
