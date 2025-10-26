/**
 * System Management Routes
 * مسارات إدارة أنظمة النظام
 */

const express = require('express');
const router = express.Router();
const systemManager = require('../services/systemManager');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

/**
 * GET /api/v1/admin/systems
 * الحصول على جميع الأنظمة
 */
router.get('/systems', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const systems = await systemManager.getAllSystems();
    const stats = await systemManager.getSystemStats();

    res.json({
      success: true,
      data: {
        systems,
        stats
      },
      message: 'تم جلب الأنظمة بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting systems:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الأنظمة',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/admin/systems/:systemName/toggle
 * تفعيل/تعطيل نظام
 */
router.post('/systems/:systemName/toggle', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { systemName } = req.params;
    const { isEnabled } = req.body;

    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isEnabled يجب أن يكون true أو false'
      });
    }

    const success = await systemManager.toggleSystem(systemName, isEnabled);

    if (success) {
      res.json({
        success: true,
        data: {
          systemName,
          isEnabled
        },
        message: `تم ${isEnabled ? 'تفعيل' : 'تعطيل'} النظام بنجاح`
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'فشل في تغيير حالة النظام'
      });
    }
  } catch (error) {
    console.error('❌ [SystemManagement] Error toggling system:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير حالة النظام',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/systems/:systemName/status
 * فحص حالة نظام معين
 */
router.get('/systems/:systemName/status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { systemName } = req.params;
    const isEnabled = await systemManager.isSystemEnabled(systemName);

    res.json({
      success: true,
      data: {
        systemName,
        isEnabled
      },
      message: 'تم جلب حالة النظام بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting system status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة النظام',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/systems/stats
 * الحصول على إحصائيات الأنظمة
 */
router.get('/systems/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const stats = await systemManager.getSystemStats();

    res.json({
      success: true,
      data: stats,
      message: 'تم جلب إحصائيات الأنظمة بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting system stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات الأنظمة',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/admin/systems/bulk-toggle
 * تفعيل/تعطيل عدة أنظمة مرة واحدة
 */
router.post('/systems/bulk-toggle', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { systems } = req.body; // [{ systemName, isEnabled }, ...]

    if (!Array.isArray(systems)) {
      return res.status(400).json({
        success: false,
        message: 'systems يجب أن يكون مصفوفة'
      });
    }

    const results = [];
    for (const system of systems) {
      const { systemName, isEnabled } = system;
      const success = await systemManager.toggleSystem(systemName, isEnabled);
      results.push({
        systemName,
        isEnabled,
        success
      });
    }

    res.json({
      success: true,
      data: results,
      message: 'تم تحديث الأنظمة بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error bulk toggling systems:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الأنظمة',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/admin/systems/initialize
 * تهيئة إعدادات الأنظمة
 */
router.post('/systems/initialize', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    await systemManager.initializeSystemSettings();

    res.json({
      success: true,
      message: 'تم تهيئة إعدادات الأنظمة بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error initializing systems:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تهيئة إعدادات الأنظمة',
      error: error.message
    });
  }
});

module.exports = router;