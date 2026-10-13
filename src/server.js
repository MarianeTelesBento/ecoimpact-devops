const { conectar } = require('./db');
const { criarServico } = require('./servico');
const { criarApp } = require('./app');
const { semear } = require('./seed');

const config = {
  porta: Number(process.env.PORT || 3000),
  ambiente: process.env.APP_ENV || 'local',
  uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
  dbName: process.env.MONGO_DB || 'ecoimpact',
  usuario: process.env.MONGO_USER || undefined,
  senha: process.env.MONGO_PASSWORD || undefined,
  semearAoIniciar: process.env.SEED_ON_START === 'true',
};

async function main() {
  const { client, db } = await conectar(config);
  console.log(`Conectado ao MongoDB (${config.dbName}) - ambiente: ${config.ambiente}`);

  if (config.semearAoIniciar) {
    const r = await semear(db);
    console.log(r.semeado ? `Carga inicial aplicada: ${JSON.stringify(r)}` : 'Banco já populado; carga inicial ignorada.');
  }

  const app = criarApp(criarServico(db), {
    ambiente: config.ambiente,
    ping: () => db.command({ ping: 1 }),
  });
  const servidor = app.listen(config.porta, () => console.log(`API ouvindo na porta ${config.porta}`));

  const encerrar = async (sinal) => {
    console.log(`${sinal} recebido, encerrando...`);
    servidor.close(async () => {
      await client.close();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => encerrar('SIGTERM'));
  process.on('SIGINT', () => encerrar('SIGINT'));
}

main().catch((e) => {
  console.error('Falha ao iniciar:', e);
  process.exit(1);
});
