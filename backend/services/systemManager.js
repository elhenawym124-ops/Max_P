/**
 * System Manager Service
 * إدارة أنظمة النظام - تفعيل وتعطيل الأنظمة المختلفة
 */

const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');

class SystemManager {
  constructor() {
    this.prisma = getSharedPrismaClient();
    this.systems = new Map();
    this.systemInstances = new Map();
    
    //console.log('🔧 [SystemManager] Service initialized');
    this.initializeSystemDefinitions();
  }

  /**
   * تعريف الأنظمة المتاحة
   */
  initializeSystemDefinitions() {
    const systemDefinitions = [
      {
        systemName: 'autoPatternDetection',
        displayName: 'Auto Pattern Detection',
        description: 'اكتشاف تلقائي للأنماط كل ساعتين',
        category: 'ai_learning',
        defaultEnabled: true,
        config: {
          interval: 7200000, // 2 hours
          aiCalls: 'high',
          resourceUsage: 'high'
        }
      },
      {
        systemName: 'continuousLearning',
        displayName: 'Continuous Learning',
        description: 'تعلم مستمر كل 30 دقيقة',
        category: 'ai_learning',
        defaultEnabled: true,
        config: {
          interval: 1800000, // 30 minutes
          aiCalls: 'medium',
          resourceUsage: 'medium'
        }
      },
      {
        systemName: 'qualityMonitor',
        displayName: 'Quality Monitor',
        description: 'تقييم جودة كل رد بـ AI',
        category: 'ai_learning',
        defaultEnabled: true,
        config: {
          evaluateEveryResponse: true,
          aiCalls: 'very_high',
          resourceUsage: 'high'
        }
      },
      {
        systemName: 'responseOptimizer',
        displayName: 'Response Optimizer',
        description: 'تحسين الردود بـ AI',
        category: 'ai_learning',
        defaultEnabled: true,
        config: {
          optimizeEveryResponse: true,
          aiCalls: 'high',
          resourceUsage: 'medium'
        }
      },
      {
        systemName: 'patternApplication',
        displayName: 'Pattern Application',
        description: 'تطبيق الأنماط على الردود',
        category: 'ai_learning',
        defaultEnabled: true,
        config: {
          applyToEveryResponse: true,
          aiCalls: 'medium',
          resourceUsage: 'low'
        }
      },
      {
        systemName: 'promptEnhancement',
        displayName: 'Prompt Enhancement',
        description: 'تحسين الـ prompts',
        category: 'ai_learning',
        defaultEnabled: true,
        config: {
          enhancePrompts: true,
          aiCalls: 'medium',
          resourceUsage: 'low'
        }
      },
      {
        systemName: 'simpleMonitor',
        displayName: 'Simple Monitor',
        description: 'مراقبة النظام كل 5 دقائق',
        category: 'monitoring',
        defaultEnabled: true,
        config: {
          interval: 300000, // 5 minutes
          aiCalls: 'none',
          resourceUsage: 'low'
        }
      },
      {
        systemName: 'simpleAlerts',
        displayName: 'Simple Alerts',
        description: 'تنبيهات النظام كل 5 دقائق',
        category: 'monitoring',
        defaultEnabled: true,
        config: {
          interval: 300000, // 5 minutes
          aiCalls: 'none',
          resourceUsage: 'low'
        }
      },
      {
        systemName: 'reportGenerator',
        displayName: 'Report Generator',
        description: 'تقارير دورية يومية',
        category: 'monitoring',
        defaultEnabled: true,
        config: {
          dailyReports: true,
          aiCalls: 'none',
          resourceUsage: 'low'
        }
      },
      {
        systemName: 'securityMonitoring',
        displayName: 'Security Monitoring',
        description: 'مراقبة الأمان المستمرة',
        category: 'security',
        defaultEnabled: true,
        config: {
          continuous: true,
          aiCalls: 'none',
          resourceUsage: 'low'
        }
      }
    ];

    // حفظ تعريفات الأنظمة
    systemDefinitions.forEach(system => {
      this.systems.set(system.systemName, system);
    });

    //console.log(`🔧 [SystemManager] Loaded ${systemDefinitions.length} system definitions`);
  }

  /**
   * تهيئة إعدادات الأنظمة في قاعدة البيانات
   */
  async initializeSystemSettings() {
    try {
      // إنشاء الجدول إذا لم يكن موجود (fallback)
      await this.createSystemSettingsTable();

      // إضافة الأنظمة المفقودة
      for (const [systemName, definition] of this.systems) {
        await this.ensureSystemExists(systemName, definition);
      }

      //console.log('✅ [SystemManager] System settings initialized');
    } catch (error) {
      console.error('❌ [SystemManager] Failed to initialize system settings:', error);
    }
  }

