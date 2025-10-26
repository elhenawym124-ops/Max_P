const express = require('express');
const router = express.Router();
const taskController = require('../controller/taskController');
const verifyToken = require('../utils/verifyToken');

// Apply authentication middleware to all routes
router.use(verifyToken.authenticateToken);

// Task routes
router.get('/', taskController.getAllTasks);
router.post('/', taskController.createTask);
router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.put('/:id/status', taskController.updateTaskStatus);

module.exports = router;