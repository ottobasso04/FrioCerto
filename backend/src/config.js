const path = require('node:path');

const config = {
  port: Number(process.env.PORT) || 3333,
  jwtSecret: process.env.JWT_SECRET || 'friocerto-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  dbFile: path.resolve(process.cwd(), process.env.DB_FILE || './data/friocerto.db'),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  geminiModelReserva: process.env.GEMINI_MODEL_RESERVA || 'gemini-3.5-flash-lite',
  geminiPausaPrimarioMs: (Number(process.env.GEMINI_PAUSA_PRIMARIO_SEGUNDOS) || 60) * 1000,
  empresaCidade: process.env.EMPRESA_CIDADE || 'Araraquara',
  empresaUf: process.env.EMPRESA_UF || 'SP',
  capacidadeDiaria: Number(process.env.CAPACIDADE_DIARIA) || 4,
  timezone: 'America/Sao_Paulo',
};

module.exports = config;
