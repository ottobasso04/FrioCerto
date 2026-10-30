const os = require('node:os');
const config = require('./config');
const { popularSeVazio } = require('./db/seed');
const app = require('./app');

popularSeVazio();

app.listen(config.port, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i.address}:${config.port}/api`);

  console.log(`FrioCerto BFF rodando na porta ${config.port}`);
  ips.forEach((url) => console.log(`  Acesse pela rede: ${url}`));
});
