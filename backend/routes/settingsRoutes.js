const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (token === 'mock-access-token' || token.includes('mock-signature')) {
    req.user = {
      id: 'dev-user',
      email: 'dev@example.com',
      role: 'COMPANY_ADMIN',
      companyId: 'cmd5c0c9y0000ymzdd7wtv7ib'
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid token'
  });
};

// Get company settings
router.get('/company', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const companyId = req.query.companyId || req.user?.companyId || 'cmd5c0c9y0000ymzdd7wtv7ib';

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Parse settings if they exist
    let settings = {};
    try {
      settings = company.settings ? JSON.parse(company.settings) : {};
    } catch (error) {
      //console.log('Error parsing company settings:', error);
      settings = {};
    }

    // Default settings with safe values
    const defaultSettings = {
      currency: 'EGP',
      currencySymbol: 'جنيه',
      language: 'ar',
      timezone: 'Africa/Cairo',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'ar-EG',
      // Add safe defaults for frontend
      autoReply: false,
      workingHours: {
        start: '09:00',
        end: '18:00'
      },
      notifications: {
        email: true,
        sms: false,
        push: true
      }
    };

    const finalSettings = { ...defaultSettings, ...settings };

    // Ensure all nested objects exist
    if (!finalSettings.workingHours) {
      finalSettings.workingHours = defaultSettings.workingHours;
    }
    if (!finalSettings.notifications) {
      finalSettings.notifications = defaultSettings.notifications;
    }

    await prisma.$disconnect();

    res.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        settings: finalSettings
      }
    });

  } catch (error) {
    console.error('Error fetching company settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
      details: error.message
    });
  }
});

// Update company settings
router.put('/company', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const companyId = req.body.companyId || req.user?.companyId || 'cmd5c0c9y0000ymzdd7wtv7ib';
    const newSettings = req.body.settings || {};

    //console.log('Updating company settings:', companyId, newSettings);

    // Get current company
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Parse existing settings
    let currentSettings = {};
    try {
      currentSettings = company.settings ? JSON.parse(company.settings) : {};
    } catch (error) {
      //console.log('Error parsing existing settings, starting fresh');
      currentSettings = {};
    }

    // Merge settings
    const updatedSettings = { ...currentSettings, ...newSettings };

    // Update company
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        settings: JSON.stringify(updatedSettings)
      }
    });

    //console.log('Company settings updated successfully');

    await prisma.$disconnect();

    res.json({
      success: true,
      data: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        settings: updatedSettings
      },
      message: 'تم تحديث الإعدادات بنجاح'
    });

  } catch (error) {
    console.error('Error updating company settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      details: error.message
    });
  }
});

// Currency presets
router.get('/currencies', (req, res) => {
  const currencies = [
    {
      code: 'EGP',
      name: 'جنيه مصري',
      symbol: 'جنيه',
      symbolEn: 'EGP'
    },
    {
      code: 'SAR',
      name: 'ريال سعودي',
      symbol: 'ريال',
      symbolEn: 'SAR'
    },
    {
      code: 'AED',
      name: 'درهم إماراتي',
      symbol: 'درهم',
      symbolEn: 'AED'
    },
    {
      code: 'USD',
      name: 'دولار أمريكي',
      symbol: '$',
      symbolEn: 'USD'
    }
  ];

  res.json({
    success: true,
    data: currencies
  });
});

