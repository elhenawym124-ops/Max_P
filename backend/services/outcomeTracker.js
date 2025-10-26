/**
 * Outcome Tracker Service
 * 
 * خدمة تتبع النتائج - تربط المحادثات بالمبيعات الفعلية
 * وتسجل فعالية كل رد
 */

const { PrismaClient } = require('@prisma/client');

class OutcomeTracker {
  constructor() {
    this.prisma = new PrismaClient();
    this.trackingQueue = new Map(); // قائمة انتظار للتتبع
    this.outcomeTypes = {
      PURCHASE: 'purchase',
      ABANDONED: 'abandoned',
      ESCALATED: 'escalated',
      RESOLVED: 'resolved',
      PENDING: 'pending'
    };
    
    //console.log('📈 [OutcomeTracker] Service initialized');
  }

  /**
   * تسجيل نتيجة محادثة
   */
  async recordConversationOutcome(outcomeData) {
    try {
      const {
        conversationId,
        customerId,
        companyId,
        outcome,
        outcomeValue = null,
        responseQuality = null,
        customerSatisfaction = null,
        metadata = {}
      } = outcomeData;

      // التحقق من صحة البيانات
      if (!conversationId || !customerId || !companyId || !outcome) {
        throw new Error('Missing required fields: conversationId, customerId, companyId, outcome');
      }

      // حساب معلومات إضافية عن المحادثة
      const conversationStats = await this.calculateConversationStats(conversationId);

      // حفظ النتيجة
      const savedOutcome = await this.prisma.conversationOutcome.create({
        data: {
          conversationId,
          customerId,
          companyId,
          outcome,
          outcomeValue,
          responseQuality,
          customerSatisfaction,
          conversionTime: conversationStats.conversionTime,
          messageCount: conversationStats.messageCount,
          aiResponseCount: conversationStats.aiResponseCount,
          humanHandoff: conversationStats.humanHandoff,
          metadata: JSON.stringify({
            ...metadata,
            stats: conversationStats,
            recordedAt: new Date()
          })
        }
      });

      //console.log(`📊 [OutcomeTracker] Outcome recorded: ${savedOutcome.id} - ${outcome}`);

      // تحديث فعالية الردود في هذه المحادثة
      await this.updateResponseEffectiveness(conversationId, outcome, outcomeValue);

      return {
        success: true,
        outcome: savedOutcome,
        message: 'تم تسجيل النتيجة بنجاح'
      };

    } catch (error) {
      console.error('❌ [OutcomeTracker] Error recording outcome:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * حساب إحصائيات المحادثة
   */
  async calculateConversationStats(conversationId) {
    try {
      // جلب رسائل المحادثة
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' }
      });

      if (messages.length === 0) {
        return {
          conversionTime: 0,
          messageCount: 0,
          aiResponseCount: 0,
          humanHandoff: false
        };
      }

      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];
      
      // حساب وقت التحويل بالدقائق
      const conversionTime = Math.round(
        (new Date(lastMessage.createdAt) - new Date(firstMessage.createdAt)) / (1000 * 60)
      );

      // عد الرسائل
      const messageCount = messages.length;
      const aiResponseCount = messages.filter(m => !m.isFromCustomer).length;
      const customerMessageCount = messages.filter(m => m.isFromCustomer).length;

      // فحص إذا كان هناك تدخل بشري
      const humanHandoff = messages.some(m => 
        !m.isFromCustomer && m.senderId // إذا كان هناك senderId فهو من البشر
      );

      return {
        conversionTime,
        messageCount,
        aiResponseCount,
        customerMessageCount,
        humanHandoff,
        firstMessageAt: firstMessage.createdAt,
        lastMessageAt: lastMessage.createdAt
      };

    } catch (error) {
      console.error('❌ [OutcomeTracker] Error calculating stats:', error);
      return {
        conversionTime: 0,
        messageCount: 0,
        aiResponseCount: 0,
        humanHandoff: false
      };
    }
  }

