import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Botao, Cartao, Carregando, Mensagem, Selo } from '../components/ui';
import { api } from '../services/api';
import { avisar, confirmar } from '../utils/dialogo';
import { isoParaBr, mascaraTelefone, moeda } from '../utils/formatacao';
import { cores, espaco, fonte, PRIORIDADES, STATUS, TIPOS } from '../theme';

const ACOES_STATUS = {
  em_andamento: { titulo: 'Iniciar atendimento', icone: 'play-outline', variante: 'primario' },
  concluido: { titulo: 'Concluir serviço', icone: 'checkmark-done-outline', variante: 'sucesso' },
  cancelado: { titulo: 'Cancelar chamado', icone: 'close-circle-outline', variante: 'perigo' },
};

function Linha({ icone, texto }) {
  return (
    <View style={styles.linha}>
      <Ionicons name={icone} size={18} color={cores.textoSuave} />
      <Text style={styles.linhaTexto}>{texto}</Text>
    </View>
  );
}

export default function ChamadoDetalheScreen({ navigation, route }) {
  const { id } = route.params;
  const [chamado, setChamado] = useState(null);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState('');

  const carregar = useCallback(async () => {
    try {
      setErro('');
      const dados = await api.obterChamado(id);
      setChamado(dados);
      navigation.setOptions({ title: `Chamado #${dados.id}` });
    } catch (e) {
      setErro(e.message);
    }
  }, [id, navigation]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  async function mudarStatus(novo) {
    if (novo === 'cancelado') {
      const ok = await confirmar('Cancelar chamado', 'O chamado será marcado como cancelado e não poderá mais ser editado.', 'Cancelar chamado', true);
      if (!ok) return;
    }
    if (novo === 'concluido') {
      const ok = await confirmar('Concluir serviço', `Confirmar a conclusão? O valor de ${moeda(chamado.valor)} entra no faturamento do mês.`, 'Concluir');
      if (!ok) return;
    }
    setProcessando(novo);
    try {
      await api.alterarStatus(id, novo);
      await carregar();
    } catch (e) {
      avisar('Não foi possível mudar o status', e.message);
    } finally {
      setProcessando('');
    }
  }

  async function excluir() {
    const ok = await confirmar('Excluir chamado', 'Esta ação não pode ser desfeita.', 'Excluir', true);
    if (!ok) return;
    setProcessando('excluir');
    try {
      await api.excluirChamado(id);
      navigation.goBack();
    } catch (e) {
      avisar('Não foi possível excluir', e.message);
      setProcessando('');
    }
  }

  if (!chamado) {
    return erro ? (
      <View style={styles.tela}>
        <View style={{ padding: espaco.lg }}>
          <Mensagem texto={erro} acao="Tentar de novo" onAcao={carregar} />
        </View>
      </View>
    ) : (
      <Carregando />
    );
  }

  const s = STATUS[chamado.status];
  const editavel = !['concluido', 'cancelado'].includes(chamado.status);
  const endereco = `${chamado.cliente_logradouro}, ${chamado.cliente_numero} - ${chamado.cliente_bairro}, ${chamado.cliente_cidade}/${chamado.cliente_uf}`;

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Mensagem texto={erro} />
      <Cartao style={styles.secao}>
        <View style={styles.topo}>
          <Selo texto={s.rotulo} cor={s.cor} fundo={s.fundo} />
          <Text style={[styles.prioridade, { color: PRIORIDADES[chamado.prioridade].cor }]}>
            Prioridade {PRIORIDADES[chamado.prioridade].rotulo.toLowerCase()}
          </Text>
        </View>
        <Text style={styles.titulo}>{TIPOS[chamado.tipo].rotulo}</Text>
        <Text style={styles.descricao}>{chamado.descricao}</Text>
        <Linha icone="calendar-outline" texto={`Agendado para ${isoParaBr(chamado.data_agendada)}`} />
        <Linha icone="cash-outline" texto={moeda(chamado.valor)} />
        {chamado.concluido_em ? <Linha icone="checkmark-circle-outline" texto={`Concluído em ${isoParaBr(chamado.concluido_em)}`} /> : null}
      </Cartao>

      <Cartao style={styles.secao}>
        <Text style={styles.secaoTitulo}>Cliente</Text>
        <Text style={styles.cliente}>{chamado.cliente_nome}</Text>
        <Linha icone="location-outline" texto={endereco} />
        <Linha icone="call-outline" texto={mascaraTelefone(chamado.cliente_telefone)} />
        <Botao
          titulo="Ligar para o cliente"
          icone="call-outline"
          variante="secundario"
          compacto
          onPress={() => Linking.openURL(`tel:${chamado.cliente_telefone}`)}
        />
      </Cartao>

      <Cartao style={styles.secao}>
        <Text style={styles.secaoTitulo}>Tempo no dia do atendimento</Text>
        {chamado.previsao ? (
          <>
            <Linha
              icone={chamado.previsao.chanceChuva >= 60 ? 'rainy-outline' : 'partly-sunny-outline'}
              texto={`Máx ${Math.round(chamado.previsao.maxima)}°C · mín ${Math.round(chamado.previsao.minima)}°C · chuva ${chamado.previsao.chanceChuva ?? '-'}%`}
            />
            {chamado.tipo === 'instalacao' && chamado.previsao.chanceChuva >= 70 ? (
              <Mensagem tipo="alerta" texto="Alta chance de chuva: avalie remarcar a instalação da condensadora." />
            ) : null}
          </>
        ) : (
          <Text style={styles.suave}>Previsão disponível apenas para os próximos 16 dias.</Text>
        )}
      </Cartao>

      <View style={styles.acoes}>
        {chamado.proximos_status.map((st) => (
          <Botao
            key={st}
            titulo={ACOES_STATUS[st].titulo}
            icone={ACOES_STATUS[st].icone}
            variante={ACOES_STATUS[st].variante}
            carregando={processando === st}
            desabilitado={!!processando}
            onPress={() => mudarStatus(st)}
          />
        ))}
        {editavel ? (
          <Botao
            titulo="Editar chamado"
            icone="create-outline"
            variante="secundario"
            desabilitado={!!processando}
            onPress={() => navigation.navigate('ChamadoForm', { id: chamado.id })}
          />
        ) : null}
        {chamado.status !== 'concluido' ? (
          <Botao
            titulo="Excluir chamado"
            icone="trash-outline"
            variante="perigo"
            carregando={processando === 'excluir'}
            desabilitado={!!processando}
            onPress={excluir}
          />
        ) : (
          <Text style={styles.suave}>Chamados concluídos fazem parte do faturamento e não podem ser excluídos.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.lg, paddingBottom: espaco.xl * 2 },
  secao: { marginBottom: espaco.md, gap: espaco.sm },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prioridade: { fontWeight: '700', fontSize: 13 },
  titulo: { fontSize: fonte.titulo, fontWeight: '800', color: cores.texto },
  descricao: { fontSize: fonte.corpo, color: cores.texto },
  secaoTitulo: { fontSize: fonte.media, fontWeight: '700', color: cores.texto },
  cliente: { fontSize: 16, fontWeight: '600', color: cores.texto },
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.sm },
  linhaTexto: { flex: 1, color: cores.texto },
  suave: { color: cores.textoSuave, fontSize: 13 },
  acoes: { gap: espaco.md },
});
