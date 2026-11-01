// Monta a aplicação Express sem iniciar o servidor.
// Separar app.js de server.js permite testar com supertest sem abrir porta.

const express = require('express');
const pedidosRoutes = require('./routes/pedidosRoutes');
const { rotaNaoEncontrada, tratarErros } = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ api: 'Gerenciamento de Pedidos', versao: '1.0.0', rotas: '/pedidos' });
});

app.use('/pedidos', pedidosRoutes);

app.use(rotaNaoEncontrada);
app.use(tratarErros);

module.exports = app;