  /**
   * تحديث فعالية الردود
   */
  async updateResponseEffectiveness(conversationId, outcome, outcomeValue) {
    try {
      // جلب رسائل AI في هذه المحادثة
      const aiMessages = await this.prisma.message.findMany({
        where: {
          conversationId,
          isFromCustomer: false
        },
        orderBy: { createdAt: 'asc' }
      });

      const leadToPurchase = outcome === this.outcomeTypes.PURCHASE;
      const baseEffectiveness = this.calculateBaseEffectiveness(outcome, outcomeValue);

      // تحديث فعالية كل رد
      for (let i = 0; i < aiMessages.length; i++) {
        const message = aiMessages[i];
        const responseType = this.determineResponseType(message.content, i, aiMessages.length);
        const effectivenessScore = this.calculateResponseEffectiveness(
          message, 
          baseEffectiveness, 
          i, 
          aiMessages.length,
          outcome
        );

        // حفظ أو تحديث فعالية الرد
        await this.saveResponseEffectiveness({
          companyId: await this.getCompanyIdFromConversation(conversationId),
          messageId: message.id,
          conversationId,
          responseText: message.content,
          responseType,
          effectivenessScore,
          leadToPurchase,
          responseTime: await this.calculateResponseTime(message, aiMessages, i),
          wordCount: this.countWords(message.content),
          sentimentScore: await this.analyzeSentiment(message.content),
          keywords: this.extractKeywords(message.content)
        });
      }

      //console.log(`✅ [OutcomeTracker] Updated effectiveness for ${aiMessages.length} responses`);

    } catch (error) {
      console.error('❌ [OutcomeTracker] Error updating response effectiveness:', error);
    }
  }

  /**
   * حساب الفعالية الأساسية حسب النتيجة
   */
  calculateBaseEffectiveness(outcome, outcomeValue) {
    switch (outcome) {
      case this.outcomeTypes.PURCHASE:
        // كلما زادت قيمة الشراء، زادت الفعالية
        const valueBonus = outcomeValue ? Math.min(2, outcomeValue / 1000) : 0;
        return 8 + valueBonus; // 8-10
      case this.outcomeTypes.RESOLVED:
        return 7; // حل المشكلة بدون شراء
      case this.outcomeTypes.ESCALATED:
        return 4; // احتاج تدخل بشري
      case this.outcomeTypes.ABANDONED:
        return 2; // العميل ترك المحادثة
      case this.outcomeTypes.PENDING:
        return 5; // لا يزال في الانتظار
      default:
        return 5;
    }
  }

  /**
   * تحديد نوع الرد
   */
  determineResponseType(content, index, totalResponses) {
    const lowerContent = content.toLowerCase();
    
    if (index === 0) {
      return 'greeting';
    } else if (index === totalResponses - 1) {
      return 'closing';
    } else if (lowerContent.includes('سعر') || lowerContent.includes('جنيه')) {
      return 'price_quote';
    } else if (lowerContent.includes('منتج') || lowerContent.includes('كوتشي')) {
      return 'product_info';
    } else if (lowerContent.includes('شحن') || lowerContent.includes('توصيل')) {
      return 'shipping_info';
    } else if (lowerContent.includes('مقاس') || lowerContent.includes('متوفر')) {
      return 'availability_check';
    } else {
      return 'general_response';
    }
  }

  /**
   * حساب فعالية الرد المحدد
   */
  calculateResponseEffectiveness(message, baseEffectiveness, index, totalResponses, outcome) {
    let effectiveness = baseEffectiveness;
    
    // تعديل حسب موقع الرد في المحادثة
    if (index === 0) {
      // الرد الأول مهم جداً
      effectiveness += outcome === this.outcomeTypes.PURCHASE ? 1 : -0.5;
    } else if (index === totalResponses - 1) {
      // الرد الأخير يحدد النتيجة
      effectiveness += outcome === this.outcomeTypes.PURCHASE ? 1.5 : -1;
    }

    // تعديل حسب طول الرد
    const wordCount = this.countWords(message.content);
    if (wordCount < 10) {
      effectiveness -= 0.5; // ردود قصيرة جداً
    } else if (wordCount > 100) {
      effectiveness -= 0.3; // ردود طويلة جداً
    }

    // التأكد من أن النتيجة في النطاق الصحيح
    return Math.max(0, Math.min(10, effectiveness));
  }

  /**
   * حساب وقت الاستجابة
   */
  async calculateResponseTime(currentMessage, allMessages, currentIndex) {
    if (currentIndex === 0) return 0;
    
    const previousMessage = allMessages[currentIndex - 1];
    if (!previousMessage) return 0;
    
    return Math.round(
      (new Date(currentMessage.createdAt) - new Date(previousMessage.createdAt)) / 1000
    ); // بالثواني
  }

