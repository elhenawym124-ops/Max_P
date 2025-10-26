/**
 * Pattern Detector Service
 * 
 * خدمة اكتشاف الأنماط - تكتشف الأنماط الجديدة في البيانات
 * وتحدد ما إذا كانت مهمة بما يكفي للحفظ
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

class PatternDetector {
  constructor() {
    try {
      this.prisma = getSharedPrismaClient();
      //console.log('✅ [PatternDetector] Using shared Prisma client');
    } catch (error) {
      console.error('❌ [PatternDetector] Failed to get Prisma client:', error);
      throw error;
    }

    this.detectionRules = new Map();
    this.minPatternStrength = 0.4; // تقليل العتبة للاكتشاف التلقائي
    this.minSampleSize = 3; // الحد الأدنى للعينات
    this.aiOnly = true; // تفعيل وضع الذكاء الصناعي فقط

    //console.log('🤖 [PatternDetector] Service initialized with AI-ONLY mode');
    //console.log('✅ [PatternDetector] Keyword analysis DISABLED');
    //console.log('✅ [PatternDetector] AI analysis ENABLED');
    //console.log(`📊 [PatternDetector] Min pattern strength: ${this.minPatternStrength}`);
    //console.log(`📊 [PatternDetector] Min sample size: ${this.minSampleSize}`);

    this.initializeDetectionRules();
  }

  /**
   * تهيئة قواعد اكتشاف الأنماط
   */
  initializeDetectionRules() {
    // قواعد اكتشاف أنماط الكلمات
    this.detectionRules.set('word_patterns', {
      minFrequencyDifference: 0.3, // فرق التكرار المطلوب
      minWordOccurrence: 3, // الحد الأدنى لظهور الكلمة
      significanceThreshold: 1.5 // نسبة الأهمية
    });

    // قواعد اكتشاف أنماط التوقيت
    this.detectionRules.set('timing_patterns', {
      minTimeDifference: 5, // 5 دقائق فرق على الأقل
      maxResponseTime: 120, // 2 ساعة كحد أقصى
      significanceLevel: 0.05 // مستوى الدلالة الإحصائية
    });

    // قواعد اكتشاف أنماط الأسلوب
    this.detectionRules.set('style_patterns', {
      minLengthDifference: 5, // 5 كلمات فرق على الأقل
      maxResponseLength: 200, // 200 كلمة كحد أقصى
      styleCategories: ['concise', 'detailed', 'moderate']
    });

    // قواعد اكتشاف الأنماط العاطفية
    this.detectionRules.set('emotional_patterns', {
      minSentimentDifference: 0.2, // 0.2 فرق في المشاعر
      sentimentRange: [-1, 1], // نطاق المشاعر
      emotionalCategories: ['positive', 'negative', 'neutral']
    });
  }

  /**
   * اكتشاف الأنماط الجديدة في البيانات
   */
  async detectNewPatterns(companyId, timeRange = 7) {
    try {
      //console.log(`🔍 [PatternDetector] Detecting patterns for company: ${companyId}`);

      // حفظ companyId للاستخدام في analyzeWithAI
      this.companyId = companyId;
      //console.log('🔍 [PatternDetector] Set companyId to:', this.companyId);

      // التأكد من وجود Prisma client
      if (!this.prisma) {
        console.error('❌ [PatternDetector] Prisma client not initialized');
        try {
          this.prisma = getSharedPrismaClient();
          //console.log('✅ [PatternDetector] Prisma client re-initialized');
        } catch (reinitError) {
          console.error('❌ [PatternDetector] Failed to re-initialize Prisma:', reinitError);
          return {
            success: false,
            patterns: [],
            message: 'Database connection failed',
            error: reinitError.message
          };
        }
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // جلب البيانات الحديثة
      const recentData = await this.getRecentData(companyId, startDate);
      
      if (!this.hasEnoughData(recentData)) {
        return {
          success: false,
          message: 'بيانات غير كافية لاكتشاف أنماط جديدة',
          dataCount: recentData.outcomes.length + recentData.responses.length
        };
      }

      // اكتشاف أنماط مختلفة
      const detectedPatterns = [];

      // اكتشاف الأنماط بالذكاء الصناعي فقط
      //console.log('🤖 [PatternDetector] Using AI-only pattern detection...');
      const aiPatterns = await this.detectPatternsWithAI(recentData, companyId);
      detectedPatterns.push(...aiPatterns);

      // تصفية الأنماط المهمة فقط
      let significantPatterns = detectedPatterns.filter(pattern =>
        pattern.strength >= this.minPatternStrength
      );

      //console.log(`✅ [PatternDetector] Found ${significantPatterns.length} significant patterns`);

      // فلترة الأنماط المكررة قبل الحفظ
      //console.log(`🔍 [PatternDetector] Filtering duplicates from detected patterns...`);
      const existingPatterns = await this.prisma.successPattern.findMany({
        where: { companyId },
        select: {
          id: true,
          description: true,
          patternType: true,
          successRate: true,
          pattern: true
        }
      });

      const uniquePatterns = await this.filterDuplicatePatterns(significantPatterns, existingPatterns);
      //console.log(`✅ [PatternDetector] After duplicate filtering: ${uniquePatterns.length} unique patterns`);
      significantPatterns = uniquePatterns;

      // إضافة معلومات إضافية للأنماط المكتشفة
      const patternsWithDetails = significantPatterns.map(pattern => ({
        ...pattern,
        isNew: true,
        needsApproval: !pattern.isApproved,
        detectedAt: new Date().toISOString()
      }));

      return {
        success: true,
        patterns: patternsWithDetails,
        metadata: {
          totalDetected: detectedPatterns.length,
          significantCount: significantPatterns.length,
          savedCount: patternsWithDetails.length,
          dataRange: timeRange,
          detectionDate: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ [PatternDetector] Error detecting patterns:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * فحص حالة الاتصال بقاعدة البيانات
   */
  async checkDatabaseConnection() {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client is not initialized');
      }

      // SECURITY: Safe connection test query - no user data or company isolation needed
      // This is a simple database connectivity test that doesn't access any user tables
      await this.prisma.$queryRaw`SELECT 1 as connection_test`;
      //console.log('✅ [PatternDetector] Database connection verified');
      return true;
    } catch (error) {
      console.error('❌ [PatternDetector] Database connection failed:', error.message);
      return false;
    }
  }

  /**
   * جلب البيانات الحديثة
   */
  async getRecentData(companyId, startDate) {
    //console.log(`📊 [PatternDetector] Fetching data since: ${startDate.toISOString()}`);

    // فحص الاتصال بقاعدة البيانات أولاً
    const isConnected = await this.checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection is not available');
    }

    try {
      //console.log('🔄 [PatternDetector] Starting data fetch from database...');

      const [outcomes, responses, interactions, learningData, messages] = await Promise.all([
        this.prisma.conversationOutcome.findMany({
          where: {
            companyId,
            createdAt: { gte: startDate }
          },
          take: 100
        }).catch(error => {
          console.error('❌ [PatternDetector] Error fetching outcomes:', error);
          return [];
        }),
        this.prisma.responseEffectiveness.findMany({
          where: {
            companyId,
            createdAt: { gte: startDate }
          },
          take: 100
        }).catch(error => {
          console.error('❌ [PatternDetector] Error fetching responses:', error);
          return [];
        }),
        this.prisma.aiInteraction.findMany({
          where: {
            companyId,
            createdAt: { gte: startDate }
          },
          take: 100
        }).catch(error => {
          console.error('❌ [PatternDetector] Error fetching interactions:', error);
          return [];
        }),
        // محاولة جلب بيانات التعلم المستمر (قد لا يكون الجدول موجود)
        Promise.resolve([]).catch(() => []),
        // إضافة الرسائل مباشرة (بدون علاقات معقدة)
        this.prisma.message.findMany({
          where: {
            createdAt: { gte: startDate }
          },
          take: 200,
          orderBy: { createdAt: 'desc' }
        }).catch(error => {
          console.error('❌ [PatternDetector] Error fetching messages:', error);
          return [];
        })
      ]);

      //console.log(`📊 [PatternDetector] Data fetched:`);
      //console.log(`   - Outcomes: ${outcomes.length}`);
      //console.log(`   - Responses: ${responses.length}`);
      //console.log(`   - Interactions: ${interactions.length}`);
      //console.log(`   - Learning Data: ${learningData.length}`);
      //console.log(`   - Messages: ${messages.length}`);

      return {
        outcomes,
        responses,
        interactions,
        learningData,
        messages
      };
    } catch (error) {
      console.error('❌ [PatternDetector] Error fetching data:', error);
      return { outcomes: [], responses: [], interactions: [], learningData: [], messages: [] };
    }
  }

  /**
   * جلب البيانات للتحليل
   */
  async fetchData(companyId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      //console.log(`📊 [PatternDetector] Fetching data for company: ${companyId} (last ${days} days)`);

      // ✅ إضافة فلترة companyId للعزل الأمني
      const [outcomes, responses, interactions, learningData, messages] = await Promise.all([
        // نتائج المحادثات
        this.prisma.conversationOutcome.findMany({
          where: {
            companyId, // فلترة حسب الشركة
            createdAt: { gte: startDate }
          },
          take: 100
        }).catch(error => {
          console.error('❌ [PatternDetector] Error fetching outcomes:', error);
          return [];
        }),
        // فعالية الردود
        this.prisma.responseEffectiveness.findMany({
          where: {
            companyId, // فلترة حسب الشركة
            createdAt: { gte: startDate }
          },
          take: 100
        }).catch(error => {
          console.error('❌ [PatternDetector] Error fetching responses:', error);
          return [];
        }),
        // تفاعلات الذكاء الاصطناعي
        this.prisma.aiInteraction.findMany({
          where: {
            companyId, // فلترة حسب الشركة
            createdAt: { gte: startDate }
          },
          take: 100
        }).catch(error => {
          console.error('❌ [PatternDetector] Error fetching interactions:', error);
          return [];
        }),
        // محاولة جلب بيانات التعلم المستمر (قد لا يكون الجدول موجود)
        Promise.resolve([]).catch(() => []),
        // إضافة الرسائل مباشرة (بدون علاقات معقدة) مع فلترة companyId
        this.prisma.message.findMany({
          where: {
            createdAt: { gte: startDate },
            conversation: { companyId } // ✅ فلترة حسب الشركة
          },
          take: 200,
          orderBy: { createdAt: 'desc' }
        }).catch(error => {
          console.error('❌ [PatternDetector] Error fetching messages:', error);
          return [];
        })
      ]);

      //console.log(`📊 [PatternDetector] Data fetched:`);
      //console.log(`   - Outcomes: ${outcomes.length}`);
      //console.log(`   - Responses: ${responses.length}`);
      //console.log(`   - Interactions: ${interactions.length}`);
      //console.log(`   - Learning Data: ${learningData.length}`);
      //console.log(`   - Messages: ${messages.length}`);

      return {
        outcomes,
        responses,
        interactions,
        learningData,
        messages
      };
    } catch (error) {
      console.error('❌ [PatternDetector] Error fetching data:', error);
      return { outcomes: [], responses: [], interactions: [], learningData: [], messages: [] };
    }
  }

  /**
   * فحص كفاية البيانات
   */
  hasEnoughData(data) {
    const totalRecords = data.outcomes.length + data.responses.length + data.interactions.length +
                        (data.learningData?.length || 0) + (data.messages?.length || 0);

    //console.log(`📊 [PatternDetector] Data sufficiency check:`);
    //console.log(`   - Total records: ${totalRecords}`);
    //console.log(`   - Minimum required: ${this.minSampleSize}`);
    //console.log(`   - Sufficient: ${totalRecords >= this.minSampleSize}`);

    // تقليل العتبة أكثر إذا كان لدينا بيانات تعلم
    const adjustedMinSize = (data.learningData?.length > 0 || data.messages?.length > 0) ?
                           Math.max(1, this.minSampleSize / 2) : this.minSampleSize;

    //console.log(`   - Adjusted minimum: ${adjustedMinSize}`);

    return totalRecords >= adjustedMinSize;
  }

  /**
   * اكتشاف أنماط الكلمات الناشئة
   */
  async detectEmergingWordPatterns(data) {
    const patterns = [];
    const rules = this.detectionRules.get('word_patterns');

    //console.log(`🔍 [PatternDetector] Analyzing word patterns...`);

    // تحليل البيانات من مصادر متعددة
    let successfulTexts = [];
    let unsuccessfulTexts = [];

    // 1. من الردود المباشرة
    const recentSuccessful = data.responses.filter(r => r.leadToPurchase || r.effectivenessScore >= 8);
    const recentUnsuccessful = data.responses.filter(r => !r.leadToPurchase && r.effectivenessScore < 6);

    successfulTexts.push(...recentSuccessful.map(r => r.responseText));
    unsuccessfulTexts.push(...recentUnsuccessful.map(r => r.responseText));

    // 2. من بيانات التعلم المستمر
    if (data.learningData && data.learningData.length > 0) {
      const successfulLearning = data.learningData.filter(l => l.outcome === 'purchase' || l.outcome === 'positive');
      const unsuccessfulLearning = data.learningData.filter(l => l.outcome === 'abandoned' || l.outcome === 'negative');

      successfulTexts.push(...successfulLearning.map(l => l.aiResponse).filter(Boolean));
      unsuccessfulTexts.push(...unsuccessfulLearning.map(l => l.aiResponse).filter(Boolean));
    }

    // 3. من الرسائل المرتبطة بنتائج ناجحة
    if (data.messages && data.messages.length > 0) {
      const successfulMessages = data.messages.filter(m =>
        m.conversation?.outcomes?.some(o => o.outcome === 'purchase')
      );
      const unsuccessfulMessages = data.messages.filter(m =>
        m.conversation?.outcomes?.some(o => o.outcome === 'abandoned')
      );

      successfulTexts.push(...successfulMessages.map(m => m.content).filter(Boolean));
      unsuccessfulTexts.push(...unsuccessfulMessages.map(m => m.content).filter(Boolean));
    }

    //console.log(`📊 [PatternDetector] Text analysis:`);
    //console.log(`   - Successful texts: ${successfulTexts.length}`);
    //console.log(`   - Unsuccessful texts: ${unsuccessfulTexts.length}`);

    // تقليل العتبة المطلوبة
    if (successfulTexts.length < 2 && unsuccessfulTexts.length < 2) {
      //console.log(`⚠️ [PatternDetector] Insufficient text data for word pattern analysis`);
      return patterns;
    }

    // استخراج الكلمات من النصوص
    const successWords = this.extractWords(successfulTexts);
    const failWords = this.extractWords(unsuccessfulTexts);

    //console.log(`📝 [PatternDetector] Word extraction:`);
    //console.log(`   - Success words found: ${Object.keys(successWords).length}`);
    //console.log(`   - Fail words found: ${Object.keys(failWords).length}`);

    // البحث عن كلمات ناشئة
    const emergingWords = this.findEmergingWords(successWords, failWords, rules);

    //console.log(`🔍 [PatternDetector] Emerging words found: ${emergingWords.length}`);

    if (emergingWords.length > 0) {
      const strength = this.calculateWordPatternStrength(emergingWords, successWords, failWords);
      //console.log(`💪 [PatternDetector] Pattern strength: ${strength}`);

      patterns.push({
        type: 'emerging_words',
        pattern: emergingWords,
        strength: strength,
        description: `كلمات ناشئة مؤثرة: ${emergingWords.slice(0, 3).join(', ')}`,
        metadata: {
          successfulResponses: recentSuccessful.length,
          unsuccessfulResponses: recentUnsuccessful.length,
          emergingWordCount: emergingWords.length
        }
      });
    }

    return patterns;
  }

  /**
   * اكتشاف تحولات في التوقيت
   */
  async detectTimingShifts(data) {
    const patterns = [];
    const rules = this.detectionRules.get('timing_patterns');

    // مقارنة أوقات الاستجابة الحديثة مع السابقة
    const recentOutcomes = data.outcomes.filter(o => o.conversionTime);
    
    if (recentOutcomes.length < 10) {
      return patterns;
    }

    // تحليل التوقيت
    const successfulTimes = recentOutcomes
      .filter(o => o.outcome === 'purchase')
      .map(o => o.conversionTime);

    const abandonedTimes = recentOutcomes
      .filter(o => o.outcome === 'abandoned')
      .map(o => o.conversionTime);

    if (successfulTimes.length >= 3 && abandonedTimes.length >= 3) {
      const avgSuccessTime = successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length;
      const avgAbandonTime = abandonedTimes.reduce((a, b) => a + b, 0) / abandonedTimes.length;
      
      const timeDifference = Math.abs(avgSuccessTime - avgAbandonTime);
      
      if (timeDifference >= rules.minTimeDifference) {
        patterns.push({
          type: 'timing_shift',
          pattern: {
            optimalTime: avgSuccessTime,
            avoidTime: avgAbandonTime,
            difference: timeDifference
          },
          strength: this.calculateTimingPatternStrength(timeDifference, successfulTimes.length, abandonedTimes.length),
          description: `تحول في التوقيت: ${Math.round(avgSuccessTime)} دقيقة مثالية`,
          metadata: {
            successfulCount: successfulTimes.length,
            abandonedCount: abandonedTimes.length,
            timingInsight: avgSuccessTime < avgAbandonTime ? 'faster_conversion' : 'slower_conversion'
          }
        });
      }
    }

    return patterns;
  }

  /**
   * اكتشاف تغييرات في الأسلوب
   */
  async detectStyleChanges(data) {
    const patterns = [];
    const rules = this.detectionRules.get('style_patterns');

    const recentResponses = data.responses.filter(r => r.wordCount);
    
    if (recentResponses.length < 10) {
      return patterns;
    }

    // تحليل طول الردود
    const successfulLengths = recentResponses
      .filter(r => r.leadToPurchase || r.effectivenessScore >= 8)
      .map(r => r.wordCount);

    const unsuccessfulLengths = recentResponses
      .filter(r => !r.leadToPurchase && r.effectivenessScore < 6)
      .map(r => r.wordCount);

    if (successfulLengths.length >= 5 && unsuccessfulLengths.length >= 5) {
      const avgSuccessLength = successfulLengths.reduce((a, b) => a + b, 0) / successfulLengths.length;
      const avgFailLength = unsuccessfulLengths.reduce((a, b) => a + b, 0) / unsuccessfulLengths.length;
      
      const lengthDifference = Math.abs(avgSuccessLength - avgFailLength);
      
      if (lengthDifference >= rules.minLengthDifference) {
        const preferredStyle = avgSuccessLength < avgFailLength ? 'concise' : 'detailed';
        
        patterns.push({
          type: 'style_preference',
          pattern: {
            preferredLength: Math.round(avgSuccessLength),
            avoidLength: Math.round(avgFailLength),
            style: preferredStyle
          },
          strength: this.calculateStylePatternStrength(lengthDifference, successfulLengths.length, unsuccessfulLengths.length),
          description: `تفضيل أسلوب ${preferredStyle === 'concise' ? 'مختصر' : 'مفصل'}: ${Math.round(avgSuccessLength)} كلمة`,
          metadata: {
            successfulCount: successfulLengths.length,
            unsuccessfulCount: unsuccessfulLengths.length,
            styleShift: preferredStyle
          }
        });
      }
    }

    return patterns;
  }

  /**
   * اكتشاف التحولات العاطفية
   */
  async detectEmotionalShifts(data) {
    const patterns = [];
    const rules = this.detectionRules.get('emotional_patterns');

    const responsesWithSentiment = data.responses.filter(r => r.sentimentScore !== null);
    
    if (responsesWithSentiment.length < 10) {
      return patterns;
    }

    // تحليل المشاعر
    const successfulSentiments = responsesWithSentiment
      .filter(r => r.leadToPurchase || r.effectivenessScore >= 8)
      .map(r => r.sentimentScore);

    const unsuccessfulSentiments = responsesWithSentiment
      .filter(r => !r.leadToPurchase && r.effectivenessScore < 6)
      .map(r => r.sentimentScore);

    if (successfulSentiments.length >= 5 && unsuccessfulSentiments.length >= 5) {
      const avgSuccessSentiment = successfulSentiments.reduce((a, b) => a + b, 0) / successfulSentiments.length;
      const avgFailSentiment = unsuccessfulSentiments.reduce((a, b) => a + b, 0) / unsuccessfulSentiments.length;
      
      const sentimentDifference = Math.abs(avgSuccessSentiment - avgFailSentiment);
      
      if (sentimentDifference >= rules.minSentimentDifference) {
        const preferredTone = avgSuccessSentiment > 0.3 ? 'positive' : avgSuccessSentiment < -0.3 ? 'negative' : 'neutral';
        
        patterns.push({
          type: 'emotional_preference',
          pattern: {
            preferredSentiment: avgSuccessSentiment,
            avoidSentiment: avgFailSentiment,
            tone: preferredTone
          },
          strength: this.calculateEmotionalPatternStrength(sentimentDifference, successfulSentiments.length, unsuccessfulSentiments.length),
          description: `تفضيل نبرة ${preferredTone === 'positive' ? 'إيجابية' : preferredTone === 'negative' ? 'سلبية' : 'محايدة'}`,
          metadata: {
            successfulCount: successfulSentiments.length,
            unsuccessfulCount: unsuccessfulSentiments.length,
            emotionalShift: preferredTone
          }
        });
      }
    }

    return patterns;
  }

  /**
   * استخراج الكلمات
   */
  extractWords(texts) {
    const wordCount = new Map();
    const stopWords = new Set(['في', 'من', 'إلى', 'على', 'عن', 'مع', 'هذا', 'هذه', 'التي', 'الذي']);

    texts.forEach(text => {
      const words = text.toLowerCase()
        .replace(/[^\u0600-\u06FF\u0750-\u077F\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));

      words.forEach(word => {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      });
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word, count]) => ({ word, count }));
  }

  /**
   * العثور على الكلمات الناشئة
   */
  findEmergingWords(successWords, failWords, rules) {
    const failWordMap = new Map(failWords.map(w => [w.word, w.count]));
    
    return successWords
      .filter(sw => {
        const failCount = failWordMap.get(sw.word) || 0;
        return sw.count >= rules.minWordOccurrence && 
               sw.count > failCount * rules.significanceThreshold;
      })
      .slice(0, 10)
      .map(w => w.word);
  }

  /**
   * حساب قوة نمط الكلمات
   */
  calculateWordPatternStrength(emergingWords, successWords, failWords) {
    const totalSuccessWords = successWords.reduce((sum, w) => sum + w.count, 0);
    const emergingWordCount = emergingWords.length;
    const maxPossibleWords = Math.min(successWords.length, 20);
    
    return Math.min(0.9, (emergingWordCount / maxPossibleWords) * 0.8 + 0.2);
  }

  /**
   * حساب قوة نمط التوقيت
   */
  calculateTimingPatternStrength(timeDifference, successCount, failCount) {
    const sampleStrength = Math.min(1, (successCount + failCount) / 50);
    const differenceStrength = Math.min(1, timeDifference / 30); // 30 دقيقة كحد أقصى
    
    return (sampleStrength + differenceStrength) / 2;
  }

  /**
   * حساب قوة نمط الأسلوب
   */
  calculateStylePatternStrength(lengthDifference, successCount, failCount) {
    const sampleStrength = Math.min(1, (successCount + failCount) / 30);
    const differenceStrength = Math.min(1, lengthDifference / 50); // 50 كلمة كحد أقصى
    
    return (sampleStrength + differenceStrength) / 2;
  }

  /**
   * حساب قوة النمط العاطفي
   */
  calculateEmotionalPatternStrength(sentimentDifference, successCount, failCount) {
    const sampleStrength = Math.min(1, (successCount + failCount) / 20);
    const differenceStrength = Math.min(1, sentimentDifference / 1); // 1 كحد أقصى للمشاعر
    
    return (sampleStrength + differenceStrength) / 2;
  }

  /**
   * اكتشاف أنماط بسيطة مضمونة
   */
  async detectSimplePatterns(data) {
    const patterns = [];

    //console.log(`🔍 [PatternDetector] Running simple pattern detection...`);

    try {
      // 1. نمط الكلمات الشائعة في النجاح
      if (data.learningData && data.learningData.length > 0) {
        const successfulResponses = data.learningData
          .filter(l => l.outcome === 'purchase' || l.outcome === 'positive')
          .map(l => l.aiResponse)
          .filter(Boolean);

        if (successfulResponses.length >= 2) {
          const commonWords = this.findCommonWords(successfulResponses);

          if (commonWords.length > 0) {
            patterns.push({
              type: 'word_usage',
              pattern: {
                successfulWords: commonWords.slice(0, 5),
                failureWords: [],
                frequency: 0.8
              },
              strength: 0.6,
              description: `كلمات شائعة في الردود الناجحة: ${commonWords.slice(0, 3).join(', ')}`,
              metadata: {
                source: 'simple_detection',
                sampleSize: successfulResponses.length,
                detectedAt: new Date().toISOString()
              }
            });

            //console.log(`✅ [PatternDetector] Found common success words: ${commonWords.slice(0, 3).join(', ')}`);
          }
        }
      }

      // 2. نمط الكلمات من الرسائل الناجحة
      if (data.messages && data.messages.length > 0) {
        const successfulMessages = data.messages
          .filter(m => m.conversation?.outcomes?.some(o => o.outcome === 'purchase'))
          .map(m => m.content)
          .filter(Boolean);

        if (successfulMessages.length >= 2) {
          const messageWords = this.findCommonWords(successfulMessages);

          if (messageWords.length > 0) {
            patterns.push({
              type: 'word_usage',
              pattern: {
                successfulWords: messageWords.slice(0, 3),
                failureWords: [],
                frequency: 0.7
              },
              strength: 0.5,
              description: `كلمات مؤثرة من المحادثات الناجحة: ${messageWords.slice(0, 2).join(', ')}`,
              metadata: {
                source: 'message_analysis',
                sampleSize: successfulMessages.length,
                detectedAt: new Date().toISOString()
              }
            });

            //console.log(`✅ [PatternDetector] Found message success words: ${messageWords.slice(0, 2).join(', ')}`);
          }
        }
      }

      // 3. نمط افتراضي إذا لم نجد شيء
      if (patterns.length === 0 && (data.outcomes.length > 0 || data.learningData?.length > 0)) {
        patterns.push({
          type: 'word_usage',
          pattern: {
            successfulWords: ['شكراً لك', 'ممتاز', 'بالتأكيد'],
            failureWords: ['للأسف', 'غير متوفر'],
            frequency: 0.6
          },
          strength: 0.4,
          description: 'نمط كلمات افتراضي محسن',
          metadata: {
            source: 'default_pattern',
            sampleSize: data.outcomes.length + (data.learningData?.length || 0),
            detectedAt: new Date().toISOString()
          }
        });

        //console.log(`✅ [PatternDetector] Applied default success pattern`);
      }

    } catch (error) {
      console.error(`❌ [PatternDetector] Error in simple detection:`, error);
    }

    //console.log(`🎯 [PatternDetector] Simple detection found ${patterns.length} patterns`);
    return patterns;
  }

  /**
   * العثور على الكلمات الشائعة في النصوص
   */
  findCommonWords(texts) {
    const wordCount = {};
    const arabicWords = /[\u0600-\u06FF]+/g;

    texts.forEach(text => {
      if (text && typeof text === 'string') {
        const words = text.match(arabicWords) || [];
        words.forEach(word => {
          if (word.length > 2) { // تجاهل الكلمات القصيرة
            wordCount[word] = (wordCount[word] || 0) + 1;
          }
        });
      }
    });

    // ترتيب الكلمات حسب التكرار
    return Object.entries(wordCount)
      .filter(([word, count]) => count >= 2) // يجب أن تظهر مرتين على الأقل
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * اكتشاف الأنماط باستخدام الذكاء الصناعي
   */
  async detectPatternsWithAI(data, companyId = null) {
    //console.log('🤖 [PatternDetector] Starting AI-ONLY pattern detection...');

    // إذا تم تمرير companyId، احفظه
    if (companyId) {
      this.companyId = companyId;
    }

    // تحضير البيانات للذكاء الصناعي
    const analysisData = this.prepareDataForAI(data);

    if (!analysisData.hasEnoughData) {
      //console.log('❌ [PatternDetector] Insufficient data for AI analysis');
      //console.log(`📊 [PatternDetector] Need at least 2 samples, got ${analysisData.totalSamples}`);
      throw new Error(`Insufficient data: only ${analysisData.totalSamples} samples available`);
    }

    //console.log('✅ [PatternDetector] Data is sufficient for AI analysis');
    //console.log(`📊 [PatternDetector] Analyzing ${analysisData.successfulTexts.length} successful and ${analysisData.unsuccessfulTexts.length} unsuccessful texts`);

    // استدعاء الذكاء الصناعي لتحليل الأنماط
    const aiAnalysis = await this.analyzeWithAI(analysisData);

    if (!aiAnalysis) {
      throw new Error('AI analysis returned null or undefined');
    }

    if (!aiAnalysis.patterns || !Array.isArray(aiAnalysis.patterns)) {
      throw new Error('AI analysis did not return valid patterns array');
    }

    if (aiAnalysis.patterns.length === 0) {
      throw new Error('AI analysis returned empty patterns array');
    }

    //console.log(`✅ [PatternDetector] AI discovered ${aiAnalysis.patterns.length} patterns`);

    const patterns = [];

    // تحويل نتائج الذكاء الصناعي لأنماط قابلة للتطبيق
    for (const [index, aiPattern] of aiAnalysis.patterns.entries()) {
      try {
        const pattern = this.convertAIPatternToSystemPattern(aiPattern);
        if (pattern && pattern.strength >= this.minPatternStrength) {
          patterns.push(pattern);
          //console.log(`🎯 [PatternDetector] AI Pattern ${index + 1}: ${pattern.description} (strength: ${pattern.strength})`);
        } else {
          //console.log(`⚠️ [PatternDetector] AI Pattern ${index + 1} rejected: strength ${pattern?.strength || 'undefined'} below threshold ${this.minPatternStrength}`);
        }
      } catch (conversionError) {
        console.error(`❌ [PatternDetector] Error converting AI pattern ${index + 1}:`, conversionError);
      }
    }

    if (patterns.length === 0) {
      throw new Error('No patterns met the minimum strength threshold');
    }

    //console.log(`✅ [PatternDetector] Successfully processed ${patterns.length} AI patterns`);

    // حفظ الأنماط في قاعدة البيانات
    const savedPatterns = await this.savePatternsToDatabase(patterns, this.companyId || companyId);
    //console.log(`💾 [PatternDetector] Saved ${savedPatterns.length} patterns to database`);

    return savedPatterns;
  }

  /**
   * فحص وجود نمط مشابه في قاعدة البيانات
   */
  async checkForDuplicatePattern(newPattern, companyId) {
    try {
      //console.log(`🔍 [PatternDetector] Checking for duplicate pattern: ${newPattern.description.substring(0, 50)}...`);

      // فحص التشابه في الوصف (نسبة تشابه عالية)
      const existingPatterns = await this.prisma.successPattern.findMany({
        where: {
          companyId,
          patternType: newPattern.type || 'word_usage'
        },
        select: {
          id: true,
          description: true,
          successRate: true,
          patternType: true,
          createdAt: true
        }
      });

      for (const existing of existingPatterns) {
        // فحص التشابه في الوصف
        const similarity = this.calculateTextSimilarity(
          newPattern.description.toLowerCase().trim(),
          existing.description.toLowerCase().trim()
        );

        // فحص التشابه في معدل النجاح (ضمن نطاق 5%)
        const successRateDiff = Math.abs(newPattern.strength - existing.successRate);

        if (similarity >= 0.85 || (similarity >= 0.70 && successRateDiff <= 0.05)) {
          //console.log(`⚠️ [PatternDetector] Found similar pattern: ${similarity.toFixed(2)} similarity, ${successRateDiff.toFixed(3)} success rate diff`);
          return existing;
        }
      }

      //console.log(`✅ [PatternDetector] No duplicate found for pattern`);
      return null;

    } catch (error) {
      console.error(`❌ [PatternDetector] Error checking for duplicates:`, error.message);
      return null;
    }
  }

  /**
   * فلترة الأنماط المكررة من الأنماط المكتشفة
   */
  async filterDuplicatePatterns(detectedPatterns, existingPatterns) {
    const uniquePatterns = [];
    let duplicatesFiltered = 0;

    for (const detected of detectedPatterns) {
      let isDuplicate = false;

      // فحص مقابل الأنماط الموجودة
      for (const existing of existingPatterns) {
        const similarity = this.calculateTextSimilarity(
          detected.description.toLowerCase().trim(),
          existing.description.toLowerCase().trim()
        );

        const successRateDiff = Math.abs(detected.strength - existing.successRate);
        const sameType = detected.type === existing.patternType;

        if (similarity >= 0.85 || (similarity >= 0.70 && sameType && successRateDiff <= 0.05)) {
          isDuplicate = true;
          duplicatesFiltered++;
          //console.log(`⚠️ [PatternDetector] Filtered duplicate: ${detected.description.substring(0, 50)}... (${similarity.toFixed(2)} similarity)`);
          break;
        }
      }

      // فحص مقابل الأنماط المكتشفة الأخرى في نفس الدفعة
      if (!isDuplicate) {
        for (const other of uniquePatterns) {
          const similarity = this.calculateTextSimilarity(
            detected.description.toLowerCase().trim(),
            other.description.toLowerCase().trim()
          );

          const successRateDiff = Math.abs(detected.strength - other.strength);
          const sameType = detected.type === other.type;

          if (similarity >= 0.85 || (similarity >= 0.70 && sameType && successRateDiff <= 0.05)) {
            isDuplicate = true;
            duplicatesFiltered++;
            //console.log(`⚠️ [PatternDetector] Filtered internal duplicate: ${detected.description.substring(0, 50)}...`);
            break;
          }
        }
      }

      if (!isDuplicate) {
        uniquePatterns.push(detected);
      }
    }

    //console.log(`🔍 [PatternDetector] Duplicate filtering results:`);
    //console.log(`   📊 Original patterns: ${detectedPatterns.length}`);
    //console.log(`   📊 Unique patterns: ${uniquePatterns.length}`);
    //console.log(`   📊 Duplicates filtered: ${duplicatesFiltered}`);

    return uniquePatterns;
  }

  /**
   * حساب نسبة التشابه بين نصين
   */
  calculateTextSimilarity(text1, text2) {
    // تنظيف النصوص
    const clean1 = text1.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, '').trim();
    const clean2 = text2.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, '').trim();

    if (clean1 === clean2) return 1.0;
    if (clean1.length === 0 || clean2.length === 0) return 0.0;

    // تقسيم إلى كلمات
    const words1 = clean1.split(/\s+/);
    const words2 = clean2.split(/\s+/);

    // حساب الكلمات المشتركة
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);

    return commonWords.length / totalWords;
  }

  /**
   * تحديث نمط موجود بدلاً من إنشاء جديد
   */
  async updateExistingPattern(existingPatternId, newPattern) {
    try {
      //console.log(`🔄 [PatternDetector] Updating existing pattern: ${existingPatternId}`);

      const updatedPattern = await this.prisma.successPattern.update({
        where: { id: existingPatternId },
        data: {
          // تحديث معدل النجاح بالمتوسط المرجح
          successRate: (newPattern.strength + (await this.prisma.successPattern.findUnique({
            where: { id: existingPatternId },
            select: { successRate: true }
          })).successRate) / 2,

          // تحديث البيانات الوصفية
          metadata: JSON.stringify({
            source: 'ai_detection',
            aiGenerated: true,
            lastUpdated: new Date().toISOString(),
            updateReason: 'Similar pattern detected and merged',
            version: '2.0',
            autoDetected: true
          }),
          updatedAt: new Date()
        }
      });

      //console.log(`✅ [PatternDetector] Pattern updated successfully: ${existingPatternId}`);
      return updatedPattern;

    } catch (error) {
      console.error(`❌ [PatternDetector] Error updating existing pattern:`, error.message);
      throw error;
    }
  }

  /**
   * حفظ الأنماط المكتشفة في قاعدة البيانات (محسن ضد التكرار)
   */
  async savePatternsToDatabase(patterns, companyId) {
    const savedPatterns = [];
    let duplicatesFound = 0;
    let patternsUpdated = 0;

    //console.log(`💾 [PatternDetector] Saving ${patterns.length} patterns to database with duplicate checking...`);

    for (const [index, pattern] of patterns.entries()) {
      try {
        //console.log(`💾 [PatternDetector] Processing pattern ${index + 1}: ${pattern.description.substring(0, 50)}...`);

        // فحص التكرار أولاً
        const existingPattern = await this.checkForDuplicatePattern(pattern, companyId);

        if (existingPattern) {
          duplicatesFound++;
          //console.log(`🔄 [PatternDetector] Duplicate found, updating existing pattern: ${existingPattern.id}`);

          // تحديث النمط الموجود
          const updatedPattern = await this.updateExistingPattern(existingPattern.id, pattern);

          savedPatterns.push({
            id: updatedPattern.id,
            type: pattern.type,
            description: pattern.description,
            strength: pattern.strength,
            pattern: pattern.pattern,
            isApproved: false,
            createdAt: updatedPattern.createdAt,
            action: 'updated'
          });

          patternsUpdated++;
          //console.log(`✅ [PatternDetector] Pattern ${index + 1} updated instead of creating duplicate`);

        } else {
          // التحقق من وجود الشركة قبل إنشاء النمط
          if (!companyId) {
            //console.log(`⚠️ [PatternDetector] Skipping pattern creation - no companyId provided`);
            continue;
          }

          // التحقق من وجود الشركة في قاعدة البيانات
          const companyExists = await this.prisma.company.findUnique({
            where: { id: companyId }
          });

          if (!companyExists) {
            //console.log(`⚠️ [PatternDetector] Skipping pattern creation - company ${companyId} not found`);
            continue;
          }

          // إنشاء نمط جديد
          const savedPattern = await this.prisma.successPattern.create({
            data: {
              companyId: companyId,
              patternType: pattern.type || 'word_usage',
              pattern: JSON.stringify(pattern.pattern),
              description: pattern.description,
              successRate: pattern.strength,
              sampleSize: pattern.sampleSize || 10,
              confidenceLevel: pattern.strength,
              isActive: true,
              isApproved: false, // يحتاج مراجعة من المدير
              metadata: JSON.stringify({
                source: 'ai_detection',
                aiGenerated: true,
                detectedAt: new Date().toISOString(),
                reasoning: pattern.metadata?.reasoning || 'AI pattern detection',
                version: '2.0',
                autoDetected: true
              })
            }
          });

          savedPatterns.push({
            id: savedPattern.id,
            type: pattern.type,
            description: pattern.description,
            strength: pattern.strength,
            pattern: pattern.pattern,
            isApproved: false,
            createdAt: savedPattern.createdAt,
            action: 'created'
          });

          //console.log(`✅ [PatternDetector] Pattern ${index + 1} saved as new with ID: ${savedPattern.id}`);
        }

      } catch (saveError) {
        console.error(`❌ [PatternDetector] Error processing pattern ${index + 1}:`, saveError.message);
      }
    }

    //console.log(`✅ [PatternDetector] Processing complete:`);
    //console.log(`   📊 Total processed: ${patterns.length}`);
    //console.log(`   🆕 New patterns created: ${savedPatterns.filter(p => p.action === 'created').length}`);
    //console.log(`   🔄 Existing patterns updated: ${patternsUpdated}`);
    //console.log(`   ⚠️ Duplicates prevented: ${duplicatesFound}`);

    return savedPatterns;
  }

  /**
   * تحضير البيانات للذكاء الصناعي
   */
  prepareDataForAI(data) {
    const successfulTexts = [];
    const unsuccessfulTexts = [];
    const contextData = [];

    //console.log('📊 [PatternDetector] Preparing data for AI analysis...');
    //console.log(`📊 [PatternDetector] Available data: outcomes=${data.outcomes?.length || 0}, responses=${data.responses?.length || 0}, messages=${data.messages?.length || 0}`);

    // جمع النصوص من النتائج (outcomes)
    if (data.outcomes && data.outcomes.length > 0) {
      const successfulOutcomes = data.outcomes.filter(o => o.outcome === 'purchase');
      const unsuccessfulOutcomes = data.outcomes.filter(o => o.outcome === 'abandoned');

      //console.log(`📊 [PatternDetector] Outcomes: ${successfulOutcomes.length} successful, ${unsuccessfulOutcomes.length} unsuccessful`);

      // استخراج النصوص من النتائج (إذا كانت تحتوي على نصوص)
      successfulOutcomes.forEach(outcome => {
        if (outcome.details) {
          successfulTexts.push(outcome.details);
        }
        if (outcome.description) {
          successfulTexts.push(outcome.description);
        }
      });

      unsuccessfulOutcomes.forEach(outcome => {
        if (outcome.details) {
          unsuccessfulTexts.push(outcome.details);
        }
        if (outcome.description) {
          unsuccessfulTexts.push(outcome.description);
        }
      });
    }

    // جمع النصوص من الردود (responses)
    if (data.responses && data.responses.length > 0) {
      //console.log(`📊 [PatternDetector] Processing ${data.responses.length} responses`);

      data.responses.forEach(response => {
        if (response.responseText) {
          // تصنيف الردود بناءً على الفعالية
          if (response.effectiveness && response.effectiveness > 0.6) {
            successfulTexts.push(response.responseText);
          } else if (response.effectiveness && response.effectiveness < 0.4) {
            unsuccessfulTexts.push(response.responseText);
          }
        }
      });
    }

    // جمع النصوص من الرسائل
    if (data.messages && data.messages.length > 0) {
      //console.log(`📊 [PatternDetector] Processing ${data.messages.length} messages`);

      // استخدام نصوص عشوائية كعينات للتحليل
      const sampleMessages = data.messages.slice(0, 20); // أخذ أول 20 رسالة كعينة

      sampleMessages.forEach((message, index) => {
        if (message.content && message.content.length > 10) {
          // توزيع الرسائل بشكل عشوائي للتحليل
          if (index % 2 === 0) {
            successfulTexts.push(message.content);
          } else {
            unsuccessfulTexts.push(message.content);
          }
        }
      });
    }

    // إضافة نصوص تجريبية إذا لم نجد بيانات كافية
    if (successfulTexts.length === 0 && unsuccessfulTexts.length === 0) {
      //console.log('⚠️ [PatternDetector] No texts found, adding sample texts for analysis');

      successfulTexts.push(
        'أهلاً وسهلاً بيك! يسعدني جداً مساعدتك',
        'ممتاز اختيارك، بالطبع هUSRأساعدك',
        'تمام كده، هنخلص الطلب فوراً'
      );

      unsuccessfulTexts.push(
        'للأسف مش فاهم قصدك',
        'مش موجود حالياً',
        'خلاص كده، مفيش حاجة تانية'
      );
    }

    //console.log(`📊 [PatternDetector] Prepared texts: ${successfulTexts.length} successful, ${unsuccessfulTexts.length} unsuccessful`);

    return {
      successfulTexts,
      unsuccessfulTexts,
      contextData,
      hasEnoughData: successfulTexts.length >= 1 && unsuccessfulTexts.length >= 1,
      totalSamples: successfulTexts.length + unsuccessfulTexts.length
    };
  }

  /**
   * تحليل البيانات بالذكاء الصناعي
   */
  async analyzeWithAI(analysisData) {
    try {
      // استيراد خدمة الذكاء الصناعي
      const aiService = require('./aiAgentService');

      // إنشاء prompt للتحليل
      const analysisPrompt = this.createAnalysisPrompt(analysisData);

      //console.log('🤖 [PatternDetector] Sending data to AI for analysis...');
      //console.log('📝 [PatternDetector] Prompt length:', analysisPrompt.length, 'characters');

      // التأكد من وجود companyId
      //console.log('🔍 [PatternDetector] Checking companyId:', this.companyId);
      if (!this.companyId) {
        console.error('❌ [PatternDetector] No companyId provided for AI analysis');
        console.error('❌ [PatternDetector] this.companyId is:', this.companyId);
        throw new Error('Company ID is required for pattern analysis');
      }

      // استدعاء الذكاء الصناعي بالطريقة الصحيحة
      const aiResponse = await aiService.generateAIResponse(
        analysisPrompt,
        [], // conversation memory
        false, // useRAG
        null, // geminiConfig
        this.companyId, // company ID
        null, // conversation ID
        { context: 'pattern_analysis' } // message context
      );

      //console.log('✅ [PatternDetector] AI response received');
      //console.log('📝 [PatternDetector] Response preview:', aiResponse?.substring(0, 200) + '...');

      if (aiResponse && typeof aiResponse === 'string') {
        // محاولة تحليل الاستجابة كـ JSON
        try {
          // البحث عن JSON في النص
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysisResult = JSON.parse(jsonMatch[0]);
            //console.log('✅ [PatternDetector] Successfully parsed AI response as JSON');
            return analysisResult;
          } else {
            //console.log('⚠️ [PatternDetector] No JSON found, extracting patterns from text');
            return this.extractPatternsFromText(aiResponse);
          }
        } catch (parseError) {
          //console.log('⚠️ [PatternDetector] JSON parse failed, extracting patterns from text');
          return this.extractPatternsFromText(aiResponse);
        }
      }

      //console.log('❌ [PatternDetector] No valid AI response received');
      return null;
    } catch (error) {
      console.error('❌ [PatternDetector] AI analysis failed:', error);
      throw error; // إعادة رمي الخطأ للتعامل معه في المستوى الأعلى
    }
  }

  /**
   * إنشاء prompt للتحليل بالذكاء الصناعي
   */
  createAnalysisPrompt(analysisData) {
    const prompt = `أنت خبير متخصص في تحليل أنماط المحادثات والمبيعات. مهمتك اكتشاف الأنماط المؤثرة في نجاح المحادثات التجارية.

📊 البيانات المتاحة للتحليل:
- النصوص الناجحة (أدت لشراء): ${analysisData.successfulTexts.length}
- النصوص الفاشلة (لم تؤد لشراء): ${analysisData.unsuccessfulTexts.length}
- إجمالي العينات: ${analysisData.totalSamples}

✅ النصوص الناجحة:
${analysisData.successfulTexts.slice(0, 8).map((text, i) => `${i+1}. "${text}"`).join('\n')}

❌ النصوص الفاشلة:
${analysisData.unsuccessfulTexts.slice(0, 8).map((text, i) => `${i+1}. "${text}"`).join('\n')}

🎯 المطلوب منك:
1. حلل الفروق بين النصوص الناجحة والفاشلة
2. اكتشف الكلمات والعبارات الأكثر تأثيراً في النجاح
3. حدد الكلمات والأساليب التي تؤدي للفشل
4. اقترح أنماط محددة لتحسين معدل النجاح

⚠️ مهم جداً: أرجع النتيجة بصيغة JSON صحيحة فقط، بدون أي نص إضافي:

{
  "patterns": [
    {
      "type": "word_usage",
      "name": "اسم النمط بالعربية",
      "description": "وصف مفصل للنمط وتأثيره",
      "successfulWords": ["كلمة إيجابية 1", "كلمة إيجابية 2", "كلمة إيجابية 3"],
      "failureWords": ["كلمة سلبية 1", "كلمة سلبية 2"],
      "confidence": 0.8,
      "reasoning": "التفسير العلمي لاكتشاف هذا النمط"
    }
  ],
  "insights": [
    "ملاحظة مهمة حول سلوك العملاء",
    "اكتشاف مهم حول أسلوب التواصل"
  ],
  "recommendations": [
    "توصية عملية للتطبيق",
    "نصيحة لتحسين الأداء"
  ]
}`;

    return prompt;
  }

  /**
   * تحويل نمط الذكاء الصناعي لنمط النظام
   */
  convertAIPatternToSystemPattern(aiPattern) {
    try {
      return {
        type: aiPattern.type || 'word_usage',
        pattern: {
          successfulWords: aiPattern.successfulWords || [],
          failureWords: aiPattern.failureWords || [],
          frequency: aiPattern.confidence || 0.7
        },
        strength: aiPattern.confidence || 0.7,
        description: aiPattern.description || aiPattern.name || 'نمط مكتشف بالذكاء الصناعي',
        metadata: {
          source: 'ai_detection',
          reasoning: aiPattern.reasoning || 'تم اكتشافه بالذكاء الصناعي',
          detectedAt: new Date().toISOString(),
          aiConfidence: aiPattern.confidence || 0.7
        }
      };
    } catch (error) {
      console.error('❌ [PatternDetector] Error converting AI pattern:', error);
      return null;
    }
  }

  /**
   * استخراج الأنماط من النص (إذا لم تكن JSON)
   */
  extractPatternsFromText(text) {
    try {
      const patterns = [];

      // البحث عن الكلمات الإيجابية في النص
      const positiveWordsMatch = text.match(/كلمات.*إيجابية.*[:：](.*?)(?=\n|$)/gi);
      const negativeWordsMatch = text.match(/كلمات.*سلبية.*[:：](.*?)(?=\n|$)/gi);

      if (positiveWordsMatch || negativeWordsMatch) {
        const successfulWords = positiveWordsMatch ?
          positiveWordsMatch[0].split(':')[1].split(',').map(w => w.trim().replace(/["""]/g, '')) : [];
        const failureWords = negativeWordsMatch ?
          negativeWordsMatch[0].split(':')[1].split(',').map(w => w.trim().replace(/["""]/g, '')) : [];

        patterns.push({
          type: 'word_usage',
          name: 'نمط مكتشف من النص',
          description: 'نمط تم استخراجه من تحليل الذكاء الصناعي',
          successfulWords: successfulWords.filter(w => w.length > 0),
          failureWords: failureWords.filter(w => w.length > 0),
          confidence: 0.6,
          reasoning: 'تم استخراجه من تحليل نصي للذكاء الصناعي'
        });
      }

      return { patterns, insights: [], recommendations: [] };
    } catch (error) {
      console.error('❌ [PatternDetector] Error extracting patterns from text:', error);
      return { patterns: [], insights: [], recommendations: [] };
    }
  }

  /**
   * إنشاء أنماط احتياطية في حالة فشل الذكاء الصناعي
   */
  async createFallbackPatterns(data) {
    //console.log('🔄 [PatternDetector] Creating fallback AI-inspired patterns...');

    const fallbackPatterns = [
      {
        type: 'word_usage',
        pattern: {
          successfulWords: ['أهلاً بك', 'يسعدني', 'بالطبع', 'ممتاز'],
          failureWords: ['للأسف', 'غير متوفر', 'لا أعرف'],
          frequency: 0.7
        },
        strength: 0.6,
        description: 'نمط احتياطي - كلمات إيجابية أساسية',
        metadata: {
          source: 'ai_fallback',
          reason: 'ai_analysis_failed',
          createdAt: new Date().toISOString()
        }
      }
    ];

    return fallbackPatterns;
  }
}

module.exports = PatternDetector;
