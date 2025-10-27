/**
 * خدمة الصيانة الدورية للأنماط
 * Scheduled Pattern Maintenance Service
 */

const cron = require('node-cron');
const { getSharedPrismaClient } = require('./sharedDatabase');
const PatternCleanupService = require('./patternCleanupService');

class ScheduledPatternMaintenanceService {
  constructor() {
    this.prisma = getSharedPrismaClient(); // Use shared database connection
    this.patternCleanup = new PatternCleanupService();
    this.isRunning = false;
    this.lastRun = null;
    this.stats = {
      totalRuns: 0,
      totalPatternsProcessed: 0,
      totalPatternsDeleted: 0,
      totalPatternsArchived: 0,
      lastRunDuration: 0
    };
    
    //console.log('🕐 [ScheduledMaintenance] Service initialized');
  }

  /**
   * بدء الصيانة الدورية
   */
  start() {
    //console.log('🚀 [ScheduledMaintenance] Starting scheduled maintenance...');

    // تنظيف أسبوعي (كل يوم أحد الساعة 2:00 صباحاً)
    cron.schedule('0 2 * * 0', async () => {
      await this.runWeeklyMaintenance();
    });

    // تنظيف يومي خفيف (كل يوم الساعة 3:00 صباحاً)
    cron.schedule('0 3 * * *', async () => {
      await this.runDailyMaintenance();
    });

    // أرشفة شهرية (أول يوم في الشهر الساعة 1:00 صباحاً)
    cron.schedule('0 1 1 * *', async () => {
      await this.runMonthlyArchiving();
    });

    //console.log('✅ [ScheduledMaintenance] Scheduled tasks configured');
    //console.log('   📅 Weekly cleanup: Sundays at 2:00 AM');
    //console.log('   📅 Daily maintenance: Every day at 3:00 AM');
    //console.log('   📅 Monthly archiving: 1st of month at 1:00 AM');
  }

  /**
   * الصيانة الأسبوعية الشاملة
   */
  async runWeeklyMaintenance() {
    if (this.isRunning) {
      //console.log('⚠️ [ScheduledMaintenance] Maintenance already running, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      const startTime = Date.now();
      
      //console.log('🧹 [ScheduledMaintenance] Starting weekly maintenance...');

      // جلب جميع الشركات
      const companies = await this.prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
      });

      let totalProcessed = 0;
      let totalDeleted = 0;

      for (const company of companies) {
        //console.log(`🏢 [ScheduledMaintenance] Processing company: ${company.name} (${company.id})`);
        
        // تنظيف الأنماط المكررة
        const cleanupResult = await this.patternCleanup.cleanupDuplicatePatterns(company.id);
        
        if (cleanupResult.success) {
          totalProcessed += cleanupResult.patternsProcessed;
          totalDeleted += cleanupResult.patternsDeleted;
        }

        // تنظيف الأنماط غير المستخدمة
        const unusedResult = await this.cleanupUnusedPatterns(company.id);
        totalDeleted += unusedResult.deletedCount;
      }

      const duration = Date.now() - startTime;
      this.updateStats(totalProcessed, totalDeleted, 0, duration);