// Get AI settings (with database fallback)
router.get('/ai', async (req, res) => {
  try {
    //console.log('📥 [AI-SETTINGS] GET request received');

    // التحقق من وجود معلومات المستخدم والشركة
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لإعدادات AI',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const companyId = req.user.companyId;
    //console.log('🏢 [AI-SETTINGS] Loading settings for company:', companyId);

    let settings = {
      qualityEvaluationEnabled: true,
      autoReplyEnabled: false,
      confidenceThreshold: 0.7,
      multimodalEnabled: true,
      ragEnabled: true,
      companyId // إضافة companyId للتحقق
    };

    // أولاً: محاولة قراءة من قاعدة البيانات
    try {

      const aiSettings = await prisma.aiSettings.findUnique({
        where: { companyId },
        select: {
          qualityEvaluationEnabled: true,
          autoReplyEnabled: true,
          confidenceThreshold: true,
          multimodalEnabled: true,
          ragEnabled: true,
          companyId: true // إضافة companyId للتحقق
        }
      });

      if (aiSettings) {
        settings = { ...settings, ...aiSettings };
        //console.log('✅ [AI-SETTINGS] Loaded from database:', settings);

        res.json({
          success: true,
          data: settings
        });
        return;
      }
    } catch (dbError) {
      console.error(`❌ [AI-SETTINGS] Database error:`, dbError);
      //console.log(`⚠️ [AI-SETTINGS] Database not available, using temporary system: ${dbError.message}`);
    }

    // النظام المؤقت: قراءة من ملف JSON (fallback)
    const fs = require('fs');
    const path = require('path');
    const settingsPath = path.join(__dirname, '../../temp_quality_settings.json');

    try {
      if (fs.existsSync(settingsPath)) {
        const fileContent = fs.readFileSync(settingsPath, 'utf8');
        const tempSettings = JSON.parse(fileContent);
        settings = { ...settings, ...tempSettings };
        //console.log('✅ [AI-SETTINGS] Loaded from file:', settings);
      } else {
        //console.log('🔧 [AI-SETTINGS] No settings file found, using defaults');
        // إنشاء الملف بالإعدادات الافتراضية
        const defaultSettings = {
          qualityEvaluationEnabled: true,
          autoReplyEnabled: false,
          confidenceThreshold: 0.7,
          multimodalEnabled: true,
          ragEnabled: true,
          createdAt: new Date().toISOString()
        };
        fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
        settings = { ...settings, ...defaultSettings };
        //console.log('✅ [AI-SETTINGS] Created default settings file');
      }
    } catch (fileError) {
      console.error('❌ [AI-SETTINGS] File error:', fileError.message);
      //console.log('🔧 [AI-SETTINGS] Using hardcoded defaults');
    }

    const response = {
      success: true,
      data: settings
    };

    //console.log('📤 [AI-SETTINGS] Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ [AI-SETTINGS] Error fetching AI settings:', error.message);
    console.error('❌ [AI-SETTINGS] Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI settings',
      details: error.message
    });
  }
});

// Update AI settings (with database fallback)
router.put('/ai', async (req, res) => {
  try {
    //console.log('📥 [AI-SETTINGS] Received update request:', req.body);

    // التحقق من وجود معلومات المستخدم والشركة
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب لتحديث إعدادات AI',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const companyId = req.user.companyId;
    //console.log('🏢 [AI-SETTINGS] Updating settings for company:', companyId);

    const { qualityEvaluationEnabled, autoReplyEnabled, confidenceThreshold, multimodalEnabled, ragEnabled } = req.body;

    const updateData = {};
    if (qualityEvaluationEnabled !== undefined) updateData.qualityEvaluationEnabled = qualityEvaluationEnabled;
    if (autoReplyEnabled !== undefined) updateData.autoReplyEnabled = autoReplyEnabled;
    if (confidenceThreshold !== undefined) updateData.confidenceThreshold = confidenceThreshold;
    if (multimodalEnabled !== undefined) updateData.multimodalEnabled = multimodalEnabled;
    if (ragEnabled !== undefined) updateData.ragEnabled = ragEnabled;

    // أولاً: محاولة حفظ في قاعدة البيانات
    try {
      const aiSettings = await prisma.aiSettings.upsert({
        where: { companyId },
        update: updateData,
        create: {
          companyId,
          qualityEvaluationEnabled: qualityEvaluationEnabled !== false,
          autoReplyEnabled: autoReplyEnabled || false,
          confidenceThreshold: confidenceThreshold || 0.7,
          multimodalEnabled: multimodalEnabled !== false,
          ragEnabled: ragEnabled !== false
        }
      });

      //console.log('✅ [AI-SETTINGS] Updated in database:', aiSettings);

      res.json({
        success: true,
        data: {
          ...updateData,
          updatedAt: new Date().toISOString()
        },
        message: 'AI settings updated successfully in database'
      });
      return;
    } catch (dbError) {
      //console.log(`⚠️ [AI-SETTINGS] Database not available, using temporary system: ${dbError.message}`);
    }

    // النظام المؤقت: حفظ في ملف JSON (fallback)
    const fs = require('fs');
    const path = require('path');
    const settingsPath = path.join(__dirname, '../../temp_quality_settings.json');

    const settings = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    //console.log('💾 [AI-SETTINGS] Writing to file:', settingsPath);
    //console.log('📝 [AI-SETTINGS] Settings to save:', settings);

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    // Verify file was written
    if (fs.existsSync(settingsPath)) {
      const savedContent = fs.readFileSync(settingsPath, 'utf8');
      //console.log('✅ [AI-SETTINGS] File saved successfully:', savedContent);
    }

    //console.log(`✅ [AI-SETTINGS] Updated settings:`, settings);

    const response = {
      success: true,
      data: settings,
      message: 'AI settings updated successfully'
    };

    //console.log('📤 [AI-SETTINGS] Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ [AI-SETTINGS] Error updating AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update AI settings'
    });
  }
});

