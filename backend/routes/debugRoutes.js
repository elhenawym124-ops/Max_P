const express = require('express');
const router = express.Router();
const debugController = require('../controller/debugController');

router.get('/message-queues', debugController.getDebugInfo);
router.get('/ai-errors', debugController.getDebugAiErrors);
router.post('/ai-errors/reset', debugController.postResetAiErrors);
router.post('/database', debugController.getDebugDataBase);

module.exports = router;