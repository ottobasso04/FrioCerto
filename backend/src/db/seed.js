const db = require('./database');
const { gerarHash } = require('../utils/senha');
const { hojeIso, somarDias } = require('../utils/validators');

function popularSeVazio() {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get();
  if (total > 0) return;

  const usuario = db
    .prepare('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)')
    .run('Gestor FrioCerto', 'gestor@friocerto.com', gerarHash('123456'));

  const inserirCliente = db.prepare(`
    INSERT INTO clientes (nome, documento, telefone, email, cep, logradouro, numero, bairro, cidade, uf)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const c1 = inserirCliente.run('Padaria Pão Quente', null, '16999990001', 'contato@paoquente.com', '13560000', 'Rua Episcopal', '1200', 'Centro', 'São Carlos', 'SP');
  const c2 = inserirCliente.run('Mariana Souza', '52998224725', '16988880002', null, '13566590', 'Avenida Trabalhador São-carlense', '400', 'Parque Arnold Schimidt', 'São Carlos', 'SP');
  const c3 = inserirCliente.run('Clínica Bem Viver', null, '1633330003', 'adm@bemviver.com', '13560010', 'Rua Nove de Julho', '850', 'Centro', 'São Carlos', 'SP');

  const hoje = hojeIso();
  const inserirChamado = db.prepare(`
    INSERT INTO chamados (cliente_id, tipo, descricao, prioridade, status, data_agendada, valor, criado_por, concluido_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const uid = usuario.lastInsertRowid;
  inserirChamado.run(c1.lastInsertRowid, 'manutencao', 'Split 18.000 BTUs pingando água na área de atendimento', 'alta', 'aberto', somarDias(hoje, 1), 280, uid, null);
  inserirChamado.run(c2.lastInsertRowid, 'instalacao', 'Instalação de split 9.000 BTUs no quarto', 'media', 'aberto', somarDias(hoje, 3), 650, uid, null);
  inserirChamado.run(c3.lastInsertRowid, 'limpeza', 'Higienização de 4 aparelhos das salas de consulta', 'baixa', 'em_andamento', hoje, 520, uid, null);
  inserirChamado.run(c1.lastInsertRowid, 'reparo', 'Troca de capacitor do condensador', 'alta', 'concluido', somarDias(hoje, -5), 350, uid, `${somarDias(hoje, -5)} 15:00:00`);
  inserirChamado.run(c3.lastInsertRowid, 'manutencao', 'Manutenção preventiva trimestral', 'media', 'concluido', somarDias(hoje, -2), 900, uid, `${somarDias(hoje, -2)} 11:00:00`);

  console.log('Banco populado com dados de demonstração (login: gestor@friocerto.com / 123456)');
}

module.exports = { popularSeVazio };
