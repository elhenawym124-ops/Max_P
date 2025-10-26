const express = require('express');
const router = express.Router();
const { diagnoseFacebookSending } = require('../utils/allFunctions');
// 🔧 FIX: استيراد دالة الإرسال المباشرة
const { sendProductionFacebookMessage } = require('../production-facebook-fix');

// Test Facebook message sending
router.post('/test-send', async (req, res) => {
  try {
    const { recipientId, message, pageId } = req.body;
    
    //console.log('🧪 [TEST] Testing Facebook message sending...');
    //console.log('🧪 [TEST] Recipient ID:', recipientId);
    //console.log('🧪 [TEST] Message:', message);
    //console.log('🧪 [TEST] Page ID:', pageId);
    
    // Run diagnostic first
    const diagnosticResult = await diagnoseFacebookSending(recipientId, message, pageId);
    //console.log('🧪 [TEST] Diagnostic result:', diagnosticResult);
    
    // 🔧 FIX: استخدام دالة الإرسال المحسنة مباشرة
    // البحث عن الصفحة إذا تم تحديد pageId
    let pageAccessToken = null;
    let actualPageId = pageId;
    
    if (pageId) {
      const { getPageToken } = require('../utils/allFunctions');
      const pageData = await getPageToken(pageId);
      if (pageData && pageData.pageAccessToken) {
        pageAccessToken = pageData.pageAccessToken;
      }
    }
    
    // إذا لم نجد رمز الوصول للصفحة، نحاول العثور على صفحة متصلة
    if (!pageAccessToken) {
      const { getSharedPrismaClient } = require('../services/sharedDatabase');
      const prisma = getSharedPrismaClient();
      const defaultPage = await prisma.facebookPage.findFirst({
        where: { status: 'connected' },
        orderBy: { connectedAt: 'desc' }
      });
      
      if (defaultPage && defaultPage.pageAccessToken) {
        pageAccessToken = defaultPage.pageAccessToken;
        actualPageId = defaultPage.pageId; // تحديث pageId للاستخدام
      }
    }
    
    // التحقق من توفر رمز الوصول
    if (!pageAccessToken || !actualPageId) {
      return res.status(400).json({
        success: false,
        error: 'No valid Facebook page found'
      });
    }
    
    // Then try actual sending with the production function
    const sendResult = await sendProductionFacebookMessage(
      recipientId, 
      message, 
      'TEXT', 
      actualPageId, 
      pageAccessToken
    );
    //console.log('🧪 [TEST] Send result:', sendResult);
    
    res.json({
      success: true,
      diagnostic: diagnosticResult,
      sendResult: sendResult,
      message: 'Test completed - check console for detailed logs'
    });
    
  } catch (error) {
    console.error('❌ [TEST] Error in test:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Test failed - check console for details'
    });
  }
});

// Test webhook processing
router.post('/test-webhook', async (req, res) => {
  try {
    const { handleFacebookMessage } = require('../utils/allFunctions');
    
    //console.log('🧪 [TEST] Testing webhook processing...');
    //console.log('🧪 [TEST] Webhook data:', JSON.stringify(req.body, null, 2));
    
    // Simulate webhook event
    const webhookEvent = req.body;
    
    // Process the webhook
    await handleFacebookMessage(webhookEvent);
    
    res.json({
      success: true,
      message: 'Webhook test completed - check console for detailed logs'
    });
    
  } catch (error) {
    console.error('❌ [TEST] Error in webhook test:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Webhook test failed - check console for details'
    });
  }
});

module.exports = router;
