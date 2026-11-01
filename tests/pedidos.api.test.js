// Testes de integração: exercitam a API completa (rota -> controller -> service -> repository).
const request = require('supertest');
const app = require('../src/app');
const repository = require('../src/repositories/pedidosRepository');

const pedidoValido = {
  cliente: 'Carlos Silva',
  tipo: 'entrega',
  valor: 350,
  prioridade: 'normal',
};

async function criarPedido(dados = pedidoValido) {
  return request(app).post('/pedidos').send(dados);
}

beforeEach(() => repository.limpar());

describe('POST /pedidos', () => {
  test('cria pedido válido -> 201 com id e status "recebido"', async () => {
    const res = await criarPedido();
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, ...pedidoValido, status: 'recebido' });
  });

  test('remove espaços das extremidades do cliente', async () => {
    const res = await criarPedido({ ...pedidoValido, cliente: '  Ana  ' });
    expect(res.status).toBe(201);
    expect(res.body.cliente).toBe('Ana');
  });

  test('ignora status enviado no corpo (sempre inicia como "recebido")', async () => {
    const res = await criarPedido({ ...pedidoValido, status: 'entregue' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('recebido');
  });

  test.each([
    ['cliente ausente', { ...pedidoValido, cliente: undefined }, 'cliente'],
    ['cliente só com espaços', { ...pedidoValido, cliente: '   ' }, 'cliente'],
    ['cliente numérico', { ...pedidoValido, cliente: 123 }, 'cliente'],
    ['valor zero', { ...pedidoValido, valor: 0 }, 'valor'],
    ['valor negativo', { ...pedidoValido, valor: -10 }, 'valor'],
    ['valor como string', { ...pedidoValido, valor: '350' }, 'valor'],
    ['valor ausente', { ...pedidoValido, valor: undefined }, 'valor'],
    ['tipo desconhecido', { ...pedidoValido, tipo: 'drone' }, 'tipo'],
    ['prioridade desconhecida', { ...pedidoValido, prioridade: 'maxima' }, 'prioridade'],
  ])('%s -> 400', async (_, dados, campo) => {
    const res = await criarPedido(dados);
    expect(res.status).toBe(400);
    expect(res.body.erro).toBeDefined();
    expect(res.body.detalhes.map((d) => d.campo)).toContain(campo);
  });

  test('acumula vários erros na mesma resposta', async () => {
    const res = await criarPedido({ cliente: '', tipo: 'x', valor: -1, prioridade: 'y' });
    expect(res.status).toBe(400);
    expect(res.body.detalhes).toHaveLength(4);
  });

  test('JSON malformado -> 400', async () => {
    const res = await request(app)
      .post('/pedidos')
      .set('Content-Type', 'application/json')
      .send('{"cliente": "Ana",');
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/JSON malformado/);
  });

  test('corpo como array -> 400', async () => {
    const res = await criarPedido([pedidoValido]);
    expect(res.status).toBe(400);
  });
});

describe('GET /pedidos', () => {
  test('lista vazia -> 200 com []', async () => {
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('lista pedidos cadastrados com ids sequenciais', async () => {
    await criarPedido();
    await criarPedido({ ...pedidoValido, cliente: 'Maria', tipo: 'retirada' });
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.id)).toEqual([1, 2]);
  });
});

describe('GET /pedidos/:id', () => {
  test('pedido existente -> 200', async () => {
    await criarPedido();
    const res = await request(app).get('/pedidos/1');
    expect(res.status).toBe(200);
    expect(res.body.cliente).toBe('Carlos Silva');
  });

  test.each(['999', 'abc', '0', '-1', '1.5'])('id "%s" inexistente -> 404', async (id) => {
    await criarPedido();
    const res = await request(app).get(`/pedidos/${id}`);
    expect(res.status).toBe(404);
    expect(res.body.erro).toBeDefined();
  });
});

describe('PATCH /pedidos/:id/status', () => {
  test('transição válida recebido -> em_preparacao -> 200', async () => {
    await criarPedido();
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'em_preparacao' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('em_preparacao');
  });

  test('fluxo completo até "entregue"', async () => {
    await criarPedido();
    for (const status of ['em_preparacao', 'enviado', 'entregue']) {
      const res = await request(app).patch('/pedidos/1/status').send({ status });
      expect(res.status).toBe(200);
    }
    const res = await request(app).get('/pedidos/1');
    expect(res.body.status).toBe('entregue');
  });

  test('cancelamento a partir de "recebido" -> 200', async () => {
    await criarPedido();
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelado');
  });

  test('transição não permitida (recebido -> entregue) -> 400', async () => {
    await criarPedido();
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'entregue' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não é permitida/);
  });

  test('não altera pedido em estado final (cancelado -> recebido) -> 400', async () => {
    await criarPedido();
    await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'recebido' });
    expect(res.status).toBe(400);
  });

  test('não cancela pedido já enviado -> 400', async () => {
    await criarPedido();
    await request(app).patch('/pedidos/1/status').send({ status: 'em_preparacao' });
    await request(app).patch('/pedidos/1/status').send({ status: 'enviado' });
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });
    expect(res.status).toBe(400);
  });

  test.each([
    ['status desconhecido', { status: 'perdido' }],
    ['status ausente', {}],
    ['status não textual', { status: 1 }],
  ])('%s -> 400', async (_, corpo) => {
    await criarPedido();
    const res = await request(app).patch('/pedidos/1/status').send(corpo);
    expect(res.status).toBe(400);
  });

  test('transição inválida não altera o pedido', async () => {
    await criarPedido();
    await request(app).patch('/pedidos/1/status').send({ status: 'entregue' });
    const res = await request(app).get('/pedidos/1');
    expect(res.body.status).toBe('recebido');
  });

  test('id inexistente -> 404', async () => {
    const res = await request(app).patch('/pedidos/999/status').send({ status: 'cancelado' });
    expect(res.status).toBe(404);
  });
});

describe('Erros gerais', () => {
  test('rota inexistente -> 404 em JSON', async () => {
    const res = await request(app).get('/produtos');
    expect(res.status).toBe(404);
    expect(res.body.erro).toBeDefined();
  });

  test('erro inesperado -> 500, sem ser tratado como validação', async () => {
    const spy = jest.spyOn(repository, 'listar').mockImplementation(() => {
      throw new Error('falha simulada');
    });
    const silenciar = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ erro: 'Erro interno do servidor.' });

    spy.mockRestore();
    silenciar.mockRestore();
  });
});