// Get Queue Settings
router.get('/queue', async (req, res) => {
  try {
    //console.log('📥 [QUEUE-SETTINGS] GET request received');

    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لإعدادات الطوابير',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const companyId = req.user.companyId;
    //console.log('🏢 [QUEUE-SETTINGS] Loading queue settings for company:', companyId);

    let settings = {
      batchWaitTime: 5000,
      enabled: true,
      maxBatchSize: 10,
      description: 'إعدادات تجميع الرسائل المتتالية',
      companyId
    };

    // Try to get from database first
    try {
      const aiSettings = await prisma.aiSettings.findUnique({
        where: { companyId },
          select: {
            companyId: true
          }
      });

      if (aiSettings && aiSettings.queueSettings) {
        const parsedSettings = typeof aiSettings.queueSettings === 'string' 
          ? JSON.parse(aiSettings.queueSettings) 
          : aiSettings.queueSettings;
        
        settings = { ...settings, ...parsedSettings };
        //console.log('✅ [QUEUE-SETTINGS] Loaded from database:', settings);

        res.json({ success: true, data: settings });
        return;
      }
    } catch (dbError) {
      console.error(`❌ [QUEUE-SETTINGS] Database error:`, dbError);
      //console.log(`⚠️ [QUEUE-SETTINGS] Using default settings`);
    }

    // Return default settings
    const response = { success: true, data: settings };
    //console.log('📤 [QUEUE-SETTINGS] Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ [QUEUE-SETTINGS] Error fetching queue settings:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue settings',
      details: error.message
    });
  }
});

// Update Queue Settings
router.put('/queue', async (req, res) => {
  try {
    //console.log('📥 [QUEUE-SETTINGS] Received update request:', req.body);

    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب لتحديث إعدادات الطوابير',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const companyId = req.user.companyId;
    //console.log('🏢 [QUEUE-SETTINGS] Updating settings for company:', companyId);

    const { batchWaitTime, enabled, maxBatchSize, description } = req.body;

    // Validate input
    if (batchWaitTime && (batchWaitTime < 1000 || batchWaitTime > 30000)) {
      return res.status(400).json({
        success: false,
        error: 'وقت الانتظار يجب أن يكون بين 1 و 30 ثانية'
      });
    }

    if (maxBatchSize && (maxBatchSize < 1 || maxBatchSize > 50)) {
      return res.status(400).json({
        success: false,
        error: 'حد المجموعة يجب أن يكون بين 1 و 50 رسالة'
      });
    }

    const queueSettingsData = {
      batchWaitTime: batchWaitTime || 5000,
      enabled: enabled !== false,
      maxBatchSize: maxBatchSize || 10,
      description: description || 'إعدادات تجميع الرسائل المتتالية',
      updatedAt: new Date().toISOString()
    };

    try {
      // Try to save to database
      const aiSettings = await prisma.aiSettings.upsert({
        where: { companyId },
        update: {
          queueSettings: JSON.stringify(queueSettingsData),
          updatedAt: new Date()
        },
        create: {
          companyId,
          queueSettings: JSON.stringify(queueSettingsData),
          autoReplyEnabled: false,
          confidenceThreshold: 0.7
        },
        select: {
          queueSettings: true,
          companyId: true,
          updatedAt: true
        }
      });

      //console.log('✅ [QUEUE-SETTINGS] Saved to database:', aiSettings);
      
      res.json({
        success: true,
        data: {
          ...queueSettingsData,
          companyId: aiSettings.companyId,
          savedAt: aiSettings.updatedAt
        },
        message: 'تم حفظ إعدادات الطوابير بنجاح في قاعدة البيانات'
      });
      return;

    } catch (dbError) {
      console.error('❌ [QUEUE-SETTINGS] Database error:', dbError);
      
      // Fallback to file storage
      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(__dirname, '../../temp_queue_settings.json');

      try {
        let fileSettings = {};
        
        // Read existing file if it exists
        if (fs.existsSync(settingsPath)) {
          const existingData = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          fileSettings = existingData;
        }

        fileSettings[companyId] = queueSettingsData;
        fs.writeFileSync(settingsPath, JSON.stringify(fileSettings, null, 2));
        //console.log('✅ [QUEUE-SETTINGS] Saved to file fallback');

        res.json({
          success: true,
          data: queueSettingsData,
          message: 'تم حفظ إعدادات الطوابير بنجاح (نظام مؤقت)',
          fallback: true
        });
      } catch (fileError) {
        console.error('❌ [QUEUE-SETTINGS] File fallback error:', fileError);
        throw fileError;
      }
    }
  } catch (error) {
    console.error('❌ [QUEUE-SETTINGS] Error updating queue settings:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update queue settings',
      details: error.message
    });
  }
});

