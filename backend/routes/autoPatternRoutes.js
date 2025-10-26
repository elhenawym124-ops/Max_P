/**
 * مسارات API لإدارة الاكتشاف التلقائي للأنماط
 * Auto Pattern Detection API Routes
 */

const express = require('express');
const router = express.Router();
const autoPatternService = require('../services/autoPatternDetectionService');

/**
 * GET /api/v1/auto-patterns/status
 * الحصول على حالة خدمة الاكتشاف التلقائي
 */
router.get('/status', async (req, res) => {
  try {
    const status = autoPatternService.getStatus();
    
    res.json({
      success: true,
      data: {
        ...status,
        uptime: process.uptime(),
        lastDetectionAgo: status.lastDetection ? 
          Math.floor((Date.now() - new Date(status.lastDetection.timestamp).getTime()) / 1000 / 60) : null
      }
    });
  } catch (error) {
    console.error('❌ Error getting auto pattern service status:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في الحصول على حالة الخدمة',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/auto-patterns/start
 * بدء خدمة الاكتشاف التلقائي
 */
router.post('/start', async (req, res) => {
  try {
    autoPatternService.start();
    
    res.json({
      success: true,
      message: 'تم بدء خدمة الاكتشاف التلقائي بنجاح',
      data: autoPatternService.getStatus()
    });
  } catch (error) {
    console.error('❌ Error starting auto pattern service:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في بدء خدمة الاكتشاف التلقائي',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/auto-patterns/stop
 * إيقاف خدمة الاكتشاف التلقائي
 */
router.post('/stop', async (req, res) => {
  try {
    autoPatternService.stop();
    
    res.json({
      success: true,
      message: 'تم إيقاف خدمة الاكتشاف التلقائي بنجاح',
      data: autoPatternService.getStatus()
    });
  } catch (error) {
    console.error('❌ Error stopping auto pattern service:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إيقاف خدمة الاكتشاف التلقائي',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/auto-patterns/detect-now
 * تشغيل اكتشاف فوري للأنماط
 */
router.post('/detect-now', async (req, res) => {
  try {
    // استخدام companyId من المستخدم المصادق عليه
    const companyId = req.user?.companyId || req.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    //console.log('⚡ [AutoPatternAPI] Running immediate detection...');

    const result = await autoPatternService.runImmediateDetection(companyId);
    
    res.json({
      success: true,
      message: 'تم تشغيل الاكتشاف الفوري بنجاح',
      data: result
    });
  } catch (error) {
    console.error('❌ Error running immediate detection:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تشغيل الاكتشاف الفوري',
      error: error.message
    });
  }
});

/**
 * PUT /api/v1/auto-patterns/interval
 * تغيير فترة الاكتشاف التلقائي
 */
router.put('/interval', async (req, res) => {
  try {
    const { minutes } = req.body;
    
    if (!minutes || minutes < 5 || minutes > 1440) {
      return res.status(400).json({
        success: false,
        message: 'فترة الاكتشاف يجب أن تكون بين 5 دقائق و 24 ساعة'
      });
    }
    
    autoPatternService.setDetectionInterval(minutes);
    
    res.json({
      success: true,
      message: `تم تغيير فترة الاكتشاف إلى ${minutes} دقيقة`,
      data: autoPatternService.getStatus()
    });
  } catch (error) {
    console.error('❌ Error changing detection interval:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تغيير فترة الاكتشاف',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/auto-patterns/companies
 * إضافة شركة للمراقبة
 */
router.post('/companies', async (req, res) => {
  try {
    // استخدام companyId من المستخدم المصادق عليه
    const companyId = req.user?.companyId || req.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }
    
    autoPatternService.addCompany(companyId);
    
    res.json({
      success: true,
      message: `تم إضافة الشركة ${companyId} للمراقبة`,
      data: autoPatternService.getStatus()
    });
  } catch (error) {
    console.error('❌ Error adding company:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إضافة الشركة',
      error: error.message
    });
  }
});

/**
 * DELETE /api/v1/auto-patterns/companies/:companyId
 * إزالة شركة من المراقبة
 */
router.delete('/companies/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    autoPatternService.removeCompany(companyId);
    
    res.json({
      success: true,
      message: `تم إزالة الشركة ${companyId} من المراقبة`,
      data: autoPatternService.getStatus()
    });
  } catch (error) {
    console.error('❌ Error removing company:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إزالة الشركة',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/auto-patterns/history
 * الحصول على تاريخ الاكتشافات
 */
router.get('/history', async (req, res) => {
  try {
    const status = autoPatternService.getStatus();

    res.json({
      success: true,
      data: {
        lastDetection: status.lastDetection,
        serviceUptime: process.uptime(),
        isRunning: status.isRunning,
        totalCompanies: status.companies.length,
        companies: status.companies
      }
    });
  } catch (error) {
    console.error('❌ Error getting detection history:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في الحصول على تاريخ الاكتشافات',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/auto-patterns/public/detect-now
 * تشغيل اكتشاف فوري للأنماط (عام للاختبار)
 */
router.post('/public/detect-now', async (req, res) => {
  try {
    //console.log('⚡ [AutoPatternAPI] Running immediate detection (public)...');

    // تشغيل اكتشاف لجميع الشركات
    const result = await autoPatternService.runImmediateDetection();

    res.json({
      success: true,
      message: 'تم تشغيل الاكتشاف الفوري بنجاح',
      data: result
    });
  } catch (error) {
    console.error('❌ Error running immediate detection:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تشغيل الاكتشاف الفوري',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/auto-patterns/health
 * فحص صحة الخدمة
 */
router.get('/health', async (req, res) => {
  try {
    const status = autoPatternService.getStatus();
    const isHealthy = status.isRunning && (!status.lastDetection || 
      (Date.now() - new Date(status.lastDetection.timestamp).getTime()) < status.detectionInterval * 2);
    
    res.json({
      success: true,
      data: {
        healthy: isHealthy,
        status: status.isRunning ? 'running' : 'stopped',
        lastDetection: status.lastDetection?.timestamp,
        nextDetection: status.nextDetection,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('❌ Error checking service health:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في فحص صحة الخدمة',
      error: error.message
    });
  }
});

module.exports = router;
