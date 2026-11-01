// Testes unitários da camada de serviço (sem HTTP).
const service = require('../src/services/pedidosService');
const repository = require('../src/repositories/pedidosRepository');
const { ValidationError, NotFoundError } = require('../src/errors/AppError');
const { TRANSICOES } = require('../src/config/regras');

const base = { cliente: 'Ana', tipo: 'retirada', valor: 10.5, prioridade: 'alta' };

beforeEach(() => repository.limpar());

test('criarPedido aceita valor decimal', () => {
  expect(service.criarPedido(base).valor).toBe(10.5);
});

test('criarPedido lança ValidationError para dados inválidos', () => {
  expect(() => service.criarPedido({ ...base, valor: 0 })).toThrow(ValidationError);
});

test('buscarPedido lança NotFoundError para id inexistente', () => {
  expect(() => service.buscarPedido('42')).toThrow(NotFoundError);
});

test('alterar o objeto retornado não altera o armazenamento', () => {
  const pedido = service.criarPedido(base);
  pedido.status = 'entregue';
  expect(service.buscarPedido(String(pedido.id)).status).toBe('recebido');
});

test('estados finais não possuem transições', () => {
  expect(TRANSICOES.entregue).toEqual([]);
  expect(TRANSICOES.cancelado).toEqual([]);
});