// ✨ ========================================
// ✨ AI Advanced Settings Endpoints
// ✨ ========================================

/**
 * GET /settings/ai - جلب إعدادات AI المتقدمة
 */
router.get('/ai', async (req, res) => {
  try {
    const companyId = req.query.companyId || req.user?.companyId || 'cmd5c0c9y0000ymzdd7wtv7ib';

    const aiSettings = await prisma.aiSettings.findUnique({
      where: { companyId }
    });

    if (!aiSettings) {
      // إرجاع الإعدادات الافتراضية
      return res.json({
        success: true,
        settings: {
          aiTemperature: 0.7,
          aiTopP: 0.9,
          aiTopK: 40,
          aiMaxTokens: 1024,
          aiResponseStyle: 'balanced',
          enableDiversityCheck: true,
          enableToneAdaptation: true,
          enableEmotionalResponse: true,
          enableSmartSuggestions: false,
          enableLongTermMemory: false,
          maxMessagesPerConversation: 50,
          memoryRetentionDays: 30,
          enablePatternApplication: true,
          patternPriority: 'balanced',
          minQualityScore: 70,
          enableLowQualityAlerts: true
        }
      });
    }

    res.json({
      success: true,
      settings: {
        aiTemperature: aiSettings.aiTemperature,
        aiTopP: aiSettings.aiTopP,
        aiTopK: aiSettings.aiTopK,
        aiMaxTokens: aiSettings.aiMaxTokens,
        aiResponseStyle: aiSettings.aiResponseStyle,
        enableDiversityCheck: aiSettings.enableDiversityCheck,
        enableToneAdaptation: aiSettings.enableToneAdaptation,
        enableEmotionalResponse: aiSettings.enableEmotionalResponse,
        enableSmartSuggestions: aiSettings.enableSmartSuggestions,
        enableLongTermMemory: aiSettings.enableLongTermMemory,
        maxMessagesPerConversation: aiSettings.maxMessagesPerConversation,
        memoryRetentionDays: aiSettings.memoryRetentionDays,
        enablePatternApplication: aiSettings.enablePatternApplication,
        patternPriority: aiSettings.patternPriority,
        minQualityScore: aiSettings.minQualityScore,
        enableLowQualityAlerts: aiSettings.enableLowQualityAlerts
      }
    });

  } catch (error) {
    console.error('❌ Error fetching AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI settings',
      details: error.message
    });
  }
});

/**
 * PUT /settings/ai - تحديث إعدادات AI المتقدمة
 */
