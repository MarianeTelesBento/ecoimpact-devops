// Banco em memória para os testes (mongo-mock: mesma API do driver oficial, sem binário nativo).
const mongoMock = require('mongo-mock');

mongoMock.max_delay = 0;

function bancoEmMemoria() {
  const nome = `teste_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    mongoMock.MongoClient.connect(`mongodb://localhost:27017/${nome}`, {}, (err, db) => (err ? reject(err) : resolve(db)));
  });
}

module.exports = { bancoEmMemoria };
