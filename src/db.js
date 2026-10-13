const { MongoClient } = require('mongodb');

/** Conecta ao MongoDB usando o driver oficial. Credenciais separadas da URI (evita problema com caracteres especiais). */
async function conectar({ uri, dbName, usuario, senha }) {
  const opcoes = { serverSelectionTimeoutMS: 5000 };
  if (usuario) {
    opcoes.auth = { username: usuario, password: senha };
    opcoes.authSource = 'admin';
  }
  const client = new MongoClient(uri, opcoes);
  await client.connect();
  return { client, db: client.db(dbName) };
}

module.exports = { conectar };