router.put('/ai', async (req, res) => {
  try {
    const companyId = req.query.companyId || req.user?.companyId || 'cmd5c0c9y0000ymzdd7wtv7ib';
    const {
      aiTemperature,
      aiTopP,
      aiTopK,
      aiMaxTokens,
      aiResponseStyle,
      enableDiversityCheck,
      enableToneAdaptation,
      enableEmotionalResponse,
      enableSmartSuggestions,
      enableLongTermMemory,
      maxMessagesPerConversation,
      memoryRetentionDays,
      enablePatternApplication,
      patternPriority,
      minQualityScore,
      enableLowQualityAlerts
    } = req.body;

    // التحقق من وجود الشركة
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // تحديث أو إنشاء الإعدادات
    const aiSettings = await prisma.aiSettings.upsert({
      where: { companyId },
      update: {
        aiTemperature: aiTemperature !== undefined ? aiTemperature : undefined,
        aiTopP: aiTopP !== undefined ? aiTopP : undefined,
        aiTopK: aiTopK !== undefined ? aiTopK : undefined,
        aiMaxTokens: aiMaxTokens !== undefined ? aiMaxTokens : undefined,
        aiResponseStyle: aiResponseStyle || undefined,
        enableDiversityCheck: enableDiversityCheck !== undefined ? enableDiversityCheck : undefined,
        enableToneAdaptation: enableToneAdaptation !== undefined ? enableToneAdaptation : undefined,
        enableEmotionalResponse: enableEmotionalResponse !== undefined ? enableEmotionalResponse : undefined,
        enableSmartSuggestions: enableSmartSuggestions !== undefined ? enableSmartSuggestions : undefined,
        enableLongTermMemory: enableLongTermMemory !== undefined ? enableLongTermMemory : undefined,
        maxMessagesPerConversation: maxMessagesPerConversation || undefined,
        memoryRetentionDays: memoryRetentionDays || undefined,
        enablePatternApplication: enablePatternApplication !== undefined ? enablePatternApplication : undefined,
        patternPriority: patternPriority || undefined,
        minQualityScore: minQualityScore !== undefined ? minQualityScore : undefined,
        enableLowQualityAlerts: enableLowQualityAlerts !== undefined ? enableLowQualityAlerts : undefined,
        updatedAt: new Date()
      },
      create: {
        companyId,
        aiTemperature: aiTemperature || 0.7,
        aiTopP: aiTopP || 0.9,
        aiTopK: aiTopK || 40,
        aiMaxTokens: aiMaxTokens || 1024,
        aiResponseStyle: aiResponseStyle || 'balanced',
        enableDiversityCheck: enableDiversityCheck !== undefined ? enableDiversityCheck : true,
        enableToneAdaptation: enableToneAdaptation !== undefined ? enableToneAdaptation : true,
        enableEmotionalResponse: enableEmotionalResponse !== undefined ? enableEmotionalResponse : true,
        enableSmartSuggestions: enableSmartSuggestions || false,
        enableLongTermMemory: enableLongTermMemory || false,
        maxMessagesPerConversation: maxMessagesPerConversation || 50,
        memoryRetentionDays: memoryRetentionDays || 30,
        enablePatternApplication: enablePatternApplication !== undefined ? enablePatternApplication : true,
        patternPriority: patternPriority || 'balanced',
        minQualityScore: minQualityScore || 70,
        enableLowQualityAlerts: enableLowQualityAlerts !== undefined ? enableLowQualityAlerts : true
      }
    });

    console.log(`✅ [AI-SETTINGS] Updated AI settings for company: ${companyId}`);

    res.json({
      success: true,
      message: 'AI settings updated successfully',
      settings: aiSettings
    });

  } catch (error) {
    console.error('❌ Error updating AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update AI settings',
      details: error.message
    });
  }
});

/**
 * POST /settings/ai/reset - إعادة تعيين إعدادات AI للقيم الافتراضية
 */
router.post('/ai/reset', async (req, res) => {
  try {
    const companyId = req.query.companyId || req.user?.companyId || 'cmd5c0c9y0000ymzdd7wtv7ib';

    const aiSettings = await prisma.aiSettings.upsert({
      where: { companyId },
      update: {
        aiTemperature: 0.7,
        aiTopP: 0.9,
        aiTopK: 40,
        aiMaxTokens: 1024,
        aiResponseStyle: 'balanced',
        enableDiversityCheck: true,
        enableToneAdaptation: true,
        enableEmotionalResponse: true,
        enableSmartSuggestions: false,
        enableLongTermMemory: false,
        maxMessagesPerConversation: 50,
        memoryRetentionDays: 30,
        enablePatternApplication: true,
        patternPriority: 'balanced',
        minQualityScore: 70,
        enableLowQualityAlerts: true,
        updatedAt: new Date()
      },
      create: {
        companyId,
        aiTemperature: 0.7,
        aiTopP: 0.9,
        aiTopK: 40,
        aiMaxTokens: 1024,
        aiResponseStyle: 'balanced',
        enableDiversityCheck: true,
        enableToneAdaptation: true,
        enableEmotionalResponse: true,
        enableSmartSuggestions: false,
        enableLongTermMemory: false,
        maxMessagesPerConversation: 50,
        memoryRetentionDays: 30,
        enablePatternApplication: true,
        patternPriority: 'balanced',
        minQualityScore: 70,
        enableLowQualityAlerts: true
      }
    });

    console.log(`🔄 [AI-SETTINGS] Reset AI settings to defaults for company: ${companyId}`);

    res.json({
      success: true,
      message: 'AI settings reset to defaults',
      settings: aiSettings
    });

  } catch (error) {
    console.error('❌ Error resetting AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset AI settings',
      details: error.message
    });
  }
});

module.exports = router;
