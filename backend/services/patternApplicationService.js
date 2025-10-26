/**
 * خدمة تطبيق الأنماط المعتمدة على الردود الفعلية
 * Pattern Application Service - تربط الأنماط المكتشفة بالـ AI الفعلي
 */

const { PrismaClient } = require('@prisma/client');

class PatternApplicationService {
  constructor() {
    this.prisma = new PrismaClient();
    this.patternCache = new Map(); // تخزين مؤقت للأنماط المعتمدة
    this.cacheExpiry = 5 * 60 * 1000; // 5 دقائق
    this.lastCacheUpdate = new Map();
    
    //console.log('🎯 [PatternApplication] Service initialized');
  }

  /**
   * جلب الأنماط المعتمدة للشركة مع التخزين المؤقت
   */
  async getApprovedPatterns(companyId) {
    try {
      // فحص حالة نظام الأنماط للشركة أولاً
      const isSystemEnabled = await this.isPatternSystemEnabledForCompany(companyId);
      if (!isSystemEnabled) {
        //console.log(`⏸️ [PatternApplication] Pattern system disabled for company: ${companyId}`);
        return [];
      }

      // فحص التخزين المؤقت
      const cacheKey = `patterns_${companyId}`;
      const lastUpdate = this.lastCacheUpdate.get(cacheKey) || 0;
      const now = Date.now();

      if (this.patternCache.has(cacheKey) && (now - lastUpdate) < this.cacheExpiry) {
        //console.log(`📋 [PatternApplication] Using cached patterns for company: ${companyId}`);
        return this.patternCache.get(cacheKey);
      }

      // جلب الأنماط من قاعدة البيانات
      const patterns = await this.prisma.successPattern.findMany({
        where: {
          companyId,
          isApproved: true,
          isActive: true
        },
        orderBy: {
          successRate: 'desc' // ترتيب حسب معدل النجاح
        }
      });

      // تحويل الأنماط إلى تنسيق قابل للاستخدام
      const processedPatterns = patterns.map(pattern => ({
        id: pattern.id,
        type: pattern.patternType,
        pattern: typeof pattern.pattern === 'string' ? JSON.parse(pattern.pattern) : pattern.pattern,
        description: pattern.description,
        successRate: pattern.successRate,
        confidenceLevel: pattern.confidenceLevel,
        sampleSize: pattern.sampleSize,
        approvedAt: pattern.approvedAt
      }));

      // تحديث التخزين المؤقت
      this.patternCache.set(cacheKey, processedPatterns);
      this.lastCacheUpdate.set(cacheKey, now);

      //console.log(`✅ [PatternApplication] Loaded ${processedPatterns.length} approved patterns for company: ${companyId}`);
      return processedPatterns;

    } catch (error) {
      console.error('❌ [PatternApplication] Error getting approved patterns:', error);
      return [];
    }
  }

