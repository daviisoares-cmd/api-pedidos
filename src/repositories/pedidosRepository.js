// Camada de acesso a dados. Armazenamento em memória (os dados são perdidos
// ao reiniciar o servidor). Trocar por um banco exigiria alterar só este arquivo.

let pedidos = [];
let proximoId = 1;

function listar() {
  return pedidos.map((p) => ({ ...p }));
}

function buscarPorId(id) {
  const pedido = pedidos.find((p) => p.id === id);
  return pedido ? { ...pedido } : null;
}

function criar(dados) {
  const pedido = { id: proximoId++, ...dados };
  pedidos.push(pedido);
  return { ...pedido };
}

function atualizar(id, campos) {
  const indice = pedidos.findIndex((p) => p.id === id);
  if (indice === -1) return null;
  pedidos[indice] = { ...pedidos[indice], ...campos };
  return { ...pedidos[indice] };
}

// Usado pelos testes para começar cada cenário com o "banco" vazio.
function limpar() {
  pedidos = [];
  proximoId = 1;
}

module.exports = { listar, buscarPorId, criar, atualizar, limpar };
