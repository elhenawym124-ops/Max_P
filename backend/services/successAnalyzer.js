/**
 * Success Analyzer Service
 * 
 * خدمة تحليل النجاح - تحلل المحادثات الناجحة vs الفاشلة
 * وتكتشف الأنماط التي تؤدي للنجاح
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

class SuccessAnalyzer {
  constructor() {
    this.prisma = getSharedPrismaClient(); // Use shared database connection
    this.analysisCache = new Map();
    this.minSampleSize = 3; // الحد الأدنى للعينات (تم تقليله من 10)
    this.confidenceThreshold = 0.5; // حد الثقة المطلوب (تم تقليله من 0.75)
    
    //console.log('📊 [SuccessAnalyzer] Service initialized');
  }

  /**
   * تحليل المحادثات الناجحة مقابل الفاشلة
   */
  async analyzeSuccessPatterns(companyId, options = {}) {
    try {
      const {
        timeRange = 30, // آخر 30 يوم
        minSampleSize = this.minSampleSize,
        patternTypes = ['word_usage', 'timing', 'response_style', 'emotional_tone']
      } = options;

      //console.log(`🔍 [SuccessAnalyzer] Analyzing patterns for company: ${companyId}`);

      // جلب البيانات من قاعدة البيانات
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // جلب نتائج المحادثات
      const outcomes = await this.prisma.conversationOutcome.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate }
        },
        include: {
          customer: true
        }
      });

      // جلب فعالية الردود
      const responses = await this.prisma.responseEffectiveness.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate }
        }
      });

      //console.log(`📊 [SuccessAnalyzer] Found ${outcomes.length} outcomes and ${responses.length} responses`);

      if (outcomes.length < minSampleSize) {
        //console.log(`⚠️ [SuccessAnalyzer] Insufficient data: ${outcomes.length} < ${minSampleSize}`);
        return {
          success: false,
          message: 'بيانات غير كافية للتحليل',
          requiredSamples: minSampleSize,
          currentSamples: outcomes.length
        };
      }

      // تحليل الأنماط
      const patterns = [];

      for (const patternType of patternTypes) {
        const pattern = await this.analyzePatternType(patternType, outcomes, responses);
        if (pattern && pattern.confidenceLevel >= this.confidenceThreshold) {
          patterns.push(pattern);
        }
      }

      //console.log(`✅ [SuccessAnalyzer] Discovered ${patterns.length} significant patterns`);

      return {
        success: true,
        patterns,
        metadata: {
          totalOutcomes: outcomes.length,
          totalResponses: responses.length,
          timeRange,
          analysisDate: new Date()
        }
      };

    } catch (error) {
      console.error('❌ [SuccessAnalyzer] Error analyzing patterns:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * تحليل نوع معين من الأنماط
   */
  async analyzePatternType(patternType, outcomes, responses) {
    try {
      switch (patternType) {
        case 'word_usage':
          return await this.analyzeWordUsagePatterns(outcomes, responses);
        case 'timing':
          return await this.analyzeTimingPatterns(outcomes, responses);
        case 'response_style':
          return await this.analyzeResponseStylePatterns(outcomes, responses);
        case 'emotional_tone':
          return await this.analyzeEmotionalTonePatterns(outcomes, responses);
        default:
          //console.log(`⚠️ [SuccessAnalyzer] Unknown pattern type: ${patternType}`);
          return null;
      }
    } catch (error) {
      console.error(`❌ [SuccessAnalyzer] Error analyzing ${patternType}:`, error);
      return null;
    }
  }

  /**
   * تحليل أنماط استخدام الكلمات
   */
  async analyzeWordUsagePatterns(outcomes, responses) {
    const successfulResponses = responses.filter(r => r.leadToPurchase || r.effectivenessScore >= 8);
    const unsuccessfulResponses = responses.filter(r => !r.leadToPurchase && r.effectivenessScore < 6);

    if (successfulResponses.length < 5 || unsuccessfulResponses.length < 5) {
      return null;
    }

    // استخراج الكلمات من الردود الناجحة
    const successWords = this.extractKeywords(successfulResponses.map(r => r.responseText));
    const failWords = this.extractKeywords(unsuccessfulResponses.map(r => r.responseText));

    // العثور على الكلمات المميزة للنجاح
    const significantWords = this.findSignificantWords(successWords, failWords);

    if (significantWords.length === 0) {
      return null;
    }

    const successRate = successfulResponses.length / (successfulResponses.length + unsuccessfulResponses.length);
    const confidenceLevel = this.calculateConfidence(successfulResponses.length, unsuccessfulResponses.length);

    return {
      patternType: 'word_usage',
      pattern: JSON.stringify({
        significantWords,
        successWords: successWords.slice(0, 20), // أهم 20 كلمة
        avoidWords: failWords.slice(0, 10) // أهم 10 كلمات يجب تجنبها
      }),
      description: `الكلمات المؤثرة: ${significantWords.slice(0, 5).join(', ')}`,
      successRate,
      sampleSize: successfulResponses.length + unsuccessfulResponses.length,
      confidenceLevel,
      metadata: JSON.stringify({
        successfulCount: successfulResponses.length,
        unsuccessfulCount: unsuccessfulResponses.length,
        topWords: significantWords.slice(0, 10)
      })
    };
  }

  /**
   * تحليل أنماط التوقيت
   */
  async analyzeTimingPatterns(outcomes, responses) {
    const successfulOutcomes = outcomes.filter(o => o.outcome === 'purchase');
    const unsuccessfulOutcomes = outcomes.filter(o => o.outcome === 'abandoned');

    if (successfulOutcomes.length < 5 || unsuccessfulOutcomes.length < 5) {
      return null;
    }

    // تحليل أوقات الاستجابة
    const successfulTimes = successfulOutcomes
      .filter(o => o.conversionTime)
      .map(o => o.conversionTime);
    
    const unsuccessfulTimes = unsuccessfulOutcomes
      .filter(o => o.conversionTime)
      .map(o => o.conversionTime);

    if (successfulTimes.length < 3 || unsuccessfulTimes.length < 3) {
      return null;
    }

    const avgSuccessTime = successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length;
    const avgFailTime = unsuccessfulTimes.reduce((a, b) => a + b, 0) / unsuccessfulTimes.length;

    // إذا كان الفرق كبير، فهذا نمط مهم
    const timeDifference = Math.abs(avgSuccessTime - avgFailTime);
    if (timeDifference < 5) { // أقل من 5 دقائق فرق
      return null;
    }

    const successRate = successfulOutcomes.length / (successfulOutcomes.length + unsuccessfulOutcomes.length);
    const confidenceLevel = this.calculateConfidence(successfulOutcomes.length, unsuccessfulOutcomes.length);

    return {
      patternType: 'timing',
      pattern: JSON.stringify({
        optimalResponseTime: avgSuccessTime,
        avgSuccessTime,
        avgFailTime,
        timeDifference
      }),
      description: `الوقت الأمثل للتحويل: ${Math.round(avgSuccessTime)} دقيقة`,
      successRate,
      sampleSize: successfulOutcomes.length + unsuccessfulOutcomes.length,
      confidenceLevel,
      metadata: JSON.stringify({
        successfulCount: successfulOutcomes.length,
        unsuccessfulCount: unsuccessfulOutcomes.length,
        timingInsight: avgSuccessTime < avgFailTime ? 'faster_is_better' : 'slower_is_better'
      })
    };
  }

  /**
   * تحليل أنماط أسلوب الرد
   */
  async analyzeResponseStylePatterns(outcomes, responses) {
    const successfulResponses = responses.filter(r => r.leadToPurchase || r.effectivenessScore >= 8);
    const unsuccessfulResponses = responses.filter(r => !r.leadToPurchase && r.effectivenessScore < 6);

    if (successfulResponses.length < 5 || unsuccessfulResponses.length < 5) {
      return null;
    }

    // تحليل طول الردود
    const successWordCounts = successfulResponses.filter(r => r.wordCount).map(r => r.wordCount);
    const failWordCounts = unsuccessfulResponses.filter(r => r.wordCount).map(r => r.wordCount);

    if (successWordCounts.length < 3 || failWordCounts.length < 3) {
      return null;
    }

    const avgSuccessWords = successWordCounts.reduce((a, b) => a + b, 0) / successWordCounts.length;
    const avgFailWords = failWordCounts.reduce((a, b) => a + b, 0) / failWordCounts.length;

    const wordDifference = Math.abs(avgSuccessWords - avgFailWords);
    if (wordDifference < 5) { // أقل من 5 كلمات فرق
      return null;
    }

    const successRate = successfulResponses.length / (successfulResponses.length + unsuccessfulResponses.length);
    const confidenceLevel = this.calculateConfidence(successfulResponses.length, unsuccessfulResponses.length);

    return {
      patternType: 'response_style',
      pattern: JSON.stringify({
        optimalWordCount: Math.round(avgSuccessWords),
        avgSuccessWords,
        avgFailWords,
        stylePreference: avgSuccessWords < avgFailWords ? 'concise' : 'detailed'
      }),
      description: `الطول الأمثل للرد: ${Math.round(avgSuccessWords)} كلمة`,
      successRate,
      sampleSize: successfulResponses.length + unsuccessfulResponses.length,
      confidenceLevel,
      metadata: JSON.stringify({
        successfulCount: successfulResponses.length,
        unsuccessfulCount: unsuccessfulResponses.length,
        styleInsight: avgSuccessWords < avgFailWords ? 'shorter_is_better' : 'longer_is_better'
      })
    };
  }

  /**
   * تحليل أنماط النبرة العاطفية
   */
  async analyzeEmotionalTonePatterns(outcomes, responses) {
    const successfulResponses = responses.filter(r => r.leadToPurchase && r.sentimentScore !== null);
    const unsuccessfulResponses = responses.filter(r => !r.leadToPurchase && r.sentimentScore !== null);

    if (successfulResponses.length < 5 || unsuccessfulResponses.length < 5) {
      return null;
    }

    const avgSuccessSentiment = successfulResponses.reduce((a, r) => a + r.sentimentScore, 0) / successfulResponses.length;
    const avgFailSentiment = unsuccessfulResponses.reduce((a, r) => a + r.sentimentScore, 0) / unsuccessfulResponses.length;

    const sentimentDifference = Math.abs(avgSuccessSentiment - avgFailSentiment);
    if (sentimentDifference < 0.2) { // أقل من 0.2 فرق
      return null;
    }

    const successRate = successfulResponses.length / (successfulResponses.length + unsuccessfulResponses.length);
    const confidenceLevel = this.calculateConfidence(successfulResponses.length, unsuccessfulResponses.length);

    return {
      patternType: 'emotional_tone',
      pattern: JSON.stringify({
        optimalSentiment: avgSuccessSentiment,
        avgSuccessSentiment,
        avgFailSentiment,
        tonePreference: avgSuccessSentiment > 0.5 ? 'positive' : avgSuccessSentiment < -0.5 ? 'negative' : 'neutral'
      }),
      description: `النبرة الأمثل: ${avgSuccessSentiment > 0.5 ? 'إيجابية' : avgSuccessSentiment < -0.5 ? 'سلبية' : 'محايدة'}`,
      successRate,
      sampleSize: successfulResponses.length + unsuccessfulResponses.length,
      confidenceLevel,
      metadata: JSON.stringify({
        successfulCount: successfulResponses.length,
        unsuccessfulCount: unsuccessfulResponses.length,
        sentimentInsight: avgSuccessSentiment > avgFailSentiment ? 'more_positive_is_better' : 'less_positive_is_better'
      })
    };
  }

  /**
   * استخراج الكلمات المفتاحية
   */
  extractKeywords(texts) {
    const wordCount = new Map();
    const stopWords = new Set(['في', 'من', 'إلى', 'على', 'عن', 'مع', 'هذا', 'هذه', 'التي', 'الذي', 'أن', 'إن', 'كان', 'كانت']);

    texts.forEach(text => {
      const words = text.toLowerCase()
        .replace(/[^\u0600-\u06FF\u0750-\u077F\s]/g, '') // إبقاء العربية فقط
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));

      words.forEach(word => {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      });
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word, count]) => ({ word, count, frequency: count / texts.length }));
  }

  /**
   * العثور على الكلمات المميزة للنجاح
   */
  findSignificantWords(successWords, failWords) {
    const failWordMap = new Map(failWords.map(w => [w.word, w.frequency]));
    
    return successWords
      .filter(sw => {
        const failFreq = failWordMap.get(sw.word) || 0;
        return sw.frequency > failFreq * 1.5 && sw.count >= 3; // يجب أن تظهر 1.5 مرة أكثر في النجاح
      })
      .slice(0, 15)
      .map(w => w.word);
  }

  /**
   * حساب مستوى الثقة
   */
  calculateConfidence(successCount, failCount) {
    const total = successCount + failCount;
    if (total < 10) return 0.5;
    if (total < 20) return 0.6;
    if (total < 50) return 0.7;
    if (total < 100) return 0.8;
    return 0.9;
  }

  /**
   * حفظ نمط مكتشف
   */
  async saveSuccessPattern(companyId, pattern) {
    try {
      const savedPattern = await this.prisma.successPattern.create({
        data: {
          companyId,
          patternType: pattern.patternType,
          pattern: pattern.pattern,
          description: pattern.description,
          successRate: pattern.successRate,
          sampleSize: pattern.sampleSize,
          confidenceLevel: pattern.confidenceLevel,
          metadata: pattern.metadata
        }
      });

      //console.log(`✅ [SuccessAnalyzer] Pattern saved: ${savedPattern.id}`);
      return savedPattern;

    } catch (error) {
      console.error('❌ [SuccessAnalyzer] Error saving pattern:', error);
      throw error;
    }
  }

  /**
   * تنظيف الذاكرة المؤقتة
   */
  clearCache() {
    this.analysisCache.clear();
    //console.log('🧹 [SuccessAnalyzer] Cache cleared');
  }
}

module.exports = SuccessAnalyzer;
