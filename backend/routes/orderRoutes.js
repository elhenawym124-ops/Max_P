const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController');


router.get('/', orderController.getAllOrders);
router.put('/:id/status', orderController.updateOrder);
router.put('/:id', orderController.getOneOrder);



module.exports = router;