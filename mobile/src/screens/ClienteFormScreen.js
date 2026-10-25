import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Botao, Campo, Cartao, Carregando, Mensagem, Selo } from '../components/ui';
import { api } from '../services/api';
import { avisar, confirmar } from '../utils/dialogo';
import { isoParaBr, mascaraCep, mascaraDocumento, mascaraTelefone, somenteDigitos } from '../utils/formatacao';
import { cnpjValido, cpfValido, emailValido } from '../utils/validacao';
import { cores, espaco, fonte, STATUS, TIPOS } from '../theme';

const VAZIO = { nome: '', documento: '', telefone: '', email: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' };
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

export default function ClienteFormScreen({ navigation, route }) {
  const id = route.params?.id;
  const [form, setForm] = useState(VAZIO);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(!!id);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [info, setInfo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const ultimoCep = useRef('');
  const numeroRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: id ? 'Editar cliente' : 'Novo cliente' });
    if (!id) return;
    (async () => {
      try {
        const c = await api.obterCliente(id);
        ultimoCep.current = c.cep;
        setForm({
          nome: c.nome,
          documento: mascaraDocumento(c.documento || ''),
          telefone: mascaraTelefone(c.telefone),
          email: c.email || '',
          cep: mascaraCep(c.cep),
          logradouro: c.logradouro,
          numero: c.numero,
          bairro: c.bairro,
          cidade: c.cidade,
          uf: c.uf,
        });
        setHistorico(c.chamados);
      } catch (e) {
        setErroGeral(e.message);
      } finally {
        setCarregando(false);
      }
    })();
  }, [id, navigation]);

  const alterar = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));

  async function buscarCep(cepDigitado) {
    const cep = somenteDigitos(cepDigitado);
    if (cep.length !== 8 || cep === ultimoCep.current) return;
    ultimoCep.current = cep;
    setBuscandoCep(true);
    setErros((e) => ({ ...e, cep: undefined }));
    try {
      const end = await api.consultarCep(cep);
      setForm((f) => ({
        ...f,
        logradouro: end.logradouro || f.logradouro,
        bairro: end.bairro || f.bairro,
        cidade: end.cidade,
        uf: end.uf,
      }));
      setInfo(end.logradouro ? 'Endereço preenchido pelo ViaCEP. Informe o número.' : 'CEP geral da cidade: complete logradouro e bairro.');
      numeroRef.current?.focus();
    } catch (e) {
      setErros((er) => ({ ...er, cep: e.message }));
    } finally {
      setBuscandoCep(false);
    }
  }

  async function buscarCnpj() {
    const cnpj = somenteDigitos(form.documento);
    if (!cnpjValido(cnpj)) {
      setErros((e) => ({ ...e, documento: 'Informe um CNPJ válido para buscar.' }));
      return;
    }
    setBuscandoCnpj(true);
    setErros((e) => ({ ...e, documento: undefined }));
    try {
      const d = await api.consultarCnpj(cnpj);
      ultimoCep.current = d.cep;
      setForm((f) => ({
        ...f,
        nome: d.nome || f.nome,
        telefone: d.telefone ? mascaraTelefone(d.telefone) : f.telefone,
        email: d.email ? d.email.toLowerCase() : f.email,
        cep: d.cep ? mascaraCep(d.cep) : f.cep,
        logradouro: d.logradouro || f.logradouro,
        numero: d.numero || f.numero,
        bairro: d.bairro || f.bairro,
        cidade: d.cidade || f.cidade,
        uf: d.uf || f.uf,
      }));
      setInfo(`Dados da Receita Federal (BrasilAPI): ${d.razaoSocial}${d.situacao ? ` · situação ${d.situacao}` : ''}.`);
    } catch (e) {
      setErros((er) => ({ ...er, documento: e.message }));
    } finally {
      setBuscandoCnpj(false);
    }
  }

  function validar() {
    const e = {};
    const doc = somenteDigitos(form.documento);
    if (form.nome.trim().length < 3) e.nome = 'Informe o nome com pelo menos 3 letras.';
    if (doc && !(doc.length === 11 ? cpfValido(doc) : doc.length === 14 ? cnpjValido(doc) : false)) e.documento = 'CPF ou CNPJ inválido.';
    if (![10, 11].includes(somenteDigitos(form.telefone).length)) e.telefone = 'Informe DDD + número.';
    if (form.email.trim() && !emailValido(form.email)) e.email = 'E-mail inválido.';
    if (somenteDigitos(form.cep).length !== 8) e.cep = 'CEP deve ter 8 dígitos.';
    if (!form.logradouro.trim()) e.logradouro = 'Informe o logradouro.';
    if (!form.numero.trim()) e.numero = 'Informe o número.';
    if (!form.bairro.trim()) e.bairro = 'Informe o bairro.';
    if (!form.cidade.trim()) e.cidade = 'Informe a cidade.';
    if (!UFS.includes(form.uf.trim().toUpperCase())) e.uf = 'UF inválida.';
    return e;
  }

  async function salvar() {
    const novosErros = validar();
    setErros(novosErros);
    setErroGeral('');
    if (Object.keys(novosErros).length) {
      setErroGeral('Confira os campos destacados.');
      return;
    }
    setSalvando(true);
    try {
      const dados = { ...form, uf: form.uf.trim().toUpperCase() };
      if (id) await api.atualizarCliente(id, dados);
      else await api.criarCliente(dados);
      navigation.goBack();
    } catch (e) {
      setErros(e.campos);
      setErroGeral(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    const ok = await confirmar('Excluir cliente', `Excluir ${form.nome}? O histórico de chamados dele também será apagado.`, 'Excluir', true);
    if (!ok) return;
    setExcluindo(true);
    try {
      await api.excluirCliente(id);
      navigation.goBack();
    } catch (e) {
      avisar('Não foi possível excluir', e.message);
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando) return <Carregando />;

  const docDigitos = somenteDigitos(form.documento);

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Mensagem texto={erroGeral} />
        <Mensagem tipo="info" texto={info} />

        <Campo
          rotulo="CPF ou CNPJ (opcional)"
          value={form.documento}
          onChangeText={(v) => alterar('documento')(mascaraDocumento(v))}
          erro={erros.documento}
          keyboardType="number-pad"
          placeholder="000.000.000-00"
          ajuda={docDigitos.length === 14 ? 'Toque em Buscar para preencher com os dados da Receita.' : undefined}
          acao={
            docDigitos.length === 14 ? (
              <Botao titulo="Buscar" compacto variante="secundario" carregando={buscandoCnpj} onPress={buscarCnpj} />
            ) : null
          }
        />
        <Campo rotulo="Nome" value={form.nome} onChangeText={alterar('nome')} erro={erros.nome} placeholder="Nome do cliente ou empresa" />
        <Campo
          rotulo="Telefone"
          value={form.telefone}
          onChangeText={(v) => alterar('telefone')(mascaraTelefone(v))}
          erro={erros.telefone}
          keyboardType="phone-pad"
          placeholder="(16) 99999-0000"
        />
        <Campo
          rotulo="E-mail (opcional)"
          value={form.email}
          onChangeText={alterar('email')}
          erro={erros.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.secao}>Endereço do atendimento</Text>
        <Campo
          rotulo="CEP"
          value={form.cep}
          onChangeText={(v) => {
            const mascarado = mascaraCep(v);
            alterar('cep')(mascarado);
            buscarCep(mascarado);
          }}
          erro={erros.cep}
          keyboardType="number-pad"
          placeholder="00000-000"
          ajuda="O endereço é preenchido automaticamente pelo ViaCEP."
          acao={buscandoCep ? <ActivityIndicator color={cores.primaria} /> : null}
        />
        <Campo rotulo="Logradouro" value={form.logradouro} onChangeText={alterar('logradouro')} erro={erros.logradouro} />
        <View style={styles.duasColunas}>
          <Campo ref={numeroRef} style={{ flex: 1 }} rotulo="Número" value={form.numero} onChangeText={alterar('numero')} erro={erros.numero} />
          <Campo style={{ flex: 2 }} rotulo="Bairro" value={form.bairro} onChangeText={alterar('bairro')} erro={erros.bairro} />
        </View>
        <View style={styles.duasColunas}>
          <Campo style={{ flex: 3 }} rotulo="Cidade" value={form.cidade} onChangeText={alterar('cidade')} erro={erros.cidade} />
          <Campo
            style={{ flex: 1 }}
            rotulo="UF"
            value={form.uf}
            onChangeText={(v) => alterar('uf')(v.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase())}
            erro={erros.uf}
            autoCapitalize="characters"
          />
        </View>

        <Botao titulo={id ? 'Salvar alterações' : 'Cadastrar cliente'} onPress={salvar} carregando={salvando} style={{ marginTop: espaco.sm }} />

        {id ? (
          <>
            <Text style={styles.secao}>Histórico de chamados</Text>
            {historico.length === 0 ? <Text style={styles.suave}>Nenhum chamado ainda.</Text> : null}
            {historico.map((h) => (
              <Cartao key={h.id} style={styles.historico} onPress={() => navigation.navigate('ChamadoDetalhe', { id: h.id })}>
                <Text style={styles.historicoTexto}>#{h.id} · {TIPOS[h.tipo].rotulo} · {isoParaBr(h.data_agendada)}</Text>
                <Selo texto={STATUS[h.status].rotulo} cor={STATUS[h.status].cor} fundo={STATUS[h.status].fundo} />
              </Cartao>
            ))}
            <Botao titulo="Excluir cliente" icone="trash-outline" variante="perigo" onPress={excluir} carregando={excluindo} style={{ marginTop: espaco.lg }} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.lg, paddingBottom: espaco.xl * 2 },
  duasColunas: { flexDirection: 'row', gap: espaco.md },
  secao: { fontSize: fonte.media, fontWeight: '700', color: cores.texto, marginTop: espaco.md, marginBottom: espaco.md },
  suave: { color: cores.textoSuave },
  historico: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: espaco.md, marginBottom: espaco.sm },
  historicoTexto: { color: cores.texto, flexShrink: 1 },
});