  /**
   * عد الكلمات
   */
  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * تحليل المشاعر البسيط
   */
  async analyzeSentiment(text) {
    // تحليل بسيط للمشاعر
    const positiveWords = ['ممتاز', 'رائع', 'جميل', 'مناسب', 'أهلاً', 'مرحباً', 'يسعدني'];
    const negativeWords = ['مشكلة', 'صعب', 'غالي', 'مش كويس', 'مش مناسب'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.2;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.2;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  /**
   * استخراج الكلمات المفتاحية
   */
  extractKeywords(text) {
    const keywords = [];
    const importantWords = ['سعر', 'جنيه', 'كوتشي', 'مقاس', 'لون', 'شحن', 'توصيل', 'متوفر'];
    
    const lowerText = text.toLowerCase();
    importantWords.forEach(word => {
      if (lowerText.includes(word)) {
        keywords.push(word);
      }
    });
    
    return keywords.join(', ');
  }

  /**
   * حفظ فعالية الرد
   */
  async saveResponseEffectiveness(effectivenessData) {
    try {
      // فحص إذا كان الرد موجود مسبقاً
      const existing = await this.prisma.responseEffectiveness.findFirst({
        where: {
          messageId: effectivenessData.messageId,
          conversationId: effectivenessData.conversationId
        }
      });

      if (existing) {
        // تحديث الموجود
        return await this.prisma.responseEffectiveness.update({
          where: { id: existing.id },
          data: {
            effectivenessScore: effectivenessData.effectivenessScore,
            leadToPurchase: effectivenessData.leadToPurchase,
            customerReaction: this.determineCustomerReaction(effectivenessData.effectivenessScore),
            metadata: JSON.stringify({
              updatedAt: new Date(),
              previousScore: existing.effectivenessScore
            })
          }
        });
      } else {
        // إنشاء جديد
        return await this.prisma.responseEffectiveness.create({
          data: {
            ...effectivenessData,
            customerReaction: this.determineCustomerReaction(effectivenessData.effectivenessScore),
            metadata: JSON.stringify({
              createdAt: new Date()
            })
          }
        });
      }

    } catch (error) {
      console.error('❌ [OutcomeTracker] Error saving response effectiveness:', error);
      throw error;
    }
  }

  /**
   * تحديد رد فعل العميل
   */
  determineCustomerReaction(effectivenessScore) {
    if (effectivenessScore >= 8) return 'positive';
    if (effectivenessScore >= 6) return 'neutral';
    return 'negative';
  }

  /**
   * الحصول على معرف الشركة من المحادثة
   */
  async getCompanyIdFromConversation(conversationId) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { companyId: true }
      });
      
      return conversation?.companyId;
    } catch (error) {
      console.error('❌ [OutcomeTracker] Error getting company ID:', error);
      return null;
    }
  }

  /**
   * تسجيل نتيجة تلقائية عند إنشاء طلب
   */
  async recordPurchaseOutcome(orderData) {
    try {
      const { conversationId, customerId, companyId, totalAmount } = orderData;
      
      if (!conversationId) {
        //console.log('⚠️ [OutcomeTracker] No conversation ID for order, skipping outcome recording');
        return;
      }

      return await this.recordConversationOutcome({
        conversationId,
        customerId,
        companyId,
        outcome: this.outcomeTypes.PURCHASE,
        outcomeValue: totalAmount,
        responseQuality: 8, // افتراض جودة جيدة للمبيعات
        customerSatisfaction: 4, // افتراض رضا جيد
        metadata: {
          autoRecorded: true,
          orderValue: totalAmount,
          source: 'order_creation'
        }
      });

    } catch (error) {
      console.error('❌ [OutcomeTracker] Error recording purchase outcome:', error);
    }
  }

  /**
   * الحصول على إحصائيات النتائج
   */
  async getOutcomeStats(companyId, timeRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const outcomes = await this.prisma.conversationOutcome.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate }
        }
      });

      const stats = {
        total: outcomes.length,
        purchase: outcomes.filter(o => o.outcome === this.outcomeTypes.PURCHASE).length,
        abandoned: outcomes.filter(o => o.outcome === this.outcomeTypes.ABANDONED).length,
        escalated: outcomes.filter(o => o.outcome === this.outcomeTypes.ESCALATED).length,
        resolved: outcomes.filter(o => o.outcome === this.outcomeTypes.RESOLVED).length,
        pending: outcomes.filter(o => o.outcome === this.outcomeTypes.PENDING).length
      };

      stats.conversionRate = stats.total > 0 ? (stats.purchase / stats.total * 100).toFixed(2) : 0;
      stats.totalValue = outcomes
        .filter(o => o.outcomeValue)
        .reduce((sum, o) => sum + o.outcomeValue, 0);

      return stats;

    } catch (error) {
      console.error('❌ [OutcomeTracker] Error getting outcome stats:', error);
      return null;
    }
  }
}

module.exports = OutcomeTracker;
