const { Router } = require('express');
const controller = require('../controllers/pedidosController');

const router = Router();

router.post('/', controller.criar);
router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.patch('/:id/status', controller.atualizarStatus);

module.exports = router;
