// Camada de regras de negócio. Não conhece req/res nem HTTP:
// recebe dados, aplica regras e lança erros de domínio.

const repository = require('../repositories/pedidosRepository');
const { validarCriacao, validarStatus } = require('../validators/pedidoValidator');
const { STATUS_INICIAL, TRANSICOES } = require('../config/regras');
const { ValidationError, NotFoundError } = require('../errors/AppError');

// Converte o parâmetro da rota em ID. Qualquer valor que não seja inteiro
// positivo (ex.: "abc", "1.5", "-3") não corresponde a nenhum pedido -> 404.
function converterId(idParam) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    throw new NotFoundError(`Pedido com id "${idParam}" não encontrado.`);
  }
  return id;
}

function criarPedido(body) {
  const dados = validarCriacao(body);
  // O status é sempre definido pelo servidor; um "status" enviado no POST é ignorado.
  return repository.criar({ ...dados, status: STATUS_INICIAL });
}

function listarPedidos() {
  return repository.listar();
}

function buscarPedido(idParam) {
  const id = converterId(idParam);
  const pedido = repository.buscarPorId(id);
  if (!pedido) {
    throw new NotFoundError(`Pedido com id ${id} não encontrado.`);
  }
  return pedido;
}

function atualizarStatus(idParam, body) {
  // Ordem: primeiro garante que o pedido existe (404), depois valida o corpo (400).
  const pedido = buscarPedido(idParam);
  const novoStatus = validarStatus(body);

  const permitidos = TRANSICOES[pedido.status];
  if (!permitidos.includes(novoStatus)) {
    const destinos = permitidos.length ? permitidos.join(', ') : 'nenhuma (estado final)';
    throw new ValidationError(
      `Transição de "${pedido.status}" para "${novoStatus}" não é permitida. Transições possíveis: ${destinos}.`
    );
  }

  return repository.atualizar(pedido.id, { status: novoStatus });
}

module.exports = { criarPedido, listarPedidos, buscarPedido, atualizarStatus };
