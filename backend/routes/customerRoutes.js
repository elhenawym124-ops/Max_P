const express = require('express');
const router = express.Router();
const customerController = require('../controller/customerController');
const verifyToken = require("../utils/verifyToken")

router.get('/', verifyToken.authenticateToken ,customerController.getAllCustomer);
router.delete('/cus',customerController.deleteAllCustomers);
router.delete('/con',customerController.deleteAllConversations);

module.exports = router;