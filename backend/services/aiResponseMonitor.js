/**
 * نظام مراقبة ردود الذكاء الاصطناعي
 * AI Response Monitor System
 * 
 * يراقب ردود الـ AI ويرسل إشعارات في حالة الفشل أو عدم الرد
 */

const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

class AIResponseMonitor {
  constructor() {
    this.failureThresholds = {
      consecutive: 3,        // عدد الفشل المتتالي
      timeWindow: 5 * 60 * 1000, // 5 دقائق
      maxFailuresInWindow: 5  // أقصى عدد فشل في النافذة الزمنية
    };
    
    this.companyFailures = new Map(); // تتبع الفشل لكل شركة
    this.notificationCallbacks = []; // callbacks للإشعارات
    this.socketService = null; // Socket.io service
    
    // تأخير تحميل socketService لتجنب circular dependency
    setTimeout(() => {
      try {
        this.socketService = require('./socketService');
        console.log('✅ [AI-MONITOR] Socket service connected');
      } catch (error) {
        console.warn('⚠️ [AI-MONITOR] Could not connect to socket service:', error.message);
      }
    }, 1000);
  }

  /**
   * تسجيل callback للإشعارات
   */
  onNotification(callback) {
    this.notificationCallbacks.push(callback);
  }

  /**
   * إرسال إشعار
   */
  async sendNotification(notification) {
    try {
      // حفظ الإشعار في قاعدة البيانات
      await this.saveNotificationToDatabase(notification);

      // إرسال الإشعار عبر Socket.io
      if (this.socketService) {
        try {
          this.socketService.emitAINotification(notification.companyId, notification);
          
          // تحديث عدد الإشعارات غير المقروءة
          const unreadCount = await this.getUnreadCount(notification.companyId);
          this.socketService.emitUnreadCountUpdate(notification.companyId, unreadCount);
        } catch (socketError) {
          console.error('❌ [AI-MONITOR] Error sending via socket:', socketError);
        }
      }

      // إرسال الإشعار عبر callbacks الإضافية
      for (const callback of this.notificationCallbacks) {
        try {
          await callback(notification);
        } catch (error) {
          console.error('❌ [AI-MONITOR] Error in notification callback:', error);
        }
      }

      console.log('📢 [AI-MONITOR] Notification sent:', notification.title);
    } catch (error) {
      console.error('❌ [AI-MONITOR] Error sending notification:', error);
    }
  }

  /**
   * حفظ الإشعار في قاعدة البيانات
   */
  async saveNotificationToDatabase(notification) {
    try {
      // التحقق من وجود جدول الإشعارات
      const tableExists = await this.checkNotificationsTableExists();
      
      if (!tableExists) {
        await this.createNotificationsTable();
      }

      // حفظ الإشعار
      await prisma.$executeRaw`
        INSERT INTO ai_notifications (
          id, companyId, type, severity, title, message, 
          metadata, isRead, createdAt
        ) VALUES (
          ${this.generateId()},
          ${notification.companyId},
          ${notification.type},
          ${notification.severity},
          ${notification.title},
          ${notification.message},
          ${JSON.stringify(notification.metadata || {})},
          false,
          NOW()
        )
      `;
    } catch (error) {
      console.error('❌ [AI-MONITOR] Error saving notification to database:', error);
    }
  }

