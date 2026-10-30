import { Component } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { cores, espaco, fonte, raio } from '../theme';

export default class LimiteDeErro extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error('Erro na interface do FrioCerto:', erro, info?.componentStack);
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;
    return (
      <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
        <Text style={styles.titulo}>Algo deu errado ao abrir esta tela</Text>
        <Text style={styles.texto}>Copie a mensagem abaixo para investigar o problema.</Text>
        <Text style={styles.erro} selectable>
          {String(erro?.message || erro)}
        </Text>
        <Pressable style={styles.botao} onPress={() => this.setState({ erro: null })} accessibilityRole="button">
          <Text style={styles.botaoTexto}>Tentar de novo</Text>
        </Pressable>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.xl, gap: espaco.md },
  titulo: { fontSize: fonte.titulo, fontWeight: '800', color: cores.texto },
  texto: { fontSize: fonte.corpo, color: cores.textoSuave },
  erro: { fontFamily: 'monospace', fontSize: 13, color: cores.perigo, backgroundColor: cores.perigoClaro, padding: espaco.md, borderRadius: raio.md },
  botao: { alignSelf: 'flex-start', backgroundColor: cores.primaria, paddingHorizontal: espaco.lg, paddingVertical: espaco.md, borderRadius: raio.md },
  botaoTexto: { color: '#FFFFFF', fontWeight: '600' },
});