  /**
   * إنشاء جدول system_settings (fallback)
   */
  async createSystemSettingsTable() {
    try {
      // SECURITY NOTE: CREATE TABLE is safe - no user input, system initialization only
      await executeWithRetry(async () => {
        await this.prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS system_settings (
            id VARCHAR(191) NOT NULL PRIMARY KEY,
            systemName VARCHAR(191) NOT NULL UNIQUE,
            displayName VARCHAR(191) NOT NULL,
            description TEXT,
            category VARCHAR(191) NOT NULL DEFAULT 'general',
            isEnabled BOOLEAN NOT NULL DEFAULT true,
            config JSON,
            resourceUsage JSON,
            lastStatusChange DATETIME(3),
            createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
          )
        `;
      });
      //console.log('✅ [SystemManager] system_settings table ensured');
    } catch (error) {
      //console.log('ℹ️ [SystemManager] system_settings table already exists or error:', error.message);
    }
  }

  /**
   * التأكد من وجود النظام في قاعدة البيانات
   */
  async ensureSystemExists(systemName, definition) {
    try {
      // SECURITY FIX: Use Prisma ORM instead of raw SQL
      const existing = await executeWithRetry(async () => {
        return await this.prisma.systemSettings.findFirst({
          where: { systemName }
        });
      });

      if (!existing) {
        // SECURITY FIX: Use Prisma ORM instead of raw SQL
        await executeWithRetry(async () => {
          await this.prisma.systemSettings.create({
            data: {
              id: `sys_${systemName}`,
              systemName,
              displayName: definition.displayName,
              description: definition.description,
              category: definition.category,
              isEnabled: definition.defaultEnabled,
              config: JSON.stringify(definition.config),
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        });
        //console.log(`✅ [SystemManager] Added system: ${systemName}`);
      }
    } catch (error) {
      console.error(`❌ [SystemManager] Error ensuring system ${systemName}:`, error);
    }
  }

  /**
   * الحصول على جميع الأنظمة
   */
  async getAllSystems() {
    try {
      // SECURITY FIX: Use Prisma ORM instead of raw SQL
      const systems = await executeWithRetry(async () => {
        return await this.prisma.systemSettings.findMany({
          orderBy: [
            { category: 'asc' },
            { displayName: 'asc' }
          ]
        });
      });
      return systems || [];
    } catch (error) {
      console.error('❌ [SystemManager] Error getting systems:', error);
      return [];
    }
  }

  /**
   * تفعيل/تعطيل نظام
   */
  async toggleSystem(systemName, isEnabled) {
    try {
      // SECURITY FIX: Use Prisma ORM instead of raw SQL
      await executeWithRetry(async () => {
        await this.prisma.systemSettings.update({
          where: { systemName },
          data: {
            isEnabled,
            lastStatusChange: new Date(),
            updatedAt: new Date()
          }
        });
      });

      // تطبيق التغيير على النظام الفعلي
      await this.applySystemChange(systemName, isEnabled);

      //console.log(`🔧 [SystemManager] ${systemName} ${isEnabled ? 'enabled' : 'disabled'}`);
      return true;
    } catch (error) {
      console.error(`❌ [SystemManager] Error toggling ${systemName}:`, error);
      return false;
    }
  }

  /**
   * تطبيق التغيير على النظام الفعلي
   */
  async applySystemChange(systemName, isEnabled) {
    try {
      switch (systemName) {
        case 'autoPatternDetection':
          await this.toggleAutoPatternDetection(isEnabled);
          break;
        case 'qualityMonitor':
          await this.toggleQualityMonitor(isEnabled);
          break;
        // يمكن إضافة المزيد من الأنظمة هنا
        default:
          //console.log(`ℹ️ [SystemManager] No specific handler for ${systemName}`);
      }
    } catch (error) {
      console.error(`❌ [SystemManager] Error applying change to ${systemName}:`, error);
    }
  }

  /**
   * تفعيل/تعطيل Auto Pattern Detection
   */
  async toggleAutoPatternDetection(isEnabled) {
    try {
      const autoPatternService = require('./autoPatternDetectionService');
      if (isEnabled) {
        autoPatternService.start();
      } else {
        autoPatternService.stop();
      }
    } catch (error) {
      console.error('❌ [SystemManager] Error toggling AutoPatternDetection:', error);
    }
  }

  /**
   * تفعيل/تعطيل Quality Monitor
   */
  async toggleQualityMonitor(isEnabled) {
    try {
      const QualityMonitorService = require('./qualityMonitorService');
      // سيتم تنفيذ هذا لاحقاً
      //console.log(`🔧 [SystemManager] Quality Monitor ${isEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('❌ [SystemManager] Error toggling QualityMonitor:', error);
    }
  }

  /**
   * فحص حالة نظام
   */
  async isSystemEnabled(systemName) {
    try {
      // SECURITY FIX: Use Prisma ORM instead of raw SQL
      const result = await executeWithRetry(async () => {
        return await this.prisma.systemSettings.findFirst({
          where: { systemName },
          select: { isEnabled: true }
        });
      });
      return result ? result.isEnabled : false;
    } catch (error) {
      console.error(`❌ [SystemManager] Error checking ${systemName}:`, error);
      return false;
    }
  }

  /**
   * الحصول على إحصائيات الأنظمة
   */
  async getSystemStats() {
    try {
      const systems = await this.getAllSystems();
      const stats = {
        total: systems.length,
        enabled: systems.filter(s => s.isEnabled).length,
        disabled: systems.filter(s => !s.isEnabled).length,
        byCategory: {}
      };

      // تجميع حسب الفئة
      systems.forEach(system => {
        if (!stats.byCategory[system.category]) {
          stats.byCategory[system.category] = { total: 0, enabled: 0, disabled: 0 };
        }
        stats.byCategory[system.category].total++;
        if (system.isEnabled) {
          stats.byCategory[system.category].enabled++;
        } else {
          stats.byCategory[system.category].disabled++;
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ [SystemManager] Error getting stats:', error);
      return null;
    }
  }
}

// إنشاء instance واحد
const systemManager = new SystemManager();

module.exports = systemManager;
