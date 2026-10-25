const config = require('../../config');
const AppError = require('../../utils/AppError');
const { hojeIso, diaDaSemana, texto } = require('../../utils/validators');
const { gerarConteudo } = require('./geminiClient');
const ferramentas = require('./ferramentas');
const conversaService = require('../conversaService');

const MAX_RODADAS = 6;
const MAX_HISTORICO = 20;
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function instrucaoDeSistema(usuario) {
  const hoje = hojeIso();
  return [
    'Você é o assistente do FrioCerto, sistema de gestão de chamados de uma empresa de instalação e manutenção de ar-condicionado.',
    `Hoje é ${DIAS[diaDaSemana(hoje)]}, ${hoje}. A empresa fica em ${config.empresaCidade}/${config.empresaUf}. Você fala com ${usuario.nome}.`,
    'Responda sempre em português do Brasil, de forma curta e objetiva, formatando datas como DD/MM/AAAA e valores como R$.',
    'Escreva em texto simples, sem Markdown: não use asteriscos, negrito, títulos, hífens, travessões ou marcadores no início das linhas. Para listar dados, use uma linha por item no formato "Rótulo: valor".',
    'Use as funções disponíveis para obter dados reais. Nunca invente números, clientes ou chamados.',
    'Converta datas relativas ("amanhã", "sexta") para AAAA-MM-DD antes de chamar funções.',
    'Para abrir chamado, descubra o cliente_id com buscar_clientes. Se houver mais de um cliente parecido ou faltar tipo, descrição ou data, pergunte.',
    'Antes de criar chamado ou mudar status, resuma o que será feito e peça confirmação. Só execute depois que o usuário confirmar.',
    'Se uma função retornar "erro", explique o motivo ao usuário e sugira o que fazer.',
  ].join('\n');
}

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

const paraConteudo = (m) => ({ role: m.papel === 'usuario' ? 'user' : 'model', parts: [{ text: m.texto }] });

async function conversar({ mensagem, conversa_id: conversaIdInformado } = {}, usuario) {
  const pergunta = texto(mensagem);
  if (!pergunta) throw new AppError('Digite uma mensagem para o assistente.', 422, { mensagem: 'Mensagem vazia.' });
  if (pergunta.length > 2000) throw new AppError('Mensagem muito longa (máximo de 2000 caracteres).', 422);

  let conversaId = null;
  let historico = [];
  if (conversaIdInformado) {
    conversaId = conversaService.obterDoUsuario(conversaIdInformado, usuario.id).id;
    historico = conversaService.historicoParaModelo(conversaId, MAX_HISTORICO);
  }

  const contents = [...historico.map(paraConteudo), { role: 'user', parts: [{ text: pergunta }] }];
  const funcoesExecutadas = [];
  let modeloEmUso = null;
  let usouReserva = false;

  for (let rodada = 0; rodada < MAX_RODADAS; rodada += 1) {
    const { dados, modelo, reserva } = await gerarConteudo(
      {
        systemInstruction: { parts: [{ text: instrucaoDeSistema(usuario) }] },
        contents,
        tools: [{ functionDeclarations: ferramentas.declaracoes }],
        toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
      },
      { preferido: modeloEmUso },
    );
    modeloEmUso = modelo;
    usouReserva = usouReserva || reserva;

    const candidato = dados?.candidates?.[0];
    const partes = candidato?.content?.parts || [];
    const chamadas = partes.filter((p) => p.functionCall);

    if (!chamadas.length) {
      const resposta = textoSimples(partes.filter((p) => p.text && !p.thought).map((p) => p.text).join(''));
      if (!resposta) {
        const motivo = candidato?.finishReason || dados?.promptFeedback?.blockReason;
        throw new AppError(`O Gemini não retornou resposta${motivo ? ` (${motivo})` : ''}. Reformule a pergunta.`, 502);
      }
      const idSalvo = conversaService.registrarTroca({
        conversaId,
        usuarioId: usuario.id,
        pergunta,
        resposta,
        funcoes: funcoesExecutadas,
        modelo: modeloEmUso,
      });
      return { conversa_id: idSalvo, resposta, funcoesExecutadas, modelo: modeloEmUso, usouReserva };
    }

    contents.push(candidato.content);

    const respostasDasFuncoes = [];
    for (const parte of chamadas) {
      const { name, args, id } = parte.functionCall;
      const resultado = await ferramentas.executar(name, args, { usuarioId: usuario.id });
      funcoesExecutadas.push({ nome: name, argumentos: args || {}, sucesso: !resultado?.erro });
      respostasDasFuncoes.push({
        functionResponse: { ...(id && { id }), name, response: { resultado } },
      });
    }
    contents.push({ role: 'user', parts: respostasDasFuncoes });
  }

  throw new AppError('O assistente precisou de etapas demais para responder. Tente uma pergunta mais direta.', 502);
}

module.exports = { conversar, textoSimples };