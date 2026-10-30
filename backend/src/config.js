const path = require('node:path');

const config = {
  port: Number(process.env.PORT) || 3333,
  jwtSecret: process.env.JWT_SECRET || 'friocerto-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  dbFile: path.resolve(process.cwd(), process.env.DB_FILE || './data/friocerto.db'),
  empresaCidade: process.env.EMPRESA_CIDADE || 'Araraquara',
  empresaUf: process.env.EMPRESA_UF || 'SP',
  capacidadeDiaria: Number(process.env.CAPACIDADE_DIARIA) || 4,
  timezone: 'America/Sao_Paulo',
};

module.exports = config;
