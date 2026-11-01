// Valores aceitos e regras de negócio centralizados em um único lugar.
// Alterar uma regra aqui reflete em validação, service e mensagens de erro.

const TIPOS = ['entrega', 'retirada'];

const PRIORIDADES = ['baixa', 'normal', 'alta'];

const STATUS = ['recebido', 'em_preparacao', 'enviado', 'entregue', 'cancelado'];

const STATUS_INICIAL = 'recebido';

// Máquina de estados: para cada status atual, os próximos status permitidos.
// "entregue" e "cancelado" são estados finais (nenhuma transição a partir deles).
const TRANSICOES = {
  recebido: ['em_preparacao', 'cancelado'],
  em_preparacao: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
};

module.exports = { TIPOS, PRIORIDADES, STATUS, STATUS_INICIAL, TRANSICOES };
