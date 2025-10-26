const processedMessages = new Map();
const aiAgentService = require('../services/aiAgentService');
const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();
const getDebugInfo = async(req, res) => {
  try {
    const queueStats = messageQueueManager.getQueueStats();
    const processedMessagesStats = {
      totalProcessedMessages: processedMessages.size,
      oldestMessage: Math.min(...Array.from(processedMessages.values())),
      newestMessage: Math.max(...Array.from(processedMessages.values()))
    };

    res.json({
      success: true,
      data: {
        queues: queueStats,
        processedMessages: processedMessagesStats,
        timestamp: new Date().toISOString()
      },
      message: 'حالة طوابير الرسائل'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'خطأ في جلب حالة الطوابير'
    });
  }
}

const getDebugAiErrors =async (req, res) => {
  try {
    const { companyId } = req.query;

    const errorStats = aiAgentService.errorHandler.getErrorStats(companyId);

    res.json({
      success: true,
      data: {
        ...errorStats,
        timestamp: new Date().toISOString(),
        companyFilter: companyId || 'all'
      },
      message: 'إحصائيات أخطاء الذكاء الاصطناعي'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'خطأ في جلب إحصائيات الأخطاء'
    });
  }
}

const postResetAiErrors = async(req, res) => {
  try {
    const { companyId } = req.body;

    aiAgentService.errorHandler.resetErrorStats(companyId);

    res.json({
      success: true,
      data: {
        resetTimestamp: new Date().toISOString(),
        companyFilter: companyId || 'all'
      },
      message: 'تم إعادة تعيين إحصائيات الأخطاء'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'خطأ في إعادة تعيين الإحصائيات'
    });
  }
}

const getDebugDataBase = async (req, res) => {
  try {
    const stats = {
      customers: await prisma.customer.count(),
      conversations: await prisma.conversation.count(),
      messages: await prisma.message.count(),
      products: await prisma.product.count(),
      facebookPages: await prisma.facebookPage.count(),
      companies: await prisma.company.count()
    };

    const facebookPages = await prisma.facebookPage.findMany({
      select: {
        id: true,
        pageId: true,
        pageName: true,
        status: true,
        companyId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: {
        stats,
        facebookPages,
        companies,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Database debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = { getDebugInfo, getDebugAiErrors, postResetAiErrors , getDebugDataBase };