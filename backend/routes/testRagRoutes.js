const express = require('express');
const router = express.Router();
const aiAgentService = require('../services/aiAgentService');

router.get('/test-rag', async (req, res) => {
  try {
    const { message } = req.body;
    const messageData = {
      conversationId: 'test',
      senderId: 'test-user',
      content: message,
      attachments: [],
      customerData: {
        id: 'test-customer',
        name: 'Test User',
        phone: '01234567890',
        orderCount: 0,
        companyId: 'cmdkj6coz0000uf0cyscco6lr'
      }
    };

    //console.log('🧪 Testing RAG with message:', message);
    const result = await aiAgentService.processCustomerMessage(messageData);

    res.json({
      success: true,
      message: message,
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test RAG error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});


module.exports = router;