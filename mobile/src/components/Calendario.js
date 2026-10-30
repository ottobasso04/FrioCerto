import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { cores, espaco, fonte, raio } from '../theme';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const doisDigitos = (n) => String(n).padStart(2, '0');
const paraIso = (ano, mes, dia) => `${ano}-${doisDigitos(mes + 1)}-${doisDigitos(dia)}`;

export function hojeIso() {
  const d = new Date();
  return paraIso(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function Calendario({ valor, onSelecionar }) {
  const hoje = hojeIso();
  const inicial = valor && valor >= hoje ? valor : hoje;
  const [ano, setAno] = useState(Number(inicial.slice(0, 4)));
  const [mes, setMes] = useState(Number(inicial.slice(5, 7)) - 1);
  const [feriados, setFeriados] = useState({});
  const anosCarregados = useRef(new Set());

  useEffect(() => {
    if (anosCarregados.current.has(ano)) return;
    anosCarregados.current.add(ano);
    api
      .listarFeriados(ano)
      .then((lista) => {
        setFeriados((atual) => ({ ...atual, ...Object.fromEntries(lista.map((f) => [f.data, f.nome])) }));
      })
      .catch(() => {
        anosCarregados.current.delete(ano);
      });
  }, [ano]);

  const semanas = useMemo(() => {
    const primeiroDiaDaSemana = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const celulas = [...Array(primeiroDiaDaSemana).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];
    while (celulas.length % 7) celulas.push(null);
    const linhas = [];
    for (let i = 0; i < celulas.length; i += 7) linhas.push(celulas.slice(i, i + 7));
    return linhas;
  }, [ano, mes]);

  const noMesAtual = ano === Number(hoje.slice(0, 4)) && mes === Number(hoje.slice(5, 7)) - 1;
  const prefixoDoMes = `${ano}-${doisDigitos(mes + 1)}`;
  const feriadosDoMes = Object.entries(feriados)
    .filter(([data]) => data.startsWith(prefixoDoMes))
    .sort(([a], [b]) => a.localeCompare(b));

  function mudarMes(delta) {
    const d = new Date(ano, mes + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth());
  }

  return (
    <View style={styles.calendario}>
      <View style={styles.cabecalho}>
        <Pressable
          onPress={() => mudarMes(-1)}
          disabled={noMesAtual}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          style={[styles.seta, noMesAtual && { opacity: 0.3 }]}
        >
          <Ionicons name="chevron-back" size={22} color={cores.primaria} />
        </Pressable>
        <Text style={styles.titulo}>
          {MESES[mes]} de {ano}
        </Text>
        <Pressable onPress={() => mudarMes(1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Próximo mês" style={styles.seta}>
          <Ionicons name="chevron-forward" size={22} color={cores.primaria} />
        </Pressable>
      </View>

      <View style={styles.linha}>
        {DIAS_SEMANA.map((d, i) => (
          <View key={`semana-${i}`} style={styles.celula}>
            <Text style={[styles.diaSemana, i === 0 && { color: cores.perigo }]}>{d}</Text>
          </View>
        ))}
      </View>

      {semanas.map((semana, s) => (
        <View key={`linha-${s}`} style={styles.linha}>
          {semana.map((dia, i) => {
            if (!dia) return <View key={`vazio-${s}-${i}`} style={styles.celula} />;
            const iso = paraIso(ano, mes, dia);
            const feriado = feriados[iso];
            const bloqueado = iso < hoje || i === 0 || Boolean(feriado);
            const selecionado = iso === valor;
            const ehHoje = iso === hoje;
            return (
              <View key={iso} style={styles.celula}>
                <Pressable
                  disabled={bloqueado}
                  onPress={() => onSelecionar(iso)}
                  accessibilityRole="button"
                  accessibilityLabel={`${dia} de ${MESES[mes]}${feriado ? `, feriado: ${feriado}` : ''}`}
                  accessibilityState={{ disabled: bloqueado, selected: selecionado }}
                  style={({ pressed }) => [
                    styles.dia,
                    ehHoje && styles.diaHoje,
                    selecionado && styles.diaSelecionado,
                    pressed && !bloqueado && !selecionado && styles.diaPressionado,
                  ]}
                >
                  <Text style={[styles.diaTexto, bloqueado && styles.diaBloqueado, selecionado && styles.diaTextoSelecionado]}>{dia}</Text>
                  {feriado ? <View style={styles.pontoFeriado} /> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}

      <Text style={styles.legenda}>Dias em cinza não aceitam agendamento: datas passadas, domingos e feriados nacionais.</Text>
      {feriadosDoMes.map(([data, nome]) => (
        <View key={data} style={styles.feriado}>
          <View style={styles.pontoFeriadoLegenda} />
          <Text style={styles.feriadoTexto}>
            {data.slice(8, 10)}/{data.slice(5, 7)} · {nome}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calendario: { backgroundColor: cores.superficie, borderRadius: raio.lg, padding: espaco.md },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espaco.sm },
  seta: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: fonte.media, fontWeight: '700', color: cores.texto },
  linha: { flexDirection: 'row' },
  celula: { width: '14.2857%', alignItems: 'center', paddingVertical: 2 },
  diaSemana: { fontSize: fonte.pequena, fontWeight: '700', color: cores.textoSuave, paddingVertical: espaco.xs },
  dia: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  diaHoje: { borderWidth: 1, borderColor: cores.primaria },
  diaSelecionado: { backgroundColor: cores.primaria },
  diaPressionado: { backgroundColor: cores.primariaClara },
  diaTexto: { fontSize: fonte.corpo, color: cores.texto, fontWeight: '500' },
  diaBloqueado: { color: cores.borda },
  diaTextoSelecionado: { color: '#FFFFFF', fontWeight: '700' },
  pontoFeriado: { position: 'absolute', bottom: 5, width: 5, height: 5, borderRadius: 3, backgroundColor: cores.perigo },
  legenda: { fontSize: fonte.pequena, color: cores.textoSuave, marginTop: espaco.md },
  feriado: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, marginTop: espaco.xs },
  pontoFeriadoLegenda: { width: 6, height: 6, borderRadius: 3, backgroundColor: cores.perigo },
  feriadoTexto: { fontSize: fonte.pequena, color: cores.texto },
});