  /**
   * فحص ما إذا كان نظام الأنماط مفعل للشركة
   */
  async isPatternSystemEnabledForCompany(companyId) {
    try {
      // جلب إعدادات الشركة
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true }
      });

      if (!company) {
        //console.log(`⚠️ [PatternApplication] Company ${companyId} not found`);
        return false;
      }

      // فحص الإعدادات
      let systemSettings = {};
      try {
        systemSettings = company.settings ? JSON.parse(company.settings) : {};
      } catch (e) {
        //console.log(`⚠️ [PatternApplication] Error parsing settings for company ${companyId}`);
        systemSettings = {};
      }

      // افتراضياً النظام مفعل إذا لم تكن هناك إعدادات
      const isEnabled = systemSettings.patternSystemEnabled !== false;

      //console.log(`🔍 [PatternApplication] Pattern system for company ${companyId}: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);

      return isEnabled;
    } catch (error) {
      console.error(`❌ [PatternApplication] Error checking pattern system status for company ${companyId}:`, error.message);
      // في حالة الخطأ، افتراضياً النظام مفعل
      return true;
    }
  }

  /**
   * تطبيق أنماط الكلمات الناجحة على النص
   */
  async applyWordPatterns(text, patterns) {
    try {
      let enhancedText = text;
      const wordPatterns = patterns.filter(p => p.type === 'word_usage');

      for (const pattern of wordPatterns) {
        const patternData = pattern.pattern;
        
        // دعم successfulWords (البنية الجديدة)
        if (patternData.successfulWords && Array.isArray(patternData.successfulWords)) {
          // إضافة الكلمات الناجحة إذا لم تكن موجودة
          const missingWords = patternData.successfulWords.filter(word =>
            !enhancedText.toLowerCase().includes(word.toLowerCase())
          );

          if (missingWords.length > 0 && pattern.successRate > 0.7) {
            // إضافة كلمة واحدة من الكلمات المفقودة بشكل طبيعي
            const wordToAdd = missingWords[0];
            const beforeText = enhancedText;
            enhancedText = this.naturallyInsertWord(enhancedText, wordToAdd);

            if (enhancedText !== beforeText) {
              //console.log(`✅ [PatternApplication] Successfully added word: "${wordToAdd}" (success rate: ${pattern.successRate})`);
              //console.log(`📝 [PatternApplication] Before: "${beforeText}"`);
              //console.log(`✨ [PatternApplication] After: "${enhancedText}"`);
            } else {
              //console.log(`⚪ [PatternApplication] No change for word: "${wordToAdd}" (already exists or filtered)`);
            }
          }
        }

        // دعم successWords (البنية القديمة - للتوافق مع الأنماط القديمة)
        if (patternData.successWords && Array.isArray(patternData.successWords)) {
          const words = patternData.successWords.map(item =>
            typeof item === 'object' ? (item.word || item) : item
          );

          const missingWords = words.filter(word =>
            !enhancedText.toLowerCase().includes(word.toLowerCase())
          );

          if (missingWords.length > 0 && pattern.successRate > 0.7) {
            const wordToAdd = missingWords[0];
            enhancedText = this.naturallyInsertWord(enhancedText, wordToAdd);

            //console.log(`📝 [PatternApplication] Added successful word (legacy): "${wordToAdd}" (success rate: ${pattern.successRate})`);
          }
        }

        // تجنب الكلمات الفاشلة
        if (patternData.failureWords && Array.isArray(patternData.failureWords)) {
          for (const failWord of patternData.failureWords) {
            if (enhancedText.toLowerCase().includes(failWord.toLowerCase())) {
              enhancedText = this.replaceFailureWord(enhancedText, failWord);
              //console.log(`🔄 [PatternApplication] Replaced failure word: "${failWord}"`);
            }
          }
        }
      }

      return enhancedText;
    } catch (error) {
      console.error('❌ [PatternApplication] Error applying word patterns:', error);
      return text;
    }
  }

  /**
   * تطبيق أنماط الأسلوب على النص
   */
  async applyStylePatterns(text, patterns) {
    try {
      let enhancedText = text;
      const stylePatterns = patterns.filter(p => p.type === 'response_style');

      for (const pattern of stylePatterns) {
        const patternData = pattern.pattern;
        
        if (patternData.preferredLength) {
          const currentWordCount = enhancedText.split(' ').length;
          const targetLength = patternData.preferredLength;
          
          // تعديل طول النص حسب النمط المفضل
          if (currentWordCount < targetLength * 0.8) {
            // النص قصير جداً - إضافة تفاصيل
            enhancedText = this.expandText(enhancedText, targetLength - currentWordCount);
            //console.log(`📏 [PatternApplication] Expanded text to match preferred length: ${targetLength} words`);
          } else if (currentWordCount > targetLength * 1.3) {
            // النص طويل جداً - اختصار
            enhancedText = this.condenseText(enhancedText, targetLength);
            //console.log(`✂️ [PatternApplication] Condensed text to match preferred length: ${targetLength} words`);
          }
        }

        // تطبيق هيكل الرد المفضل
        if (patternData.structure) {
          enhancedText = this.applyResponseStructure(enhancedText, patternData.structure);
        }
      }

      return enhancedText;
    } catch (error) {
      console.error('❌ [PatternApplication] Error applying style patterns:', error);
      return text;
    }
  }

  /**
   * تطبيق الأنماط العاطفية على النص
   */
  async applyEmotionalPatterns(text, patterns) {
    try {
      let enhancedText = text;
      const emotionalPatterns = patterns.filter(p => p.type === 'emotional_tone');

      for (const pattern of emotionalPatterns) {
        const patternData = pattern.pattern;
        
        if (patternData.preferredSentiment > 0.5) {
          // تحسين النبرة الإيجابية
          enhancedText = this.enhancePositiveTone(enhancedText);
          //console.log(`😊 [PatternApplication] Enhanced positive tone (target: ${patternData.preferredSentiment})`);
        }

        // إضافة الكلمات العاطفية المناسبة
        if (patternData.emotionalWords && Array.isArray(patternData.emotionalWords)) {
          const emotionalWord = patternData.emotionalWords[0];
          if (!enhancedText.toLowerCase().includes(emotionalWord.toLowerCase())) {
            enhancedText = this.addEmotionalWord(enhancedText, emotionalWord);
          }
        }
      }

      return enhancedText;
    } catch (error) {
      console.error('❌ [PatternApplication] Error applying emotional patterns:', error);
      return text;
    }
  }

  /**
   * تسجيل استخدام الأنماط في دفعة واحدة (محسن للسرعة)
   */
  async recordPatternUsageBatch(patternIds, conversationId, companyId) {
    try {
      //console.log(`🚀 [PatternApplication] Recording batch usage for ${patternIds.length} patterns in conversation ${conversationId}`);

      if (!companyId || patternIds.length === 0) {
        //console.log('⚠️ [PatternApplication] Skipping batch recording: missing data');
        return;
      }

      // إنشاء جميع السجلات في دفعة واحدة
      const usageRecords = patternIds.map(patternId => ({
        patternId,
        conversationId,
        companyId,
        applied: true,
        createdAt: new Date()
      }));

      // حفظ جميع السجلات في استدعاء واحد
      await this.prisma.patternUsage.createMany({
        data: usageRecords,
        skipDuplicates: true
      });

      // تحديث إحصائيات الأداء في دفعة واحدة (في الخلفية)
      this.updatePatternPerformanceBatch(patternIds, companyId).catch(error => {
        console.error('❌ [PatternApplication] Error updating batch performance:', error);
      });

      //console.log(`✅ [PatternApplication] Batch usage recorded for ${patternIds.length} patterns`);

    } catch (error) {
      console.error('❌ [PatternApplication] Error recording batch pattern usage:', error);
    }
  }

  /**
   * تحديث إحصائيات الأداء في دفعة واحدة
   */
  async updatePatternPerformanceBatch(patternIds, companyId) {
    try {
      // الحصول على جميع سجلات الأداء الموجودة
      const existingPerformances = await this.prisma.patternPerformance.findMany({
        where: {
          patternId: { in: patternIds },
          companyId
        }
      });

      const existingPatternIds = existingPerformances.map(p => p.patternId);
      const newPatternIds = patternIds.filter(id => !existingPatternIds.includes(id));

      // إنشاء سجلات جديدة للأنماط التي لا تملك سجلات أداء
      if (newPatternIds.length > 0) {
        const newPerformances = newPatternIds.map(patternId => ({
          patternId,
          companyId,
          usageCount: 1,
          successCount: 1,
          failureCount: 0,
          currentSuccessRate: 100,
          impactScore: 0,
          roi: 0
        }));

        await this.prisma.patternPerformance.createMany({
          data: newPerformances,
          skipDuplicates: true
        });
      }

      // تحديث السجلات الموجودة
      if (existingPatternIds.length > 0) {
        await this.prisma.patternPerformance.updateMany({
          where: {
            patternId: { in: existingPatternIds },
            companyId
          },
          data: {
            usageCount: { increment: 1 },
            successCount: { increment: 1 },
            updatedAt: new Date()
          }
        });
      }

      //console.log(`📊 [PatternApplication] Updated performance for ${patternIds.length} patterns`);

    } catch (error) {
      console.error('❌ [PatternApplication] Error updating batch performance:', error);
    }
  }

  /**
   * تسجيل استخدام النمط لتتبع الأداء (الطريقة القديمة - للاستخدام الفردي)
   */
  async recordPatternUsage(patternId, conversationId, applied = true, companyId = null) {
    try {
      //console.log(`📊 [PatternApplication] Recording pattern usage: ${patternId} ${applied ? 'applied' : 'skipped'} in conversation ${conversationId}`);

      // الحصول على معلومات النمط إذا لم يتم توفير companyId
      if (!companyId) {
        const pattern = await this.prisma.successPattern.findUnique({
          where: { id: patternId },
          select: { companyId: true }
        });
        companyId = pattern?.companyId;
      }

      if (!companyId) {
        console.error('❌ [PatternApplication] Cannot record usage: missing companyId');
        return;
      }

      // حفظ في جدول PatternUsage
      await this.prisma.patternUsage.create({
        data: {
          patternId,
          conversationId,
          companyId,
          applied,
          createdAt: new Date()
        }
      });

      // تحديث إحصائيات الأداء
      await this.updatePatternPerformance(patternId, companyId);

      //console.log(`✅ [PatternApplication] Pattern usage recorded successfully`);

    } catch (error) {
      console.error('❌ [PatternApplication] Error recording pattern usage:', error);
    }
  }

  /**
   * تحديث إحصائيات أداء النمط
   */
  async updatePatternPerformance(patternId, companyId) {
    try {
      // البحث عن سجل الأداء الموجود أو إنشاء واحد جديد
      let performance = await this.prisma.patternPerformance.findFirst({
        where: { patternId, companyId }
      });

      if (!performance) {
        performance = await this.prisma.patternPerformance.create({
          data: {
            patternId,
            companyId,
            usageCount: 0,
            successCount: 0,
            failureCount: 0,
            currentSuccessRate: 0,
            impactScore: 0,
            roi: 0
          }
        });
      }

      // حساب الإحصائيات الجديدة
      const usageStats = await this.calculatePatternUsageStats(patternId);

      // تحديث سجل الأداء
      await this.prisma.patternPerformance.update({
        where: { id: performance.id },
        data: {
          usageCount: usageStats.totalUsage,
          successCount: usageStats.successCount,
          failureCount: usageStats.failureCount,
          currentSuccessRate: usageStats.successRate,
          lastUsedAt: new Date(),
          performanceTrend: this.calculatePerformanceTrend(performance.currentSuccessRate, usageStats.successRate),
          impactScore: usageStats.impactScore,
          roi: usageStats.roi,
          updatedAt: new Date()
        }
      });

      //console.log(`📈 [PatternApplication] Performance updated for pattern ${patternId}: ${Math.round(usageStats.successRate * 100)}% success rate`);

    } catch (error) {
      console.error('❌ [PatternApplication] Error updating pattern performance:', error);
    }
  }

  /**
   * حساب إحصائيات استخدام النمط
   */
  async calculatePatternUsageStats(patternId) {
    try {
      // جلب جميع استخدامات النمط في آخر 30 يوم
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usageRecords = await this.prisma.patternUsage.findMany({
        where: {
          patternId,
          createdAt: { gte: thirtyDaysAgo }
        }
      });

      const totalUsage = usageRecords.length;
      const appliedUsage = usageRecords.filter(u => u.applied).length;

      // حساب معدل النجاح المحسن بناءً على بيانات حقيقية
      const successCount = await this.calculateRealSuccessCount(patternId, usageRecords);
      const failureCount = appliedUsage - successCount;
      const successRate = appliedUsage > 0 ? successCount / appliedUsage : 0;

      // حساب درجة التأثير (0-10)
      const impactScore = Math.min(10, successRate * 10 * Math.log10(totalUsage + 1));

      // حساب ROI الحقيقي
      const roi = await this.calculatePatternROI(patternId, successCount, totalUsage);

      return {
        totalUsage,
        appliedUsage,
        successCount,
        failureCount,
        successRate,
        impactScore,
        roi
      };

    } catch (error) {
      console.error('❌ [PatternApplication] Error calculating usage stats:', error);
      return {
        totalUsage: 0,
        appliedUsage: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        impactScore: 0
      };
    }
  }

  /**
   * حساب اتجاه الأداء
   */
  calculatePerformanceTrend(oldRate, newRate) {
    const difference = newRate - oldRate;
    if (difference > 0.05) return 'up';
    if (difference < -0.05) return 'down';
    return 'stable';
  }

  /**
   * تطبيق جميع الأنماط على النص
   */
  async applyAllPatterns(text, companyId, conversationId = null) {
    try {
      //console.log(`🎯 [PatternApplication] Applying patterns for company: ${companyId}`);
      
      // جلب الأنماط المعتمدة
      const patterns = await this.getApprovedPatterns(companyId);
      
      if (patterns.length === 0) {
        //console.log(`⚠️ [PatternApplication] No approved patterns found for company: ${companyId}`);
        return text;
      }

      let enhancedText = text;

      // تطبيق أنماط الكلمات
      enhancedText = await this.applyWordPatterns(enhancedText, patterns);
      
      // تطبيق أنماط الأسلوب
      enhancedText = await this.applyStylePatterns(enhancedText, patterns);
      
      // تطبيق الأنماط العاطفية
      enhancedText = await this.applyEmotionalPatterns(enhancedText, patterns);

      // تسجيل الاستخدام (محسن للسرعة)
      if (conversationId) {
        // تسجيل جميع الأنماط في دفعة واحدة بدلاً من واحد واحد
        await this.recordPatternUsageBatch(patterns.map(p => p.id), conversationId, companyId);
      }

      // تسجيل مفصل للتطبيق
      if (enhancedText !== text) {
        //console.log(`🎯 [PatternApplication] Text transformation completed:`);
        //console.log(`📝 Original: "${text}"`);
        //console.log(`✨ Enhanced: "${enhancedText}"`);
        //console.log(`📊 Applied ${patterns.length} patterns successfully`);
      } else {
        //console.log(`⚪ [PatternApplication] No changes made with ${patterns.length} patterns`);
      }

      return enhancedText;

    } catch (error) {
      console.error('❌ [PatternApplication] Error applying all patterns:', error);
      return text;
    }
  }

  // ===== Helper Methods =====

  /**
   * إدراج كلمة بشكل طبيعي في النص
   */
  naturallyInsertWord(text, word) {
    // تحقق من وجود الكلمة أولاً
    if (text.toLowerCase().includes(word.toLowerCase())) {
      //console.log(`⚪ [PatternApplication] Word "${word}" already exists in text`);
      return text;
    }

    // إضافة الكلمة بشكل طبيعي حسب نوعها
    if (word === 'أهلاً بيك' || word === 'مرحباً') {
      //console.log(`✨ [PatternApplication] Adding greeting: "${word}"`);
      return `${word}! ${text}`;
    }

    if (word === 'يسعدني' || word === 'بالطبع' || word === 'ممتاز') {
      //console.log(`✨ [PatternApplication] Adding positive word: "${word}"`);
      return `${word}! ${text}`;
    }

    //console.log(`✨ [PatternApplication] Adding word at end: "${word}"`);
    return `${text} ${word}`;
  }

  /**
   * استبدال الكلمات الفاشلة بكلمات أفضل
   */
  replaceFailureWord(text, failWord) {
    const replacements = {
      'للأسف': 'نعتذر، لكن',
      'غير متوفر': 'سنوفره قريباً',
      'لا أعرف': 'دعني أتحقق لك',
      'مش موجود': 'غير متاح حالياً',
      'مستحيل': 'صعب حالياً'
    };
    
    const replacement = replacements[failWord] || failWord;
    return text.replace(new RegExp(failWord, 'gi'), replacement);
  }

  /**
   * توسيع النص لإضافة تفاصيل
   */
  expandText(text, wordsToAdd) {
    const expansions = [
      '😊',
      'وسأكون سعيد لمساعدتك',
      'هل تحتاج معلومات إضافية؟',
      'يمكنني تقديم المزيد من التفاصيل',
      'لا تتردد في السؤال'
    ];
    
    const expansion = expansions[Math.floor(Math.random() * expansions.length)];
    return `${text} ${expansion}`;
  }

  /**
   * اختصار النص
   */
  condenseText(text, targetLength) {
    const words = text.split(' ');
    if (words.length <= targetLength) return text;
    
    return words.slice(0, targetLength).join(' ') + '...';
  }

  /**
   * تطبيق هيكل الرد
   */
  applyResponseStructure(text, structure) {
    // تطبيق هيكل مثل "greeting + info + question"
    if (structure === 'greeting + info + question') {
      if (!text.includes('؟')) {
        text += ' هل يمكنني مساعدتك في شيء آخر؟';
      }
    }
    
    return text;
  }

  /**
   * تحسين النبرة الإيجابية
   */
  enhancePositiveTone(text) {
    // إضافة كلمات إيجابية
    const positiveWords = ['ممتاز', 'رائع', 'بالطبع', 'يسعدني'];
    const randomPositive = positiveWords[Math.floor(Math.random() * positiveWords.length)];
    
    if (!text.includes(randomPositive)) {
      return `${randomPositive}! ${text}`;
    }
    
    return text;
  }

  /**
   * إضافة كلمة عاطفية
   */
  addEmotionalWord(text, emotionalWord) {
    return `${text} ${emotionalWord}`;
  }

  /**
   * تنظيف التخزين المؤقت
   */
  clearCache(companyId = null) {
    if (companyId) {
      const cacheKey = `patterns_${companyId}`;
      this.patternCache.delete(cacheKey);
      this.lastCacheUpdate.delete(cacheKey);
      //console.log(`🧹 [PatternApplication] Cleared cache for company: ${companyId}`);
    } else {
      this.patternCache.clear();
      this.lastCacheUpdate.clear();
      //console.log('🧹 [PatternApplication] Cleared all pattern cache');
    }
  }

  /**
   * حساب عدد النجاحات الحقيقي بناءً على بيانات المحادثات
   */
  async calculateRealSuccessCount(patternId, usageRecords) {
    try {
      let successCount = 0;

      for (const usage of usageRecords) {
        if (!usage.applied || !usage.conversationId) continue;

        // البحث عن نتائج المحادثة
        const conversationOutcome = await this.prisma.conversationOutcome.findFirst({
          where: {
            conversationId: usage.conversationId,
            createdAt: { gte: usage.createdAt }
          }
        });

        if (conversationOutcome) {
          // إذا كانت النتيجة إيجابية (طلب، رضا، إلخ)
          if (conversationOutcome.outcome === 'order_created' ||
              conversationOutcome.outcome === 'satisfied' ||
              conversationOutcome.satisfactionScore > 3) {
            successCount++;
          }
        } else {
          // إذا لم توجد نتيجة، استخدم تقدير بناءً على معدل النجاح العام للنمط
          const pattern = await this.prisma.successPattern.findUnique({
            where: { id: patternId },
            select: { successRate: true }
          });

          if (pattern && Math.random() < pattern.successRate) {
            successCount++;
          }
        }
      }

      return successCount;

    } catch (error) {
      console.error('❌ [PatternApplication] Error calculating real success count:', error);
      // العودة للتقدير المؤقت في حالة الخطأ
      return Math.round(usageRecords.filter(u => u.applied).length * 0.75);
    }
  }

  /**
   * حساب عائد الاستثمار للنمط
   */
  async calculatePatternROI(patternId, successCount, totalUsage) {
    try {
      // الحصول على معلومات النمط
      const pattern = await this.prisma.successPattern.findUnique({
        where: { id: patternId },
        select: {
          patternType: true,
          successRate: true,
          companyId: true
        }
      });

      if (!pattern) return 0;

      // تقدير القيمة المالية للنجاحات
      const avgOrderValue = await this.getAverageOrderValue(pattern.companyId);
      const conversionRate = 0.15; // معدل تحويل تقديري 15%

      // الإيرادات المقدرة من النجاحات
      const estimatedRevenue = successCount * avgOrderValue * conversionRate;

      // التكلفة المقدرة (تطوير وصيانة النمط)
      const developmentCost = this.getPatternDevelopmentCost(pattern.patternType);
      const maintenanceCost = totalUsage * 0.01; // تكلفة صيانة صغيرة لكل استخدام

      const totalCost = developmentCost + maintenanceCost;

      // حساب ROI
      const roi = totalCost > 0 ? ((estimatedRevenue - totalCost) / totalCost) * 100 : 0;

      return Math.round(roi * 100) / 100; // تقريب لرقمين عشريين

    } catch (error) {
      console.error('❌ [PatternApplication] Error calculating ROI:', error);
      return 0;
    }
  }

  /**
   * الحصول على متوسط قيمة الطلب للشركة
   */
  async getAverageOrderValue(companyId) {
    try {
      const result = await this.prisma.order.aggregate({
        where: {
          companyId,
          status: 'DELIVERED',
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // آخر 90 يوم
          }
        },
        _avg: { total: true },
        _count: true
      });

      return result._avg.total || 300; // قيمة افتراضية 300 جنيه

    } catch (error) {
      console.error('❌ [PatternApplication] Error getting average order value:', error);
      return 300; // قيمة افتراضية
    }
  }

  /**
   * تقدير تكلفة تطوير النمط
   */
  getPatternDevelopmentCost(patternType) {
    const costs = {
      'word_usage': 50,      // تكلفة منخفضة
      'response_style': 75,  // تكلفة متوسطة
      'timing': 100,         // تكلفة عالية
      'personalization': 150, // تكلفة عالية جداً
      'default': 75
    };

    return costs[patternType] || costs.default;
  }
}

module.exports = PatternApplicationService;
