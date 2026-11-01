const { AppError } = require('../errors/AppError');

// Rota não mapeada -> 404 em JSON (em vez do HTML padrão do Express).
function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: `Rota ${req.method} ${req.originalUrl} não encontrada.` });
}

// Middleware central de erros (4 parâmetros). Separa três casos:
// 1) JSON malformado no corpo  -> 400 (erro do cliente)
// 2) AppError (validação/404)  -> status do próprio erro
// 3) Qualquer outro erro       -> 500, sem expor detalhes internos
// eslint-disable-next-line no-unused-vars
function tratarErros(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON malformado no corpo da requisição.' });
  }

  if (err instanceof AppError) {
    const resposta = { erro: err.message };
    if (err.detalhes) resposta.detalhes = err.detalhes;
    return res.status(err.statusCode).json(resposta);
  }

  console.error('[ERRO INESPERADO]', err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = { rotaNaoEncontrada, tratarErros };
