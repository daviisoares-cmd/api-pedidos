const { TIPOS, PRIORIDADES, STATUS } = require('../config/regras');
const { ValidationError } = require('../errors/AppError');

function isObjetoSimples(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

// Valida o corpo do POST /pedidos. Acumula todos os erros para devolver
// uma resposta única e explicativa ao cliente da API.
function validarCriacao(body) {
  if (!isObjetoSimples(body)) {
    throw new ValidationError('Corpo da requisição deve ser um objeto JSON.');
  }

  const erros = [];
  const { cliente, tipo, valor, prioridade } = body;

  if (typeof cliente !== 'string' || cliente.trim() === '') {
    erros.push({ campo: 'cliente', mensagem: 'Cliente é obrigatório e deve ser um texto não vazio.' });
  }

  if (!TIPOS.includes(tipo)) {
    erros.push({ campo: 'tipo', mensagem: `Tipo inválido. Valores aceitos: ${TIPOS.join(', ')}.` });
  }

  // typeof exige número de verdade: a string "350" é rejeitada.
  // Number.isFinite também rejeita NaN e Infinity.
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    erros.push({ campo: 'valor', mensagem: 'Valor deve ser numérico e maior que zero.' });
  }

  if (!PRIORIDADES.includes(prioridade)) {
    erros.push({
      campo: 'prioridade',
      mensagem: `Prioridade inválida. Valores aceitos: ${PRIORIDADES.join(', ')}.`,
    });
  }

  if (erros.length > 0) {
    throw new ValidationError('Dados do pedido inválidos.', erros);
  }

  // Retorna apenas os campos conhecidos, já normalizados.
  return { cliente: cliente.trim(), tipo, valor, prioridade };
}

// Valida o corpo do PATCH /pedidos/:id/status (apenas formato e valor reconhecido).
// A regra de transição é responsabilidade do service.
function validarStatus(body) {
  if (!isObjetoSimples(body)) {
    throw new ValidationError('Corpo da requisição deve ser um objeto JSON.');
  }

  const { status } = body;

  if (typeof status !== 'string' || !STATUS.includes(status)) {
    throw new ValidationError(`Status inválido. Valores aceitos: ${STATUS.join(', ')}.`, [
      { campo: 'status', mensagem: 'Status ausente ou não reconhecido.' },
    ]);
  }

  return status;
}

module.exports = { validarCriacao, validarStatus };
