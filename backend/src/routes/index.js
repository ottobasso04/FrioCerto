const { Router } = require('express');
const autenticar = require('../middlewares/autenticar');
const authService = require('../services/authService');
const clienteService = require('../services/clienteService');
const chamadoService = require('../services/chamadoService');
const dashboardService = require('../services/dashboardService');
const viaCep = require('../services/externos/viaCep');
const brasilApi = require('../services/externos/brasilApi');
const openMeteo = require('../services/externos/openMeteo');

const rotas = Router();

rotas.get('/saude', (req, res) => res.json({ status: 'ok', servico: 'friocerto-bff' }));

rotas.post('/auth/cadastro', (req, res) => res.status(201).json(authService.cadastrar(req.body)));
rotas.post('/auth/login', (req, res) => res.json(authService.entrar(req.body)));

rotas.use(autenticar);

rotas.get('/auth/eu', (req, res) => res.json(authService.buscarPorId(req.usuario.id)));

rotas.get('/dashboard', async (req, res) => res.json(await dashboardService.resumoCompleto()));

rotas.get('/clientes', (req, res) => res.json(clienteService.listar(req.query)));
rotas.get('/clientes/:id', (req, res) => res.json(clienteService.obter(req.params.id)));
rotas.post('/clientes', (req, res) => res.status(201).json(clienteService.criar(req.body)));
rotas.put('/clientes/:id', (req, res) => res.json(clienteService.atualizar(req.params.id, req.body)));
rotas.delete('/clientes/:id', (req, res) => {
  clienteService.excluir(req.params.id);
  res.status(204).end();
});

rotas.get('/chamados', (req, res) => res.json(chamadoService.listar(req.query)));
rotas.get('/chamados/:id', async (req, res) => res.json(await chamadoService.obter(req.params.id)));
rotas.post('/chamados', async (req, res) => res.status(201).json(await chamadoService.criar(req.body, req.usuario.id)));
rotas.put('/chamados/:id', async (req, res) => res.json(await chamadoService.atualizar(req.params.id, req.body)));
rotas.patch('/chamados/:id/status', (req, res) => res.json(chamadoService.alterarStatus(req.params.id, req.body?.status)));
rotas.delete('/chamados/:id', (req, res) => {
  chamadoService.excluir(req.params.id);
  res.status(204).end();
});

rotas.get('/externos/cep/:cep', async (req, res) => res.json(await viaCep.consultarCep(req.params.cep)));
rotas.get('/externos/cnpj/:cnpj', async (req, res) => res.json(await brasilApi.consultarCnpj(req.params.cnpj)));
rotas.get('/externos/feriados/:ano', async (req, res) => res.json(await brasilApi.listarFeriados(req.params.ano)));
rotas.get('/externos/clima', async (req, res) => res.json(await openMeteo.previsaoPorCidade(req.query.cidade, req.query.uf)));

module.exports = rotas;
