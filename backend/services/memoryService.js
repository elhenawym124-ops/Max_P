const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class MemoryService {
  constructor() {
    this.shortTermMemory = new Map(); // ذاكرة قصيرة المدى (في الذاكرة)
    this.memoryRetentionDays = 30; // الاحتفاظ بالذاكرة لمدة 30 يوم
  }

  async saveInteraction(interactionData) {
    const { conversationId, senderId, userMessage, aiResponse, intent, sentiment, timestamp, companyId } = interactionData;

    // ✅ التحقق من وجود companyId للعزل الأمني
    if (!companyId) {
      throw new Error('companyId is required for memory isolation');
    }
    
    try {
      // حفظ في قاعدة البيانات (ذاكرة طويلة المدى)
      const savedInteraction = await prisma.conversationMemory.create({
        data: {
          conversationId,
          senderId,
          companyId, // ✅ إضافة companyId للعزل الأمني
          userMessage: typeof userMessage === 'string' ? userMessage : JSON.stringify(userMessage),
          aiResponse,
          intent,
          sentiment,
          timestamp: timestamp || new Date(),
          metadata: JSON.stringify({
            messageLength: userMessage.length,
            responseLength: aiResponse.length,
            processingTime: Date.now()
          })
        }
      });

      // حفظ في الذاكرة قصيرة المدى مع العزل الأمني
      const memoryKey = `${companyId}_${conversationId}_${senderId}`;
      if (!this.shortTermMemory.has(memoryKey)) {
        this.shortTermMemory.set(memoryKey, []);
      }
      
      const shortTermData = this.shortTermMemory.get(memoryKey);
      shortTermData.push({
        id: savedInteraction.id,
        userMessage,
        aiResponse,
        intent,
        sentiment,
        timestamp
      });

      // الاحتفاظ بآخر 10 تفاعلات فقط في الذاكرة قصيرة المدى
      if (shortTermData.length > 10) {
        shortTermData.shift();
      }

      //console.log(`💾 Saved interaction for conversation ${conversationId}`);
      return savedInteraction;

    } catch (error) {
      console.error('❌ Error saving interaction:', error);
      throw error;
    }
  }

  async getConversationMemory(conversationId, senderId, limit = 50, companyId) {
    // ✅ التحقق من وجود companyId للعزل الأمني
    if (!companyId) {
      throw new Error('companyId is required for memory isolation');
    }

    const memoryKey = `${companyId}_${conversationId}_${senderId}`;

    //console.log(`🧠 [MEMORY-DEBUG] Looking for memory with key: ${memoryKey}`);
    //console.log(`🧠 [MEMORY-DEBUG] ConversationId: ${conversationId}, SenderId: ${senderId}, CompanyId: ${companyId}, Limit: ${limit}`);

    try {
      // محاولة الحصول على البيانات من الذاكرة قصيرة المدى أولاً
      if (this.shortTermMemory.has(memoryKey)) {
        const shortTermData = this.shortTermMemory.get(memoryKey);
        if (shortTermData.length > 0) {
          //console.log(`🧠 Retrieved ${shortTermData.length} interactions from short-term memory`);
          return shortTermData.slice(-limit);
        }
      }

      //console.log(`🧠 [MEMORY-DEBUG] No short-term memory found, searching database...`);

      // إذا لم توجد في الذاكرة قصيرة المدى، جلب من قاعدة البيانات مع العزل الأمني
      const interactions = await prisma.conversationMemory.findMany({
        where: {
          conversationId,
          senderId,
          companyId, // ✅ إضافة companyId للعزل الأمني
          timestamp: {
            gte: new Date(Date.now() - (this.memoryRetentionDays * 24 * 60 * 60 * 1000))
          }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      //console.log(`🧠 [MEMORY-DEBUG] Found ${interactions.length} interactions in database`);
      if (interactions.length > 0) {
        //console.log(`🧠 [MEMORY-DEBUG] Sample interaction:`, {
        //   id: interactions[0].id,
        //   conversationId: interactions[0].conversationId,
        //   senderId: interactions[0].senderId,
        //   userMessage: interactions[0].userMessage.substring(0, 50) + '...',
        //   timestamp: interactions[0].timestamp
        // });
      }

      // ✅ تحويل البيانات لـ format مناسب للـ AI - كل رسالة منفصلة
      const memoryData = [];
      interactions.reverse().forEach(interaction => {
        // إضافة رسالة العميل
        if (interaction.userMessage) {
          memoryData.push({
            id: interaction.id + '_user',
            content: interaction.userMessage,
            isFromCustomer: true,
            createdAt: interaction.timestamp,
            intent: interaction.intent,
            sentiment: interaction.sentiment
          });
        }
        
        // إضافة رد الـ AI
        if (interaction.aiResponse) {
          memoryData.push({
            id: interaction.id + '_ai',
            content: interaction.aiResponse,
            isFromCustomer: false,
            createdAt: interaction.timestamp,
            intent: interaction.intent,
            sentiment: interaction.sentiment
          });
        }
      });

      // حفظ في الذاكرة قصيرة المدى للاستخدام السريع
      this.shortTermMemory.set(memoryKey, memoryData);

      //console.log(`🧠 Retrieved ${memoryData.length} interactions from database`);
      return memoryData;

    } catch (error) {
      console.error('❌ Error retrieving conversation memory:', error);
      return [];
    }
  }

  async getCustomerProfile(senderId, companyId) {
    // ✅ التحقق من وجود companyId للعزل الأمني
    if (!companyId) {
      throw new Error('companyId is required for memory isolation');
    }

    try {
      // جلب ملخص تفاعلات العميل مع العزل الأمني
      const interactions = await prisma.conversationMemory.findMany({
        where: {
          senderId,
          companyId // ✅ إضافة companyId للعزل الأمني
        },
        orderBy: { timestamp: 'desc' },
        take: 50
      });

      if (interactions.length === 0) {
        return null;
      }

      // تحليل أنماط العميل
      const profile = this.analyzeCustomerPatterns(interactions);
      
      //console.log(`👤 Generated profile for customer ${senderId}`);
      return profile;

    } catch (error) {
      console.error('❌ Error getting customer profile:', error);
      return null;
    }
  }

  analyzeCustomerPatterns(interactions) {
    const totalInteractions = interactions.length;
    
    // تحليل النوايا الأكثر شيوعاً
    const intentCounts = {};
    interactions.forEach(interaction => {
      intentCounts[interaction.intent] = (intentCounts[interaction.intent] || 0) + 1;
    });
    
    const mostCommonIntent = Object.keys(intentCounts).reduce((a, b) => 
      intentCounts[a] > intentCounts[b] ? a : b
    );

    // تحليل المشاعر العامة
    const sentimentCounts = {};
    interactions.forEach(interaction => {
      sentimentCounts[interaction.sentiment] = (sentimentCounts[interaction.sentiment] || 0) + 1;
    });

    const dominantSentiment = Object.keys(sentimentCounts).reduce((a, b) => 
      sentimentCounts[a] > sentimentCounts[b] ? a : b
    );

    // تحليل أوقات التفاعل
    const interactionHours = interactions.map(interaction => 
      new Date(interaction.timestamp).getHours()
    );
    
    const avgInteractionHour = Math.round(
      interactionHours.reduce((sum, hour) => sum + hour, 0) / interactionHours.length
    );

    // تحليل تكرار التفاعل
    const firstInteraction = new Date(interactions[interactions.length - 1].timestamp);
    const lastInteraction = new Date(interactions[0].timestamp);
    const daysBetween = Math.ceil((lastInteraction - firstInteraction) / (1000 * 60 * 60 * 24));
    const interactionFrequency = totalInteractions / Math.max(daysBetween, 1);

    return {
      totalInteractions,
      mostCommonIntent,
      dominantSentiment,
      preferredInteractionHour: avgInteractionHour,
      interactionFrequency: Math.round(interactionFrequency * 100) / 100,
      intentDistribution: intentCounts,
      sentimentDistribution: sentimentCounts,
      firstSeen: firstInteraction,
      lastSeen: lastInteraction,
      customerType: this.categorizeCustomer(totalInteractions, dominantSentiment, mostCommonIntent)
    };
  }

  categorizeCustomer(totalInteractions, dominantSentiment, mostCommonIntent) {
    if (totalInteractions >= 20) {
      return 'frequent_customer'; // عميل دائم
    } else if (totalInteractions >= 10) {
      return 'regular_customer'; // عميل منتظم
    } else if (totalInteractions >= 5) {
      return 'returning_customer'; // عميل عائد
    } else {
      return 'new_customer'; // عميل جديد
    }
  }

  async getConversationSummary(conversationId, senderId, companyId) {
    // ✅ التحقق من وجود companyId للعزل الأمني
    if (!companyId) {
      throw new Error('companyId is required for memory isolation');
    }

    try {
      const interactions = await prisma.conversationMemory.findMany({
        where: {
          conversationId,
          senderId,
          companyId // ✅ إضافة companyId للعزل الأمني
        },
        orderBy: { timestamp: 'asc' }
      });

      if (interactions.length === 0) {
        return null;
      }

      const summary = {
        conversationId,
        senderId,
        totalMessages: interactions.length,
        startTime: interactions[0].timestamp,
        endTime: interactions[interactions.length - 1].timestamp,
        duration: this.calculateDuration(interactions[0].timestamp, interactions[interactions.length - 1].timestamp),
        mainTopics: this.extractMainTopics(interactions),
        overallSentiment: this.calculateOverallSentiment(interactions),
        resolutionStatus: this.determineResolutionStatus(interactions)
      };

      return summary;

    } catch (error) {
      console.error('❌ Error getting conversation summary:', error);
      return null;
    }
  }

  extractMainTopics(interactions) {
    const intentCounts = {};
    interactions.forEach(interaction => {
      intentCounts[interaction.intent] = (intentCounts[interaction.intent] || 0) + 1;
    });

    return Object.entries(intentCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([intent, count]) => ({ intent, count }));
  }

  calculateOverallSentiment(interactions) {
    const sentimentScores = {
      'positive': 1,
      'neutral': 0,
      'negative': -1
    };

    const totalScore = interactions.reduce((sum, interaction) => {
      return sum + (sentimentScores[interaction.sentiment] || 0);
    }, 0);

    const avgScore = totalScore / interactions.length;
    
    if (avgScore > 0.3) return 'positive';
    if (avgScore < -0.3) return 'negative';
    return 'neutral';
  }

  determineResolutionStatus(interactions) {
    const lastInteraction = interactions[interactions.length - 1];
    
    // إذا كان آخر تفاعل إيجابي أو محايد، فالمحادثة محلولة
    if (['positive', 'neutral'].includes(lastInteraction.sentiment)) {
      return 'resolved';
    }
    
    // إذا كان سلبي، فقد تحتاج متابعة
    return 'needs_followup';
  }

  calculateDuration(startTime, endTime) {
    const diffMs = new Date(endTime) - new Date(startTime);
    const diffMins = Math.round(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} دقيقة`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours} ساعة و ${mins} دقيقة`;
    }
  }

  // تنظيف الذاكرة القديمة مع العزل الأمني
  async cleanupOldMemories(companyId = null) {
    try {
      const cutoffDate = new Date(Date.now() - (this.memoryRetentionDays * 24 * 60 * 60 * 1000));

      // تنظيف ذاكرة المحادثات القديمة
      const memoryWhere = {
        timestamp: {
          lt: cutoffDate
        }
      };

      // إضافة العزل إذا تم تحديد شركة معينة
      if (companyId) {
        memoryWhere.companyId = companyId;
      }

      const deletedMemoryCount = // SECURITY WARNING: Ensure companyId filter is included
      await prisma.conversationMemory.deleteMany({
        where: memoryWhere
      });

      // تنظيف الذاكرة قصيرة المدى القديمة
      let cleanedShortTermCount = 0;
      for (const [key, value] of this.shortTermMemory.entries()) {
        // إذا كان هناك عزل للشركة، نظف فقط مفاتيح تلك الشركة
        if (companyId && !key.startsWith(`${companyId}_`)) {
          continue;
        }

        // فحص إذا كانت البيانات قديمة (أكثر من ساعة)
        if (Array.isArray(value) && value.length > 0) {
          const lastTimestamp = new Date(value[value.length - 1].timestamp);
          if (Date.now() - lastTimestamp.getTime() > 60 * 60 * 1000) { // ساعة واحدة
            this.shortTermMemory.delete(key);
            cleanedShortTermCount++;
          }
        }
      }

      const totalCleaned = deletedMemoryCount.count + cleanedShortTermCount;
      const companyInfo = companyId ? ` for company ${companyId}` : ' (all companies)';
      //console.log(`🧹 Cleaned up ${totalCleaned} old memory records${companyInfo} (${deletedMemoryCount.count} from DB, ${cleanedShortTermCount} from cache)`);

      return {
        total: totalCleaned,
        database: deletedMemoryCount.count,
        shortTerm: cleanedShortTermCount
      };

    } catch (error) {
      console.error('❌ Error cleaning up old memories:', error);
      return { total: 0, database: 0, shortTerm: 0 };
    }
  }

  // إحصائيات الذاكرة مع العزل الأمني
  async getMemoryStats(companyId = null) {
    try {
      // ✅ إضافة العزل الأمني للإحصائيات
      const whereClause = companyId ? { companyId } : {};

      // إحصائيات قاعدة البيانات معزولة
      const [totalMemories, totalMessages, totalCustomers, conversationMemoryCount] = await Promise.all([
        prisma.conversation.count({ where: whereClause }),
        prisma.message.count({
          where: companyId ? { conversation: { companyId } } : {}
        }),
        prisma.customer.count({ where: whereClause }),
        prisma.conversationMemory.count({ where: whereClause })
      ]);

      // إحصائيات الذاكرة قصيرة المدى معزولة
      let shortTermMemorySize = this.shortTermMemory.size;
      let companySpecificMemorySize = 0;

      if (companyId) {
        // حساب الذاكرة قصيرة المدى لشركة محددة
        for (const [key, value] of this.shortTermMemory.entries()) {
          if (key.startsWith(`${companyId}_`)) {
            companySpecificMemorySize += Array.isArray(value) ? value.length : 0;
          }
        }
        shortTermMemorySize = companySpecificMemorySize;
      }

      const stats = {
        totalMemories,
        totalMessages,
        totalCustomers,
        conversationMemoryRecords: conversationMemoryCount,
        shortTermMemorySize,
        retentionDays: this.memoryRetentionDays,
        companyId: companyId || 'all_companies',
        isolated: !!companyId,
        timestamp: new Date()
      };

      // إضافة تفاصيل إضافية إذا كانت الإحصائيات معزولة
      if (companyId) {
        stats.memoryDistribution = {
          database: conversationMemoryCount,
          shortTerm: companySpecificMemorySize,
          total: conversationMemoryCount + companySpecificMemorySize
        };
      }

      return stats;

    } catch (error) {
      console.error('❌ Error getting memory stats:', error);
      return null;
    }
  }

  // مسح ذاكرة عميل معين مع العزل الأمني
  async clearCustomerMemory(senderId, companyId) {
    // ✅ التحقق من وجود companyId للعزل الأمني
    if (!companyId) {
      throw new Error('companyId is required for memory isolation');
    }

    try {
      // مسح ذاكرة المحادثات للعميل مع العزل الأمني
      const deletedMemoryCount = // SECURITY WARNING: Ensure companyId filter is included
      await prisma.conversationMemory.deleteMany({
        where: {
          senderId,
          companyId // ✅ إضافة companyId للعزل الأمني
        }
      });

      // مسح من الذاكرة قصيرة المدى بطريقة آمنة
      const memoryKeyPrefix = `${companyId}_`;
      for (const [key, value] of this.shortTermMemory.entries()) {
        // ✅ فحص دقيق للمفتاح مع العزل الأمني
        if (key.startsWith(memoryKeyPrefix) && key.includes(`_${senderId}`)) {
          this.shortTermMemory.delete(key);
        }
      }

      //console.log(`🗑️ Cleared memory for customer ${senderId} in company ${companyId}: ${deletedMemoryCount.count} records`);
      return deletedMemoryCount.count;

    } catch (error) {
      console.error('❌ Error clearing customer memory:', error);
      return 0;
    }
  }

  /**
   * جلب الذكريات الحديثة للعميل
   */
  async getRecentMemories(conversationId, senderId, limit = 10, companyId) {
    // ✅ التحقق من وجود companyId للعزل الأمني
    if (!companyId) {
      throw new Error('companyId is required for memory isolation');
    }

    try {
      const memoryKey = `${companyId}_${conversationId}_${senderId}`;

      // محاولة الحصول من الذاكرة قصيرة المدى أولاً
      if (this.shortTermMemory.has(memoryKey)) {
        const shortTermData = this.shortTermMemory.get(memoryKey);
        if (shortTermData.length > 0) {
          return shortTermData.slice(-limit);
        }
      }

      // إذا لم توجد في الذاكرة قصيرة المدى، جلب من قاعدة البيانات مع العزل الأمني
      const memories = await prisma.conversationMemory.findMany({
        where: {
          conversationId,
          senderId,
          companyId // ✅ إضافة companyId للعزل الأمني
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return memories.reverse(); // ترتيب من الأقدم للأحدث

    } catch (error) {
      console.error('❌ Error getting recent memories:', error);
      return [];
    }
  }

  /**
   * إضافة ذكرى جديدة
   */
  async addMemory(conversationId, senderId, userMessage, aiResponse, intent = 'unknown', sentiment = 'neutral', companyId) {
    // ✅ التحقق من وجود companyId للعزل الأمني
    if (!companyId) {
      throw new Error('companyId is required for memory isolation');
    }

    try {
      const interactionData = {
        conversationId,
        senderId,
        companyId, // ✅ إضافة companyId للعزل الأمني
        userMessage,
        aiResponse,
        intent,
        sentiment,
        timestamp: new Date()
      };

      return await this.saveInteraction(interactionData);

    } catch (error) {
      console.error('❌ Error adding memory:', error);
      return null;
    }
  }

  /**
   * البحث في الذكريات
   */
  async searchMemories(conversationId, senderId, searchTerm, limit = 5, companyId) {
    // ✅ التحقق من وجود companyId للعزل الأمني
    if (!companyId) {
      throw new Error('companyId is required for memory isolation');
    }

    try {
      const memories = await prisma.conversationMemory.findMany({
        where: {
          conversationId,
          senderId,
          companyId, // ✅ إضافة companyId للعزل الأمني
          OR: [
            { userMessage: { contains: searchTerm } },
            { aiResponse: { contains: searchTerm } }
          ]
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return memories;

    } catch (error) {
      console.error('❌ Error searching memories:', error);
      return [];
    }
  }

  /**
   * فحص العزل في الذاكرة - للتأكد من عدم وجود تسريب
   */
  async auditMemoryIsolation() {
    try {
      //console.log('🔍 [MEMORY-AUDIT] بدء فحص العزل في الذاكرة...');

      const auditResults = {
        shortTermMemoryKeys: [],
        databaseRecordsWithoutCompanyId: 0,
        isolationViolations: [],
        recommendations: []
      };

      // فحص مفاتيح الذاكرة قصيرة المدى
      for (const [key, value] of this.shortTermMemory.entries()) {
        auditResults.shortTermMemoryKeys.push({
          key,
          hasCompanyId: key.split('_').length >= 3,
          recordCount: Array.isArray(value) ? value.length : 0
        });

        // فحص إذا كان المفتاح لا يحتوي على companyId
        if (key.split('_').length < 3) {
          auditResults.isolationViolations.push({
            type: 'SHORT_TERM_KEY_WITHOUT_COMPANY_ID',
            key,
            severity: 'HIGH'
          });
        }
      }

      // فحص قاعدة البيانات للسجلات بدون companyId صحيح
      const allRecords = await prisma.conversationMemory.findMany({
        select: { companyId: true }
      });

      const recordsWithoutCompanyId = allRecords.filter(record =>
        !record.companyId ||
        record.companyId === '' ||
        !record.companyId || record.companyId === '' // فحص عام للقيم الفارغة
      ).length;

      auditResults.databaseRecordsWithoutCompanyId = recordsWithoutCompanyId;

      if (recordsWithoutCompanyId > 0) {
        auditResults.isolationViolations.push({
          type: 'DATABASE_RECORDS_WITHOUT_COMPANY_ID',
          count: recordsWithoutCompanyId,
          severity: 'CRITICAL'
        });
      }

      // إضافة توصيات
      if (auditResults.isolationViolations.length === 0) {
        auditResults.recommendations.push('✅ العزل مطبق بشكل صحيح');
      } else {
        auditResults.recommendations.push('🚨 يجب إصلاح انتهاكات العزل فوراً');
        auditResults.recommendations.push('🔧 تنظيف البيانات غير المعزولة');
        auditResults.recommendations.push('🛡️ تطبيق فحوصات العزل الإضافية');
      }

      //console.log('🔍 [MEMORY-AUDIT] نتائج فحص العزل:', auditResults);
      return auditResults;

    } catch (error) {
      console.error('❌ [MEMORY-AUDIT] خطأ في فحص العزل:', error);
      return {
        error: error.message,
        isolationViolations: [{ type: 'AUDIT_FAILED', severity: 'CRITICAL' }]
      };
    }
  }

  /**
   * إصلاح انتهاكات العزل
   */
  async fixIsolationViolations(defaultCompanyId) {
    try {
      //console.log('🔧 [MEMORY-FIX] بدء إصلاح انتهاكات العزل...');

      if (!defaultCompanyId) {
        throw new Error('defaultCompanyId is required for fixing isolation violations');
      }

      const fixResults = {
        shortTermKeysFixed: 0,
        databaseRecordsFixed: 0,
        errors: []
      };

      // إصلاح السجلات في قاعدة البيانات بدون companyId
      const updatedRecords = // SECURITY WARNING: Ensure companyId filter is included
      await prisma.conversationMemory.updateMany({
        where: {
          OR: [
            { companyId: null },
            { companyId: '' }
          ]
        },
        data: {
          companyId: defaultCompanyId
        }
      });

      fixResults.databaseRecordsFixed = updatedRecords.count;

      // إصلاح مفاتيح الذاكرة قصيرة المدى
      const keysToFix = [];
      for (const [key, value] of this.shortTermMemory.entries()) {
        if (key.split('_').length < 3) {
          keysToFix.push({ oldKey: key, value });
        }
      }

      for (const { oldKey, value } of keysToFix) {
        // إنشاء مفتاح جديد مع companyId
        const newKey = `${defaultCompanyId}_${oldKey}`;
        this.shortTermMemory.set(newKey, value);
        this.shortTermMemory.delete(oldKey);
        fixResults.shortTermKeysFixed++;
      }

      //console.log('🔧 [MEMORY-FIX] نتائج الإصلاح:', fixResults);
      return fixResults;

    } catch (error) {
      console.error('❌ [MEMORY-FIX] خطأ في إصلاح العزل:', error);
      return {
        error: error.message,
        shortTermKeysFixed: 0,
        databaseRecordsFixed: 0
      };
    }
  }
}

module.exports = new MemoryService();
