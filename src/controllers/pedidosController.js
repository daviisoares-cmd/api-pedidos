// Camada HTTP: extrai dados da requisição, chama o service e define o status da resposta.
// Erros são repassados com next(err) para o middleware central de erros.

const service = require('../services/pedidosService');

function criar(req, res, next) {
  try {
    const pedido = service.criarPedido(req.body);
    res.status(201).json(pedido);
  } catch (err) {
    next(err);
  }
}

function listar(req, res, next) {
  try {
    res.status(200).json(service.listarPedidos());
  } catch (err) {
    next(err);
  }
}

function buscarPorId(req, res, next) {
  try {
    res.status(200).json(service.buscarPedido(req.params.id));
  } catch (err) {
    next(err);
  }
}

function atualizarStatus(req, res, next) {
  try {
    res.status(200).json(service.atualizarStatus(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

module.exports = { criar, listar, buscarPorId, atualizarStatus };
