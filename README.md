# FrioCerto

Aplicativo mobile (React Native + Expo) para gestão de chamados técnicos de uma empresa de instalação e manutenção de ar-condicionado, com API BFF em Node.js, banco SQLite e integração com ViaCEP, BrasilAPI e Open-Meteo.

```
friocerto/
├── backend/   API BFF (Express + SQLite + integrações externas)
└── mobile/    App React Native (Expo SDK 57)
```

## Pré-requisitos

- Node.js 22.13 ou superior (o banco usa o módulo nativo `node:sqlite`)
- App **Expo Go** (SDK 57) no celular, conectado ao mesmo Wi-Fi do computador

## 1. Subir a API

```bash
cd backend
npm install
cp .env.example .env        # no Windows: copy .env.example .env
npm start
```

Na primeira execução o banco `data/friocerto.db` é criado e populado com dados de demonstração.
O terminal mostra o endereço da API na rede, por exemplo `http://192.168.0.10:3333/api`.

Login de demonstração: **gestor@friocerto.com / 123456**

A cidade da empresa (previsão do Painel) é definida em `EMPRESA_CIDADE` e vem como Araraquara. Nenhuma das APIs externas pede chave.

> Se o Windows perguntar, permita o Node.js no firewall para redes privadas, senão o celular não alcança a API.

## 2. Rodar o app

Instalação (primeira vez, ou para corrigir versões):

```bash
cd mobile
npm install
npm run setup
```

O `npm run setup` usa o `expo install`, que escolhe automaticamente as versões compatíveis com o Expo SDK 57 (inclusive `react` e `react-dom` na mesma versão, que a web exige).

No navegador:

```bash
npm run web
```

O navegador abre em `http://localhost:8081` e o app procura a API em `http://localhost:3333/api`, por isso a API precisa estar rodando no mesmo computador. Na web, o token de login fica no `localStorage`.

No celular:

```bash
npx expo start
```

Escaneie o QR Code com o Expo Go. O app descobre sozinho o IP do computador (o mesmo do Metro) e usa a porta 3333.
Para apontar para outro endereço, crie `mobile/.env` com:

```
EXPO_PUBLIC_API_URL=http://SEU_IP:3333/api
```

Se a tela ficar branca ou aparecer a tela "Algo deu errado", faça uma instalação limpa:

```bash
cd mobile
rmdir /s /q node_modules
del package-lock.json
npm install
npm run setup
npx expo start --web --clear
```

(No Linux/macOS: `rm -rf node_modules package-lock.json`.)

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

Todas as rotas, exceto `/saude`, `/auth/login` e `/auth/cadastro`, exigem o cabeçalho `Authorization: Bearer <token>`.