  /**
   * التحقق من وجود جدول الإشعارات
   */
  async checkNotificationsTableExists() {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'ai_notifications'
      `;
      return result[0].count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * إنشاء جدول الإشعارات
   */
  async createNotificationsTable() {
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS ai_notifications (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          companyId VARCHAR(191) NOT NULL,
          type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          metadata JSON,
          isRead BOOLEAN DEFAULT false,
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          readAt DATETIME(3),
          INDEX idx_company_created (companyId, createdAt),
          INDEX idx_company_read (companyId, isRead)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      console.log('✅ [AI-MONITOR] Notifications table created');
    } catch (error) {
      console.error('❌ [AI-MONITOR] Error creating notifications table:', error);
    }
  }

  /**
   * توليد معرف فريد
   */
  generateId() {
    return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * تسجيل فشل رد AI
   */
  async recordAIFailure(failureData) {
    const { companyId, conversationId, customerId, errorType, errorMessage, context } = failureData;

    console.log(`⚠️ [AI-MONITOR] Recording AI failure for company: ${companyId}`);

    // الحصول على سجل الفشل للشركة
    if (!this.companyFailures.has(companyId)) {
      this.companyFailures.set(companyId, {
        failures: [],
        consecutiveFailures: 0,
        lastSuccessTime: Date.now()
      });
    }

    const companyRecord = this.companyFailures.get(companyId);
    const now = Date.now();

    // إضافة الفشل الجديد
    const failure = {
      timestamp: now,
      conversationId,
      customerId,
      errorType,
      errorMessage,
      context
    };

    companyRecord.failures.push(failure);
    companyRecord.consecutiveFailures++;

    // تنظيف الفشل القديم (خارج النافذة الزمنية)
    companyRecord.failures = companyRecord.failures.filter(
      f => now - f.timestamp < this.failureThresholds.timeWindow
    );

    // التحقق من الحدود وإرسال الإشعارات
    await this.checkThresholdsAndNotify(companyId, companyRecord, failure);

    // حفظ سجل الفشل في قاعدة البيانات
    await this.saveFailureLog(failure, companyId);
  }

  /**
   * تسجيل نجاح رد AI
   */
  recordAISuccess(companyId) {
    if (this.companyFailures.has(companyId)) {
      const companyRecord = this.companyFailures.get(companyId);
      companyRecord.consecutiveFailures = 0;
      companyRecord.lastSuccessTime = Date.now();
    }
  }

  /**
   * التحقق من الحدود وإرسال الإشعارات
   */
  async checkThresholdsAndNotify(companyId, companyRecord, latestFailure) {
    const failuresInWindow = companyRecord.failures.length;
    const consecutiveFailures = companyRecord.consecutiveFailures;

    // إشعار فشل متتالي
    if (consecutiveFailures === this.failureThresholds.consecutive) {
      await this.sendNotification({
        companyId,
        type: 'ai_consecutive_failures',
        severity: 'high',
        title: '⚠️ فشل متتالي في ردود الذكاء الاصطناعي',
        message: `فشل الذكاء الاصطناعي في الرد ${consecutiveFailures} مرات متتالية. يرجى التحقق من إعدادات API والنظام.`,
        metadata: {
          consecutiveFailures,
          latestError: latestFailure.errorType,
          conversationId: latestFailure.conversationId,
          customerId: latestFailure.customerId
        }
      });
    }

    // إشعار عدد كبير من الفشل في فترة قصيرة
    if (failuresInWindow >= this.failureThresholds.maxFailuresInWindow) {
      await this.sendNotification({
        companyId,
        type: 'ai_high_failure_rate',
        severity: 'critical',
        title: '🚨 معدل فشل عالي في الذكاء الاصطناعي',
        message: `تم تسجيل ${failuresInWindow} حالة فشل في آخر 5 دقائق. النظام يحتاج مراجعة فورية.`,
        metadata: {
          failuresInWindow,
          timeWindow: '5 minutes',
          failures: companyRecord.failures.map(f => ({
            errorType: f.errorType,
            timestamp: new Date(f.timestamp).toISOString()
          }))
        }
      });
    }

    // إشعار لأنواع أخطاء محددة
    if (latestFailure.errorType === 'no_api_key') {
      await this.sendNotification({
        companyId,
        type: 'ai_no_api_key',
        severity: 'critical',
        title: '🔑 لا يوجد مفتاح API نشط',
        message: 'الذكاء الاصطناعي لا يمكنه الرد لعدم وجود مفتاح Gemini API نشط. يرجى إضافة مفتاح API.',
        metadata: {
          errorType: latestFailure.errorType,
          conversationId: latestFailure.conversationId
        }
      });
    } else if (latestFailure.errorType === 'api_quota_exceeded') {
      await this.sendNotification({
        companyId,
        type: 'ai_quota_exceeded',
        severity: 'high',
        title: '📊 تجاوز حد استخدام API',
        message: 'تم تجاوز الحد المسموح لاستخدام Gemini API. يرجى إضافة مفاتيح جديدة أو الانتظار حتى إعادة التعيين.',
        metadata: {
          errorType: latestFailure.errorType,
          conversationId: latestFailure.conversationId
        }
      });
    } else if (latestFailure.errorType === 'network_timeout') {
      await this.sendNotification({
        companyId,
        type: 'ai_network_error',
        severity: 'medium',
        title: '🌐 مشكلة في الاتصال بخدمة AI',
        message: 'حدثت مشكلة في الاتصال بخدمة Gemini AI. يتم المحاولة مرة أخرى تلقائياً.',
        metadata: {
          errorType: latestFailure.errorType,
          conversationId: latestFailure.conversationId
        }
      });
    }
  }

  /**
   * حفظ سجل الفشل في قاعدة البيانات
   */
  async saveFailureLog(failure, companyId) {
    try {
      // التحقق من وجود جدول السجلات
      const tableExists = await this.checkFailureLogsTableExists();
      
      if (!tableExists) {
        await this.createFailureLogsTable();
      }

      await prisma.$executeRaw`
        INSERT INTO ai_failure_logs (
          id, companyId, conversationId, customerId, 
          errorType, errorMessage, context, createdAt
        ) VALUES (
          ${this.generateId()},
          ${companyId},
          ${failure.conversationId || null},
          ${failure.customerId || null},
          ${failure.errorType},
          ${failure.errorMessage || ''},
          ${JSON.stringify(failure.context || {})},
          NOW()
        )
      `;
    } catch (error) {
      console.error('❌ [AI-MONITOR] Error saving failure log:', error);
    }
  }

  /**
   * التحقق من وجود جدول سجلات الفشل
   */
  async checkFailureLogsTableExists() {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'ai_failure_logs'
      `;
      return result[0].count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * إنشاء جدول سجلات الفشل
   */
  async createFailureLogsTable() {
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS ai_failure_logs (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          companyId VARCHAR(191) NOT NULL,
          conversationId VARCHAR(191),
          customerId VARCHAR(191),
          errorType VARCHAR(100) NOT NULL,
          errorMessage TEXT,
          context JSON,
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX idx_company_created (companyId, createdAt),
          INDEX idx_error_type (errorType)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      console.log('✅ [AI-MONITOR] Failure logs table created');
    } catch (error) {
      console.error('❌ [AI-MONITOR] Error creating failure logs table:', error);
    }
  }

  /**
   * الحصول على إحصائيات الفشل لشركة
   */
  async getFailureStats(companyId, timeRange = 24 * 60 * 60 * 1000) {
    try {
      const startTime = new Date(Date.now() - timeRange);

      const stats = await prisma.$queryRaw`
        SELECT 
          errorType,
          COUNT(*) as count,
          MAX(createdAt) as lastOccurrence
        FROM ai_failure_logs
        WHERE companyId = ${companyId}
          AND createdAt >= ${startTime}
        GROUP BY errorType
        ORDER BY count DESC
      `;

      const totalFailures = await prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM ai_failure_logs
        WHERE companyId = ${companyId}
          AND createdAt >= ${startTime}
      `;

      return {
        totalFailures: Number(totalFailures[0]?.total || 0),
        byErrorType: stats,
        timeRange: timeRange / (60 * 60 * 1000) + ' hours'
      };
    } catch (error) {
      console.error('❌ [AI-MONITOR] Error getting failure stats:', error);
      return { totalFailures: 0, byErrorType: [], timeRange: '24 hours' };
    }
  }

  /**
   * الحصول على الإشعارات لشركة
   */
  async getNotifications(companyId, options = {}) {
    try {
      const { limit = 50, unreadOnly = false } = options;

      let query = `
        SELECT * FROM ai_notifications
        WHERE companyId = ?
      `;

      const params = [companyId];

      if (unreadOnly) {
        query += ` AND isRead = false`;
      }

      query += ` ORDER BY createdAt DESC LIMIT ?`;
      params.push(limit);

      const notifications = await prisma.$queryRawUnsafe(query, ...params);

      return notifications.map(n => ({
        ...n,
        metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata
      }));
    } catch (error) {
      console.error('❌ [AI-MONITOR] Error getting notifications:', error);
      return [];
    }
  }

  /**
   * تعليم إشعار كمقروء (مع عزل الشركات)
   */
  async markNotificationAsRead(notificationId, companyId) {
    try {
      // 🔐 SECURITY: عزل الشركات - التأكد أن الإشعار يخص الشركة
      const result = await prisma.$executeRaw`
        UPDATE ai_notifications
        SET isRead = true, readAt = NOW()
        WHERE id = ${notificationId} AND companyId = ${companyId}
      `;
      
      if (result === 0) {
        console.warn(`⚠️ [AI-MONITOR] Notification ${notificationId} not found or doesn't belong to company ${companyId}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ [AI-MONITOR] Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * تعليم جميع الإشعارات كمقروءة
   */
  async markAllNotificationsAsRead(companyId) {
    try {
      await prisma.$executeRaw`
        UPDATE ai_notifications
        SET isRead = true, readAt = NOW()
        WHERE companyId = ${companyId} AND isRead = false
      `;
      return true;
    } catch (error) {
      console.error('❌ [AI-MONITOR] Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * حذف الإشعارات القديمة (مع عزل الشركات - اختياري)
   * @param {number} daysToKeep - عدد الأيام للحفظ
   * @param {string} companyId - معرف الشركة (اختياري - للمسؤولين فقط يمكن حذف كل الشركات)
   */
  async cleanupOldNotifications(daysToKeep = 30, companyId = null) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      let result;
      if (companyId) {
        // 🔐 SECURITY: حذف إشعارات شركة محددة فقط
        result = await prisma.$executeRaw`
          DELETE FROM ai_notifications
          WHERE createdAt < ${cutoffDate} 
            AND isRead = true
            AND companyId = ${companyId}
        `;
        console.log(`🧹 [AI-MONITOR] Cleaned up ${result} old notifications for company ${companyId}`);
      } else {
        // حذف جميع الإشعارات القديمة (للمسؤولين فقط)
        result = await prisma.$executeRaw`
          DELETE FROM ai_notifications
          WHERE createdAt < ${cutoffDate} AND isRead = true
        `;
        console.log(`🧹 [AI-MONITOR] Cleaned up ${result} old notifications (all companies)`);
      }

      return result;
    } catch (error) {
      console.error('❌ [AI-MONITOR] Error cleaning up notifications:', error);
      return 0;
    }
  }

  /**
   * الحصول على عدد الإشعارات غير المقروءة
   */
  async getUnreadCount(companyId) {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM ai_notifications
        WHERE companyId = ${companyId} AND isRead = false
      `;
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error('❌ [AI-MONITOR] Error getting unread count:', error);
      return 0;
    }
  }
}

// تصدير instance واحد فقط (Singleton)
const aiResponseMonitor = new AIResponseMonitor();

module.exports = aiResponseMonitor;
