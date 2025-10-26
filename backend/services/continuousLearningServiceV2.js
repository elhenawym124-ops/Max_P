/**
 * خدمة التعلم المستمر المحسنة - الإصدار الثاني
 * Enhanced Continuous Learning Service V2
 */

const { PrismaClient } = require('@prisma/client');

class ContinuousLearningServiceV2 {
  constructor() {
    this.prisma = new PrismaClient();
    this.isInitialized = false;
    this.learningQueue = [];
    this.processingInterval = null;
    
    //console.log('🧠 [ContinuousLearning] Service V2 initializing...');
    this.initialize();
  }

  async initialize() {
    try {
      // بدء معالجة دورية للبيانات
      this.startPeriodicProcessing();
      this.isInitialized = true;
      //console.log('✅ [ContinuousLearning] Service V2 initialized successfully');
    } catch (error) {
      console.error('❌ [ContinuousLearning] Initialization failed:', error);
    }
  }

  /**
   * جمع بيانات التعلم من المحادثات
   */
  async collectLearningData(data) {
    try {
      //console.log(`📊 [ContinuousLearning] Collecting learning data for conversation: ${data.conversationId}`);

      // التحقق من صحة البيانات
      if (!data.conversationId || !data.companyId) {
        throw new Error('Missing required fields: conversationId or companyId');
      }

      // حفظ بيانات التعلم
      const learningData = await this.prisma.learningData.create({
        data: {
          companyId: data.companyId,
          customerId: data.customerId || null,
          conversationId: data.conversationId,
          userMessage: data.userMessage || '',
          aiResponse: data.aiResponse || '',
          intent: data.intent || 'unknown',
          sentiment: data.sentiment || 'neutral',
          processingTime: data.processingTime || 0,
          ragDataUsed: data.ragDataUsed || false,
          memoryUsed: data.memoryUsed || false,
          model: data.model || 'unknown',
          confidence: data.confidence || 0,
          type: 'conversation',
          metadata: JSON.stringify({
            timestamp: new Date(),
            source: 'aiAgentService',
            version: '2.0'
          })
        }
      });

      //console.log(`✅ [ContinuousLearning] Learning data collected: ${learningData.id}`);
      
      // إضافة للقائمة للمعالجة اللاحقة
      this.learningQueue.push(learningData.id);

      return {
        success: true,
        data: learningData
      };

    } catch (error) {
      console.error('❌ [ContinuousLearning] Error collecting learning data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * تحليل البيانات واكتشاف أنماط جديدة
   */
  async analyzeAndDiscoverPatterns(companyId) {
    try {
      //console.log(`🔍 [ContinuousLearning] Analyzing patterns for company: ${companyId}`);

      // جلب البيانات الحديثة للتحليل
      const recentData = await this.prisma.learningData.findMany({
        where: {
          companyId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // آخر 7 أيام
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      if (recentData.length < 10) {
        //console.log('⚠️ [ContinuousLearning] Insufficient data for pattern analysis');
        return { success: true, patterns: [] };
      }

      // تحليل أنماط الكلمات الناجحة
      const wordPatterns = await this.analyzeWordPatterns(recentData);
      
      // تحليل أنماط الأسلوب
      const stylePatterns = await this.analyzeStylePatterns(recentData);
      
      // تحليل أنماط التوقيت
      const timingPatterns = await this.analyzeTimingPatterns(recentData);

      const discoveredPatterns = [...wordPatterns, ...stylePatterns, ...timingPatterns];

      // حفظ الأنماط المكتشفة
      for (const pattern of discoveredPatterns) {
        await this.saveDiscoveredPattern(pattern, companyId);
      }

      //console.log(`✅ [ContinuousLearning] Discovered ${discoveredPatterns.length} new patterns`);

      return {
        success: true,
        patterns: discoveredPatterns
      };

    } catch (error) {
      console.error('❌ [ContinuousLearning] Error analyzing patterns:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * تحليل أنماط الكلمات
   */
  async analyzeWordPatterns(data) {
    const patterns = [];
    
    try {
      // تجميع الردود حسب النجاح (confidence > 0.8)
      const successfulResponses = data.filter(d => d.confidence > 0.8);
      const unsuccessfulResponses = data.filter(d => d.confidence <= 0.5);

      if (successfulResponses.length < 5) return patterns;

      // تحليل الكلمات المتكررة في الردود الناجحة
      const successfulWords = this.extractWords(successfulResponses.map(r => r.aiResponse));
      const unsuccessfulWords = this.extractWords(unsuccessfulResponses.map(r => r.aiResponse));

      // العثور على الكلمات التي تظهر أكثر في الردود الناجحة
      const significantWords = this.findSignificantWords(successfulWords, unsuccessfulWords);

      if (significantWords.length > 0) {
        patterns.push({
          type: 'word_usage',
          pattern: {
            successfulWords: significantWords.slice(0, 10),
            frequency: significantWords.length / successfulResponses.length
          },
          description: `استخدام كلمات محددة يزيد معدل النجاح`,
          confidence: Math.min(0.95, 0.6 + (significantWords.length * 0.05)),
          sampleSize: successfulResponses.length
        });
      }

    } catch (error) {
      console.error('❌ [ContinuousLearning] Error analyzing word patterns:', error);
    }

    return patterns;
  }

  /**
   * تحليل أنماط الأسلوب
   */
  async analyzeStylePatterns(data) {
    const patterns = [];
    
    try {
      const successfulResponses = data.filter(d => d.confidence > 0.8);
      
      if (successfulResponses.length < 5) return patterns;

      // تحليل طول الردود
      const avgLength = successfulResponses.reduce((sum, r) => sum + r.aiResponse.length, 0) / successfulResponses.length;
      
      // تحليل استخدام علامات الترقيم
      const punctuationUsage = this.analyzePunctuation(successfulResponses.map(r => r.aiResponse));
      
      // تحليل بنية الردود
      const responseStructure = this.analyzeResponseStructure(successfulResponses.map(r => r.aiResponse));

      patterns.push({
        type: 'response_style',
        pattern: {
          optimalLength: Math.round(avgLength),
          punctuationStyle: punctuationUsage,
          structure: responseStructure
        },
        description: `أسلوب الرد المثالي بطول ${Math.round(avgLength)} حرف`,
        confidence: 0.75,
        sampleSize: successfulResponses.length
      });

    } catch (error) {
      console.error('❌ [ContinuousLearning] Error analyzing style patterns:', error);
    }

    return patterns;
  }

  /**
   * تحليل أنماط التوقيت
   */
  async analyzeTimingPatterns(data) {
    const patterns = [];
    
    try {
      const successfulResponses = data.filter(d => d.confidence > 0.8);
      
      if (successfulResponses.length < 5) return patterns;

      // تحليل أوقات الاستجابة
      const avgResponseTime = successfulResponses.reduce((sum, r) => sum + r.processingTime, 0) / successfulResponses.length;
      
      // تحليل أوقات اليوم
      const timeDistribution = this.analyzeTimeDistribution(successfulResponses);

      patterns.push({
        type: 'timing',
        pattern: {
          optimalResponseTime: Math.round(avgResponseTime),
          timeDistribution: timeDistribution
        },
        description: `وقت الاستجابة المثالي ${Math.round(avgResponseTime)}ms`,
        confidence: 0.7,
        sampleSize: successfulResponses.length
      });

    } catch (error) {
      console.error('❌ [ContinuousLearning] Error analyzing timing patterns:', error);
    }

    return patterns;
  }

  /**
   * حفظ النمط المكتشف
   */
  async saveDiscoveredPattern(pattern, companyId) {
    try {
      // التحقق من عدم وجود نمط مشابه
      const existingPattern = await this.prisma.successPattern.findFirst({
        where: {
          companyId,
          patternType: pattern.type,
          isActive: true
        }
      });

      if (existingPattern) {
        //console.log(`⚠️ [ContinuousLearning] Similar pattern already exists: ${pattern.type}`);
        return null;
      }

      // حفظ النمط الجديد
      const savedPattern = await this.prisma.successPattern.create({
        data: {
          companyId,
          patternType: pattern.type,
          pattern: JSON.stringify(pattern.pattern),
          description: pattern.description,
          successRate: pattern.confidence,
          sampleSize: pattern.sampleSize,
          confidenceLevel: pattern.confidence,
          isActive: false, // يحتاج موافقة
          isApproved: false,
          discoveredAt: new Date(),
          source: 'continuous_learning_v2'
        }
      });

      //console.log(`✅ [ContinuousLearning] Pattern saved: ${savedPattern.id}`);
      return savedPattern;

    } catch (error) {
      console.error('❌ [ContinuousLearning] Error saving pattern:', error);
      return null;
    }
  }

  /**
   * بدء المعالجة الدورية
   */
  startPeriodicProcessing() {
    // معالجة كل 30 دقيقة
    this.processingInterval = setInterval(async () => {
      if (this.learningQueue.length > 0) {
        //console.log(`🔄 [ContinuousLearning] Processing ${this.learningQueue.length} queued items`);
        
        // الحصول على الشركات النشطة
        const activeCompanies = await this.getActiveCompanies();
        
        for (const company of activeCompanies) {
          await this.analyzeAndDiscoverPatterns(company.id);
        }
        
        // تنظيف القائمة
        this.learningQueue = [];
      }
    }, 30 * 60 * 1000); // 30 دقيقة

    //console.log('🔄 [ContinuousLearning] Periodic processing started');
  }

  /**
   * الحصول على الشركات النشطة
   */
  async getActiveCompanies() {
    try {
      return await this.prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
      });
    } catch (error) {
      console.error('❌ [ContinuousLearning] Error getting active companies:', error);
      return [];
    }
  }

  // دوال مساعدة
  extractWords(texts) {
    const words = [];
    texts.forEach(text => {
      if (text) {
        const textWords = text.split(/\s+/).filter(word => word.length > 2);
        words.push(...textWords);
      }
    });
    return words;
  }

  findSignificantWords(successfulWords, unsuccessfulWords) {
    const successfulFreq = {};
    const unsuccessfulFreq = {};
    
    successfulWords.forEach(word => {
      successfulFreq[word] = (successfulFreq[word] || 0) + 1;
    });
    
    unsuccessfulWords.forEach(word => {
      unsuccessfulFreq[word] = (unsuccessfulFreq[word] || 0) + 1;
    });
    
    const significant = [];
    Object.keys(successfulFreq).forEach(word => {
      const successRate = successfulFreq[word] / successfulWords.length;
      const failureRate = (unsuccessfulFreq[word] || 0) / Math.max(unsuccessfulWords.length, 1);
      
      if (successRate > failureRate * 2 && successfulFreq[word] >= 3) {
        significant.push(word);
      }
    });
    
    return significant;
  }

  analyzePunctuation(texts) {
    const punctuation = { exclamation: 0, question: 0, emoji: 0 };
    texts.forEach(text => {
      if (text.includes('!')) punctuation.exclamation++;
      if (text.includes('?')) punctuation.question++;
      if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(text)) {
        punctuation.emoji++;
      }
    });
    return punctuation;
  }

  analyzeResponseStructure(texts) {
    const structures = { greeting: 0, info: 0, question: 0 };
    texts.forEach(text => {
      if (/مرحب|أهلا|السلام/.test(text)) structures.greeting++;
      if (text.length > 50) structures.info++;
      if (text.includes('؟')) structures.question++;
    });
    return structures;
  }

  analyzeTimeDistribution(data) {
    const distribution = {};
    data.forEach(item => {
      const hour = new Date(item.createdAt).getHours();
      const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      distribution[period] = (distribution[period] || 0) + 1;
    });
    return distribution;
  }

  /**
   * تنظيف الموارد
   */
  async cleanup() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    await this.prisma.$disconnect();
    //console.log('🧹 [ContinuousLearning] Service cleaned up');
  }
}

module.exports = ContinuousLearningServiceV2;
