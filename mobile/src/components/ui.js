import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores, espaco, fonte, raio } from '../theme';

export function Botao({ titulo, onPress, variante = 'primario', icone, carregando = false, desabilitado = false, compacto = false, style }) {
  const estilo = estilosBotao[variante];
  const inativo = desabilitado || carregando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: carregando }}
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        styles.botao,
        compacto && styles.botaoCompacto,
        { backgroundColor: estilo.fundo, borderColor: estilo.borda },
        pressed && { opacity: 0.8 },
        inativo && { opacity: 0.55 },
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={estilo.texto} />
      ) : (
        <>
          {icone ? <Ionicons name={icone} size={18} color={estilo.texto} /> : null}
          <Text style={[styles.botaoTexto, { color: estilo.texto }]}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

const estilosBotao = {
  primario: { fundo: cores.primaria, borda: cores.primaria, texto: '#FFFFFF' },
  secundario: { fundo: cores.superficie, borda: cores.borda, texto: cores.texto },
  perigo: { fundo: cores.superficie, borda: cores.perigo, texto: cores.perigo },
  sucesso: { fundo: cores.sucesso, borda: cores.sucesso, texto: '#FFFFFF' },
};

export const Campo = forwardRef(function Campo({ rotulo, erro, ajuda, acao, style, multiline, ...props }, ref) {
  return (
    <View style={[styles.campo, style]}>
      {rotulo ? <Text style={styles.rotulo}>{rotulo}</Text> : null}
      <View style={styles.linhaCampo}>
        <TextInput
          ref={ref}
          placeholderTextColor={cores.textoSuave}
          style={[styles.input, multiline && styles.inputMultilinha, erro && styles.inputErro]}
          multiline={multiline}
          accessibilityLabel={rotulo}
          {...props}
        />
        {acao}
      </View>
      {erro ? <Text style={styles.erroTexto}>{erro}</Text> : ajuda ? <Text style={styles.ajuda}>{ajuda}</Text> : null}
    </View>
  );
});

export function Cartao({ children, style, onPress }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.cartao, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.cartao, style]}>{children}</View>;
}

export function Selo({ texto, cor, fundo }) {
  return (
    <View style={[styles.selo, { backgroundColor: fundo }]}>
      <Text style={[styles.seloTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

export function Opcoes({ rotulo, opcoes, valor, onChange, erro }) {
  return (
    <View style={styles.campo}>
      {rotulo ? <Text style={styles.rotulo}>{rotulo}</Text> : null}
      <View style={styles.opcoes}>
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <Pressable
              key={o.valor}
              accessibilityRole="radio"
              accessibilityState={{ checked: ativo }}
              onPress={() => onChange(o.valor)}
              style={[styles.opcao, ativo && styles.opcaoAtiva]}
            >
              <Text style={[styles.opcaoTexto, ativo && styles.opcaoTextoAtivo]}>{o.rotulo}</Text>
            </Pressable>
          );
        })}
      </View>
      {erro ? <Text style={styles.erroTexto}>{erro}</Text> : null}
    </View>
  );
}

export function Mensagem({ tipo = 'erro', texto, acao, onAcao }) {
  if (!texto) return null;
  const paleta = {
    erro: { fundo: cores.perigoClaro, cor: cores.perigo, icone: 'alert-circle-outline' },
    alerta: { fundo: cores.alertaClaro, cor: cores.alerta, icone: 'warning-outline' },
    info: { fundo: cores.primariaClara, cor: cores.primariaEscura, icone: 'information-circle-outline' },
  }[tipo];
  return (
    <View style={[styles.mensagem, { backgroundColor: paleta.fundo }]} accessibilityLiveRegion="polite">
      <Ionicons name={paleta.icone} size={20} color={paleta.cor} />
      <Text style={[styles.mensagemTexto, { color: paleta.cor }]}>{texto}</Text>
      {acao ? (
        <Pressable onPress={onAcao} hitSlop={8}>
          <Text style={[styles.mensagemAcao, { color: paleta.cor }]}>{acao}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Carregando({ texto = 'Carregando...' }) {
  return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color={cores.primaria} />
      <Text style={styles.ajuda}>{texto}</Text>
    </View>
  );
}

export function Vazio({ icone = 'file-tray-outline', titulo, texto, acao, onAcao }) {
  return (
    <View style={styles.centro}>
      <Ionicons name={icone} size={44} color={cores.textoSuave} />
      <Text style={styles.vazioTitulo}>{titulo}</Text>
      {texto ? <Text style={[styles.ajuda, { textAlign: 'center' }]}>{texto}</Text> : null}
      {acao ? <Botao titulo={acao} onPress={onAcao} compacto style={{ marginTop: espaco.md }} /> : null}
    </View>
  );
}

export function BotaoFlutuante({ onPress, rotulo }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name="add" size={28} color="#FFFFFF" />
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  botao: {
    minHeight: 48,
    borderRadius: raio.md,
    borderWidth: 1,
    paddingHorizontal: espaco.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.sm,
  },
  botaoCompacto: { minHeight: 40, paddingHorizontal: espaco.md },
  botaoTexto: { fontSize: fonte.corpo, fontWeight: '600' },
  campo: { marginBottom: espaco.md },
  rotulo: { fontSize: fonte.pequena, fontWeight: '600', color: cores.textoSuave, marginBottom: espaco.xs, textTransform: 'uppercase' },
  linhaCampo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  input: {
    flex: 1,
    minHeight: 48,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: fonte.corpo,
    color: cores.texto,
  },
  inputMultilinha: { minHeight: 96, paddingTop: espaco.md, textAlignVertical: 'top' },
  inputErro: { borderColor: cores.perigo },
  erroTexto: { color: cores.perigo, fontSize: fonte.pequena, marginTop: espaco.xs },
  ajuda: { color: cores.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
    padding: espaco.lg,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  selo: { borderRadius: raio.pilula, paddingHorizontal: espaco.sm, paddingVertical: 3, alignSelf: 'flex-start' },
  seloTexto: { fontSize: fonte.pequena, fontWeight: '700' },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  opcao: {
    paddingHorizontal: espaco.md,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: raio.pilula,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  opcaoAtiva: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  opcaoTexto: { color: cores.texto, fontSize: 14, fontWeight: '500' },
  opcaoTextoAtivo: { color: '#FFFFFF' },
  mensagem: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, padding: espaco.md, borderRadius: raio.md, marginBottom: espaco.md },
  mensagemTexto: { flex: 1, fontSize: 14 },
  mensagemAcao: { fontWeight: '700', fontSize: 14 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl, gap: espaco.sm },
  vazioTitulo: { fontSize: fonte.media, fontWeight: '600', color: cores.texto },
  fab: {
    position: 'absolute',
    right: espaco.lg,
    bottom: espaco.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
