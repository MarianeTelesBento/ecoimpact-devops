class ErroValidacao extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroValidacao';
  }
}

class ErroNaoEncontrado extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroNaoEncontrado';
  }
}

module.exports = { ErroValidacao, ErroNaoEncontrado };