      //console.log('✅ [ScheduledMaintenance] Weekly maintenance completed');
      //console.log(`   📊 Companies processed: ${companies.length}`);
      //console.log(`   📊 Patterns processed: ${totalProcessed}`);
      //console.log(`   📊 Patterns deleted: ${totalDeleted}`);
      //console.log(`   ⏱️ Duration: ${duration}ms`);

    } catch (error) {
      console.error('❌ [ScheduledMaintenance] Error in weekly maintenance:', error);
    } finally {
      this.isRunning = false;
      this.lastRun = new Date();
    }
  }

  /**
   * الصيانة اليومية الخفيفة
   */
  async runDailyMaintenance() {
    if (this.isRunning) return;

    try {
      this.isRunning = true;
      //console.log('🔧 [ScheduledMaintenance] Starting daily maintenance...');

      // تحديث إحصائيات الأداء
      await this.updatePerformanceStats();

      // تنظيف البيانات المؤقتة
      await this.cleanupTempData();

      //console.log('✅ [ScheduledMaintenance] Daily maintenance completed');

    } catch (error) {
      console.error('❌ [ScheduledMaintenance] Error in daily maintenance:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * الأرشفة الشهرية
   */
  async runMonthlyArchiving() {
    if (this.isRunning) return;

    try {
      this.isRunning = true;
      //console.log('📦 [ScheduledMaintenance] Starting monthly archiving...');

      const companies = await this.prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
      });

      let totalArchived = 0;

      for (const company of companies) {
        const archivedCount = await this.archiveOldPatterns(company.id);
        totalArchived += archivedCount;
      }

      this.stats.totalPatternsArchived += totalArchived;

      //console.log('✅ [ScheduledMaintenance] Monthly archiving completed');
      //console.log(`   📦 Patterns archived: ${totalArchived}`);

    } catch (error) {
      console.error('❌ [ScheduledMaintenance] Error in monthly archiving:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * تنظيف الأنماط غير المستخدمة
   */
  async cleanupUnusedPatterns(companyId, daysUnused = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysUnused);

      // البحث عن الأنماط غير المستخدمة
      const unusedPatterns = await this.prisma.successPattern.findMany({
        where: {
          companyId,
          isActive: true,
          createdAt: { lt: cutoffDate },
          NOT: {
            PatternUsage: {
              some: {
                createdAt: { gte: cutoffDate }
              }
            }
          }
        }
      });

      if (unusedPatterns.length === 0) {
        return { deletedCount: 0 };
      }

      // FIXED: Add company isolation for security
      // تعطيل الأنماط بدلاً من حذفها
      await this.prisma.successPattern.updateMany({
        where: {
          id: { in: unusedPatterns.map(p => p.id) },
          companyId: companyId // Company isolation
        },
        data: {
          isActive: false,
          metadata: JSON.stringify({
            deactivatedAt: new Date().toISOString(),
            reason: 'Unused for 30+ days',
            autoDeactivated: true
          })
        }
      });

      //console.log(`🗑️ [ScheduledMaintenance] Deactivated ${unusedPatterns.length} unused patterns for company ${companyId}`);
      return { deletedCount: unusedPatterns.length };

    } catch (error) {
      console.error('❌ [ScheduledMaintenance] Error cleaning unused patterns:', error);
      return { deletedCount: 0 };
    }
  }

  /**
   * أرشفة الأنماط القديمة
   */
  async archiveOldPatterns(companyId, monthsOld = 6) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

      const oldPatterns = await this.prisma.successPattern.findMany({
        where: {
          companyId,
          createdAt: { lt: cutoffDate },
          isActive: false
        }
      });

      if (oldPatterns.length === 0) {
        return 0;
      }

      // إنشاء أرشيف
      const archiveData = {
        companyId,
        archivedAt: new Date(),
        patterns: oldPatterns,
        reason: `Patterns older than ${monthsOld} months`
      };

      // حفظ في جدول الأرشيف (إذا كان موجود)
      try {
        await this.prisma.patternArchive.create({
          data: {
            companyId,
            archiveData: JSON.stringify(archiveData),
            patternCount: oldPatterns.length,
            createdAt: new Date()
          }
        });
      } catch (archiveError) {
        //console.log('📝 [ScheduledMaintenance] Archive table not found, skipping archive creation');
      }

      // FIXED: Add company isolation for security
      // حذف الأنماط القديمة
      await this.prisma.successPattern.deleteMany({
        where: {
          id: { in: oldPatterns.map(p => p.id) },
          companyId: companyId // Company isolation
        }
      });

      //console.log(`📦 [ScheduledMaintenance] Archived ${oldPatterns.length} old patterns for company ${companyId}`);
      return oldPatterns.length;

    } catch (error) {
      console.error('❌ [ScheduledMaintenance] Error archiving patterns:', error);
      return 0;
    }
  }

  /**
   * تحديث إحصائيات الأداء
   */
  async updatePerformanceStats() {
    try {
      //console.log('📊 [ScheduledMaintenance] Updating performance stats...');
      
      // تحديث معدلات النجاح بناءً على الاستخدام الحديث
      const patterns = await this.prisma.successPattern.findMany({
        where: { isActive: true },
        include: {
          PatternUsage: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // آخر 7 أيام
              }
            }
          }
        }
      });

      for (const pattern of patterns) {
        if (pattern.PatternUsage.length > 0) {
          const successfulUsage = pattern.PatternUsage.filter(u => u.applied).length;
          const totalUsage = pattern.PatternUsage.length;
          const newSuccessRate = successfulUsage / totalUsage;

          // تحديث معدل النجاح بالمتوسط المرجح
          const weightedRate = (pattern.successRate * 0.7) + (newSuccessRate * 0.3);

          await this.prisma.successPattern.update({
            where: { id: pattern.id },
            data: { successRate: weightedRate }
          });
        }
      }

      //console.log(`📊 [ScheduledMaintenance] Updated performance stats for ${patterns.length} patterns`);

    } catch (error) {
      console.error('❌ [ScheduledMaintenance] Error updating performance stats:', error);
    }
  }

  /**
   * تنظيف البيانات المؤقتة
   */
  async cleanupTempData(companyId = null) {
    try {
      // حذف بيانات الاستخدام القديمة (أكثر من 90 يوم)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      // FIXED: Add company isolation for security
      const whereClause = {
        createdAt: { lt: cutoffDate }
      };

      if (companyId) {
        whereClause.companyId = companyId;
      }

      const deletedUsage = await this.prisma.patternUsage.deleteMany({
        where: whereClause
      });

      //console.log(`🗑️ [ScheduledMaintenance] Cleaned up ${deletedUsage.count} old usage records`);

    } catch (error) {
      console.error('❌ [ScheduledMaintenance] Error cleaning temp data:', error);
    }
  }

  /**
   * تحديث الإحصائيات
   */
  updateStats(processed, deleted, archived, duration) {
    this.stats.totalRuns++;
    this.stats.totalPatternsProcessed += processed;
    this.stats.totalPatternsDeleted += deleted;
    this.stats.totalPatternsArchived += archived;
    this.stats.lastRunDuration = duration;
  }

  /**
   * الحصول على إحصائيات الخدمة
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: {
        weekly: 'Sundays at 2:00 AM',
        daily: 'Every day at 3:00 AM',
        monthly: '1st of month at 1:00 AM'
      }
    };
  }

  /**
   * تشغيل صيانة فورية
   */
  async runImmediateMaintenance(type = 'full') {
    if (this.isRunning) {
      throw new Error('Maintenance is already running');
    }

    switch (type) {
      case 'cleanup':
        await this.runWeeklyMaintenance();
        break;
      case 'daily':
        await this.runDailyMaintenance();
        break;
      case 'archive':
        await this.runMonthlyArchiving();
        break;
      case 'full':
      default:
        await this.runWeeklyMaintenance();
        await this.runDailyMaintenance();
        break;
    }
  }
}

// إنشاء instance واحد للخدمة
const scheduledMaintenance = new ScheduledPatternMaintenanceService();

module.exports = scheduledMaintenance;
