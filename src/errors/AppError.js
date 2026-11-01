// Erros "esperados" da aplicação. Carregam o status HTTP correspondente.
// Qualquer erro que NÃO seja AppError é tratado como inesperado (HTTP 500).

class AppError extends Error {
  constructor(message, statusCode, detalhes) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.detalhes = detalhes;
  }
}

class ValidationError extends AppError {
  constructor(message, detalhes) {
    super(message, 400, detalhes);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

module.exports = { AppError, ValidationError, NotFoundError };
