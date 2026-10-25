class AppError extends Error {
  constructor(mensagem, status = 400, detalhes = undefined) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}

module.exports = AppError;
