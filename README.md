# FrioCerto

Aplicativo mobile (React Native + Expo) para gestão de chamados técnicos de uma empresa de instalação e manutenção de ar-condicionado, com API BFF em Node.js, banco SQLite e assistente com Gemini (function calling).

```
friocerto/
├── backend/   API BFF (Express + SQLite + integrações externas + Gemini)
└── mobile/    App React Native (Expo SDK 57)
```

## Pré-requisitos

- Node.js 22.13 ou superior (o banco usa o módulo nativo `node:sqlite`)
- App **Expo Go** (SDK 57) no celular, conectado ao mesmo Wi-Fi do computador
- Chave da API do Gemini (gratuita em https://aistudio.google.com/apikey)

## 1. Subir a API

```bash
cd backend
npm install
cp .env.example .env        # no Windows: copy .env.example .env
# edite o .env e cole sua GEMINI_API_KEY
npm start
```

Na primeira execução o banco `data/friocerto.db` é criado e populado com dados de demonstração.
O terminal mostra o endereço da API na rede, por exemplo `http://192.168.0.10:3333/api`.

Login de demonstração: **gestor@friocerto.com / 123456**

**Modelo reserva do Gemini.** Se o modelo principal (`GEMINI_MODEL`) responder com demanda alta (429, 5xx ou timeout), a API repete a pergunta no `GEMINI_MODEL_RESERVA` e deixa o principal em pausa por `GEMINI_PAUSA_PRIMARIO_SEGUNDOS` (60 s por padrão).

A cidade da empresa (painel e assistente) é definida em `EMPRESA_CIDADE` e vem como Araraquara. Se você já tinha criado o `.env`, atualize essa linha e acrescente as duas variáveis do modelo reserva.

> Se o Windows perguntar, permita o Node.js no firewall para redes privadas, senão o celular não alcança a API.

## 2. Rodar o app

```bash
cd mobile
npm install
npm run setup      # instala as bibliotecas nas versões do SDK 57
npx expo start
```

Para abrir no navegador, rode `npm run web` (ou aperte `w` no terminal do Expo). No navegador a API é acessada em `http://localhost:3333/api` e o token fica no `localStorage`.

No celular, escaneie o QR Code com o Expo Go. O app descobre sozinho o IP do computador (o mesmo do Metro) e usa a porta 3333.
Para apontar para outro endereço, crie `mobile/.env` com:

```
EXPO_PUBLIC_API_URL=http://SEU_IP:3333/api
```

## Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| POST | /api/auth/cadastro | Cria usuário e devolve token |
| POST | /api/auth/login | Autentica e devolve token JWT |
| GET | /api/auth/eu | Usuário logado |
| GET | /api/dashboard | Indicadores + previsão do tempo + próximo feriado |
| GET/POST | /api/clientes | Lista (com `?busca=`) / cria cliente |
| GET/PUT/DELETE | /api/clientes/:id | Consulta, edita, exclui cliente |
| GET/POST | /api/chamados | Lista (com `?status=&busca=&data_inicio=&data_fim=`) / cria chamado |
| GET/PUT/DELETE | /api/chamados/:id | Consulta (com previsão do tempo), edita, exclui chamado |
| PATCH | /api/chamados/:id/status | Avança o status do chamado |
| GET | /api/externos/cep/:cep | ViaCEP |
| GET | /api/externos/cnpj/:cnpj | BrasilAPI (CNPJ) |
| GET | /api/externos/feriados/:ano | BrasilAPI (feriados) |
| GET | /api/externos/clima?cidade=&uf= | Open-Meteo |
| POST | /api/assistente | Pergunta ao Gemini (function calling); envie `conversa_id` para continuar uma conversa |
| GET | /api/assistente/conversas | Conversas salvas do usuário |
| GET/DELETE | /api/assistente/conversas/:id | Abre ou apaga uma conversa salva |

Todas as rotas, exceto `/saude`, `/auth/login` e `/auth/cadastro`, exigem o cabeçalho `Authorization: Bearer <token>`.
