const express = require('express');
const router = express.Router();
const aiController = require('../controller/aiController');
const verifyToken = require("../utils/verifyToken");
const EnhancedOrderService = require('../services/enhancedOrderService');

router.put('/settings', aiController.updateSettings);
router.post('/toggle', aiController.toggle);
router.get('/stats', verifyToken.authenticateToken, aiController.getAIStatistics);
router.delete('/memory/clear', aiController.clearConversationMemory);
router.post('/knowledge-base/update', aiController.updateKnowledgeBase);
router.get('/memory/stats', aiController.getMemoryStatistics);
router.get('/rag/stats', aiController.getRAGStatistics);
router.get('/multimodal/stats', aiController.getMultimodalProcessingStatistics);
router.get('/available-models', aiController.getAvailableModels);

// ================================
// GEMINI KEYS MANAGEMENT
// ================================
router.get('/gemini-keys', verifyToken.authenticateToken, aiController.getAllGeminiKeys);
router.post('/gemini-keys', verifyToken.authenticateToken, aiController.addNewGeminKey);
router.put('/gemini-keys/:id/toggle', verifyToken.authenticateToken, aiController.toggleGeminiKeyActiveStatus);
router.put('/gemini-keys/:id/model', verifyToken.authenticateToken, aiController.updateGeminiKeyModel);
router.delete('/gemini-keys/:id', verifyToken.authenticateToken, aiController.deleteGeminiKey);
router.post('/gemini-keys/:id/test', verifyToken.authenticateToken, aiController.testGeminiKey2);


// ================================
// SYSTEM PROMPTS MANAGEMENT
// ================================

router.get('/prompts', aiController.getAllSystemPrompts);
router.post('/prompts', aiController.addNewSystemPrompt);
router.put('/prompts/:id/activate', aiController.activateSystemPrompt);
router.put('/prompts/:id', aiController.updateSystemPrompt);
router.delete('/prompts/:id', aiController.deleteSystemPrompt);

// ================================
// MEMORY MANAGEMENT
// ================================

router.get('/memory/settings', aiController.getMemorySettings);
router.put('/memory/settings', aiController.updateMemorySettings);
router.put('/memory/cleanup', aiController.cleanupOldMemory);

// ================================
// CREATE ORDER FROM CONVERSATION
// ================================

/**
 * إنشاء طلب من المحادثة
 * POST /api/v1/ai/create-order-from-conversation
 */
router.post('/create-order-from-conversation', verifyToken.authenticateToken, async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();
    
    const { customerId, conversationId, products, shippingAddress, notes } = req.body;
    const companyId = req.user.companyId;
    
    // التحقق من البيانات المطلوبة
    if (!customerId || !products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل والمنتجات مطلوبة'
      });
    }
    
    // حساب المجموع الكلي
    const subtotal = products.reduce((sum, item) => sum + item.total, 0);
    
    // تحضير بيانات الطلب
    const orderData = {
      companyId,
      customerId,
      conversationId,
      
      // معلومات المنتجات
      productName: products.map(p => p.productName).join(', '),
      productPrice: products[0].price,
      quantity: products.reduce((sum, p) => sum + p.quantity, 0),
      
      // معلومات الشحن
      customerAddress: shippingAddress || '',
      city: 'غير محدد', // يمكن استخراجها من العنوان لاحقاً
      
      // ملاحظات
      notes: notes || '',
      
      // معلومات الاستخراج
      extractionMethod: 'manual_order_modal',
      confidence: 1.0,
      
      // المنتجات للحفظ في OrderItems
      products: products
    };
    
    // إنشاء الطلب
    const result = await enhancedOrderService.createEnhancedOrder(orderData);
    await enhancedOrderService.disconnect();
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب من المحادثة:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في إنشاء الطلب'
    });
  }
});

module.exports = router;