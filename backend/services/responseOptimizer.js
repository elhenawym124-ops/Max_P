/**
 * محسن الردود - Response Optimizer
 * يطبق الأنماط المعتمدة على الردود المولدة من الـ AI لتحسين فعاليتها
 */

const ConflictDetectionService = require('./conflictDetectionService');

class ResponseOptimizer {
  constructor() {
    this.optimizationRules = new Map();
    this.performanceMetrics = new Map();
    this.conflictDetector = new ConflictDetectionService();

    //console.log('🚀 [ResponseOptimizer] Service initialized');
    this.initializeOptimizationRules();
  }

  /**
   * تهيئة قواعد التحسين
   */
  initializeOptimizationRules() {
    // قواعد تحسين الكلمات
    this.optimizationRules.set('word_enhancement', {
      positiveWords: ['ممتاز', 'رائع', 'بالطبع', 'يسعدني', 'أهلاً بيك', 'مرحباً'],
      negativeWords: ['للأسف', 'غير متوفر', 'لا أعرف', 'مش موجود', 'مستحيل'],
      replacements: {
        'للأسف': 'نعتذر، لكن',
        'غير متوفر': 'سنوفره قريباً',
        'لا أعرف': 'دعني أتحقق لك',
        'مش موجود': 'غير متاح حالياً',
        'مستحيل': 'صعب حالياً لكن سنحاول'
      }
    });

    // قواعد تحسين الأسلوب
    this.optimizationRules.set('style_enhancement', {
      minWords: 10,
      maxWords: 50,
      preferredStructure: 'greeting + info + question',
      emojiUsage: 'moderate' // none, light, moderate, heavy
    });

    // قواعد تحسين النبرة العاطفية
    this.optimizationRules.set('emotional_enhancement', {
      targetSentiment: 0.7, // إيجابي
      emotionalWords: ['سعيد', 'ممتاز', 'رائع', 'مفيد', 'مساعدة'],
      empathyPhrases: ['أفهم احتياجك', 'يسعدني مساعدتك', 'أقدر صبرك']
    });
  }

  /**
   * تحسين الرد بناءً على الأنماط المعتمدة مع احترام إعدادات الأولوية
   */
  async optimizeResponse(originalResponse, patterns, messageContext = {}, companyId = null, basePrompt = null) {
    try {
      //console.log('🚀 [ResponseOptimizer] Starting response optimization with priority settings');

      // الحصول على إعدادات الأولوية
      const prioritySettings = await this.getPrioritySettings(companyId);

      let optimizedResponse = originalResponse;

      // فحص التعارض مع البرونت الأساسي إذا كان متوفراً
      if (basePrompt && prioritySettings.autoDetectConflicts) {
        const responseConflicts = await this.detectResponseConflicts(originalResponse, basePrompt, patterns);

        if (responseConflicts.hasConflicts) {
          //console.log(`⚠️ [ResponseOptimizer] Detected response conflicts: ${responseConflicts.conflicts.length}`);
          optimizedResponse = await this.resolveResponseConflicts(optimizedResponse, basePrompt, patterns, responseConflicts, prioritySettings);
        }
      }

      // تطبيق التحسينات حسب الأولوية
      if (prioritySettings.promptPriority === 'high' && basePrompt) {
        // البرونت له الأولوية - تحسينات محدودة
        optimizedResponse = await this.applyLimitedOptimizations(optimizedResponse, patterns, basePrompt, prioritySettings);
      } else if (prioritySettings.patternsPriority === 'high') {
        // الأنماط لها الأولوية - تحسينات كاملة
        optimizedResponse = await this.applyFullOptimizations(optimizedResponse, patterns, messageContext);
      } else {
        // توازن - تحسينات متوازنة
        optimizedResponse = await this.applyBalancedOptimizations(optimizedResponse, patterns, messageContext, basePrompt, prioritySettings);
      }

      // تسجيل التحسينات المطبقة
      this.logOptimizations(originalResponse, optimizedResponse, patterns);

      //console.log('✅ [ResponseOptimizer] Response optimization completed with priority settings');
      return optimizedResponse;

    } catch (error) {
      console.error('❌ [ResponseOptimizer] Error optimizing response:', error);
      return originalResponse;
    }
  }

  /**
   * تطبيق تحسينات الكلمات
   */
  async applyWordOptimizations(response, patterns) {
    let optimizedResponse = response;
    const wordPatterns = patterns.filter(p => p.type === 'word_usage');
    
    for (const pattern of wordPatterns) {
      const patternData = pattern.pattern;
      
      // إضافة الكلمات الناجحة المفقودة
      if (patternData.successfulWords && Array.isArray(patternData.successfulWords)) {
        for (const successWord of patternData.successfulWords) {
          if (!optimizedResponse.toLowerCase().includes(successWord.toLowerCase()) && 
              pattern.successRate > 0.75) {
            optimizedResponse = this.insertSuccessfulWord(optimizedResponse, successWord);
            //console.log(`📝 [ResponseOptimizer] Added successful word: "${successWord}"`);
          }
        }
      }
      
      // استبدال الكلمات الفاشلة
      if (patternData.failureWords && Array.isArray(patternData.failureWords)) {
        for (const failWord of patternData.failureWords) {
          if (optimizedResponse.toLowerCase().includes(failWord.toLowerCase())) {
            optimizedResponse = this.replaceFailureWord(optimizedResponse, failWord);
            //console.log(`🔄 [ResponseOptimizer] Replaced failure word: "${failWord}"`);
          }
        }
      }
    }

    return optimizedResponse;
  }

  /**
   * تطبيق تحسينات الأسلوب
   */
  async applyStyleOptimizations(response, patterns, messageContext) {
    let optimizedResponse = response;
    const stylePatterns = patterns.filter(p => p.type === 'response_style');
    
    for (const pattern of stylePatterns) {
      const patternData = pattern.pattern;
      
      // تعديل طول الرد
      if (patternData.preferredLength) {
        const currentWordCount = optimizedResponse.split(' ').length;
        const targetLength = patternData.preferredLength;
        
        if (currentWordCount < targetLength * 0.8) {
          optimizedResponse = this.expandResponse(optimizedResponse, targetLength - currentWordCount);
          //console.log(`📏 [ResponseOptimizer] Expanded response to ${targetLength} words`);
        } else if (currentWordCount > targetLength * 1.2) {
          optimizedResponse = this.condenseResponse(optimizedResponse, targetLength);
          //console.log(`✂️ [ResponseOptimizer] Condensed response to ${targetLength} words`);
        }
      }
      
      // تطبيق هيكل الرد المفضل
      if (patternData.structure) {
        optimizedResponse = this.applyResponseStructure(optimizedResponse, patternData.structure);
      }
      
      // إضافة الإيموجي حسب النمط
      if (patternData.emojiUsage && !this.hasEmoji(optimizedResponse)) {
        optimizedResponse = this.addAppropriateEmoji(optimizedResponse, messageContext);
      }
    }

    return optimizedResponse;
  }

  /**
   * تطبيق تحسينات النبرة العاطفية
   */
  async applyEmotionalOptimizations(response, patterns) {
    let optimizedResponse = response;
    const emotionalPatterns = patterns.filter(p => p.type === 'emotional_tone');
    
    for (const pattern of emotionalPatterns) {
      const patternData = pattern.pattern;
      
      // تحسين النبرة الإيجابية
      if (patternData.preferredSentiment > 0.5) {
        optimizedResponse = this.enhancePositiveTone(optimizedResponse);
        //console.log('😊 [ResponseOptimizer] Enhanced positive tone');
      }
      
      // إضافة كلمات عاطفية مناسبة
      if (patternData.emotionalWords && Array.isArray(patternData.emotionalWords)) {
        const emotionalWord = this.selectBestEmotionalWord(patternData.emotionalWords, optimizedResponse);
        if (emotionalWord) {
          optimizedResponse = this.insertEmotionalWord(optimizedResponse, emotionalWord);
        }
      }
      
      // إضافة عبارات التعاطف
      if (patternData.empathy && !this.hasEmpathyPhrase(optimizedResponse)) {
        optimizedResponse = this.addEmpathyPhrase(optimizedResponse);
      }
    }

    return optimizedResponse;
  }

  /**
   * تطبيق تحسينات السياق والتوقيت
   */
  async applyContextualOptimizations(response, patterns, messageContext) {
    let optimizedResponse = response;
    
    // تحسينات بناءً على وقت اليوم
    if (messageContext.timeOfDay) {
      optimizedResponse = this.addTimeBasedGreeting(optimizedResponse, messageContext.timeOfDay);
    }
    
    // تحسينات بناءً على نوع الاستفسار
    if (messageContext.inquiryType) {
      optimizedResponse = this.addInquirySpecificElements(optimizedResponse, messageContext.inquiryType);
    }
    
    // تحسينات بناءً على تاريخ العميل
    if (messageContext.customerHistory) {
      optimizedResponse = this.personalizeBasedOnHistory(optimizedResponse, messageContext.customerHistory);
    }

    return optimizedResponse;
  }

  // ===== Helper Methods =====

  /**
   * إدراج كلمة ناجحة بشكل طبيعي
   */
  insertSuccessfulWord(response, word) {
    if (word === 'أهلاً بيك' || word === 'مرحباً') {
      if (!response.startsWith('أهل') && !response.startsWith('مرحب')) {
        return `${word}! ${response}`;
      }
    }
    
    if (word === 'يسعدني' || word === 'بالطبع') {
      return `${word}، ${response}`;
    }
    
    return response;
  }

  /**
   * استبدال كلمة فاشلة
   */
  replaceFailureWord(response, failWord) {
    const rules = this.optimizationRules.get('word_enhancement');
    const replacement = rules.replacements[failWord] || failWord;
    return response.replace(new RegExp(failWord, 'gi'), replacement);
  }

  /**
   * توسيع الرد
   */
  expandResponse(response, wordsToAdd) {
    const expansions = [
      'وسأكون سعيد لمساعدتك أكثر',
      'هل تحتاج معلومات إضافية؟',
      'يمكنني تقديم المزيد من التفاصيل',
      'لا تتردد في السؤال عن أي شيء آخر',
      'أتمنى أن تكون هذه المعلومات مفيدة'
    ];
    
    const expansion = expansions[Math.floor(Math.random() * expansions.length)];
    return `${response} ${expansion}`;
  }

  /**
   * اختصار الرد
   */
  condenseResponse(response, targetLength) {
    const words = response.split(' ');
    if (words.length <= targetLength) return response;
    
    // الاحتفاظ بالجملة الأولى والأخيرة
    const firstSentence = response.split('.')[0] + '.';
    const lastSentence = response.split('.').pop();
    
    if (firstSentence.split(' ').length + lastSentence.split(' ').length <= targetLength) {
      return `${firstSentence} ${lastSentence}`;
    }
    
    return words.slice(0, targetLength).join(' ') + '...';
  }

  /**
   * تطبيق هيكل الرد
   */
  applyResponseStructure(response, structure) {
    if (structure === 'greeting + info + question') {
      if (!response.includes('؟')) {
        response += ' هل يمكنني مساعدتك في شيء آخر؟';
      }
    }
    
    return response;
  }

  /**
   * فحص وجود إيموجي
   */
  hasEmoji(text) {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u;
    return emojiRegex.test(text);
  }

  /**
   * إضافة إيموجي مناسب
   */
  addAppropriateEmoji(response, messageContext) {
    const emojis = {
      greeting: '😊',
      product_inquiry: '🛍️',
      price_inquiry: '💰',
      support: '🔧',
      positive: '👍',
      default: '😊'
    };
    
    const emoji = emojis[messageContext.inquiryType] || emojis.default;
    return `${response} ${emoji}`;
  }

  /**
   * تحسين النبرة الإيجابية
   */
  enhancePositiveTone(response) {
    const positiveStarters = ['ممتاز!', 'رائع!', 'بالطبع!', 'يسعدني!'];
    
    if (!response.match(/^(ممتاز|رائع|بالطبع|يسعدني)/)) {
      const starter = positiveStarters[Math.floor(Math.random() * positiveStarters.length)];
      return `${starter} ${response}`;
    }
    
    return response;
  }

  /**
   * اختيار أفضل كلمة عاطفية
   */
  selectBestEmotionalWord(emotionalWords, response) {
    for (const word of emotionalWords) {
      if (!response.toLowerCase().includes(word.toLowerCase())) {
        return word;
      }
    }
    return null;
  }

  /**
   * إدراج كلمة عاطفية
   */
  insertEmotionalWord(response, emotionalWord) {
    return `${response} ${emotionalWord}`;
  }

  /**
   * فحص وجود عبارة تعاطف
   */
  hasEmpathyPhrase(response) {
    const empathyPhrases = ['أفهم', 'يسعدني', 'أقدر'];
    return empathyPhrases.some(phrase => response.includes(phrase));
  }

  /**
   * إضافة عبارة تعاطف
   */
  addEmpathyPhrase(response) {
    const empathyPhrases = ['أفهم احتياجك', 'يسعدني مساعدتك', 'أقدر صبرك'];
    const phrase = empathyPhrases[Math.floor(Math.random() * empathyPhrases.length)];
    return `${phrase}، ${response}`;
  }

  /**
   * إضافة تحية حسب الوقت
   */
  addTimeBasedGreeting(response, timeOfDay) {
    const timeGreetings = {
      morning: 'صباح الخير',
      afternoon: 'مساء الخير',
      evening: 'مساء الخير',
      night: 'مساء الخير'
    };
    
    const greeting = timeGreetings[timeOfDay];
    if (greeting && !response.includes(greeting)) {
      return `${greeting}! ${response}`;
    }
    
    return response;
  }

  /**
   * إضافة عناصر خاصة بنوع الاستفسار
   */
  addInquirySpecificElements(response, inquiryType) {
    const inquiryElements = {
      price_inquiry: 'وعندنا عروض خاصة أيضاً',
      product_inquiry: 'ويمكنني عرض منتجات مشابهة',
      support: 'وسأتابع معك حتى حل المشكلة'
    };
    
    const element = inquiryElements[inquiryType];
    if (element && !response.includes(element)) {
      return `${response} ${element}`;
    }
    
    return response;
  }

  /**
   * تخصيص بناءً على تاريخ العميل
   */
  personalizeBasedOnHistory(response, customerHistory) {
    if (customerHistory.isReturning) {
      return `أهلاً بعودتك! ${response}`;
    }
    
    if (customerHistory.previousPurchases > 0) {
      return `${response} وشكراً لثقتك المستمرة بنا`;
    }
    
    return response;
  }

  /**
   * تسجيل التحسينات المطبقة
   */
  logOptimizations(originalResponse, optimizedResponse, patterns) {
    const changes = {
      originalLength: originalResponse.split(' ').length,
      optimizedLength: optimizedResponse.split(' ').length,
      patternsApplied: patterns.length,
      timestamp: new Date().toISOString()
    };
    
    //console.log(`📊 [ResponseOptimizer] Applied ${patterns.length} patterns, length changed from ${changes.originalLength} to ${changes.optimizedLength} words`);
  }

  /**
   * تحليل فعالية التحسين
   */
  async analyzeOptimizationEffectiveness(optimizationId, conversationOutcome) {
    try {
      // تسجيل نتيجة التحسين لتحليل الأداء لاحقاً
      const effectiveness = {
        optimizationId,
        outcome: conversationOutcome.outcome,
        customerSatisfaction: conversationOutcome.customerSatisfaction,
        responseTime: conversationOutcome.responseTime,
        timestamp: new Date()
      };
      
      this.performanceMetrics.set(optimizationId, effectiveness);
      //console.log(`📈 [ResponseOptimizer] Recorded optimization effectiveness: ${conversationOutcome.outcome}`);
      
      return effectiveness;
      
    } catch (error) {
      console.error('❌ [ResponseOptimizer] Error analyzing optimization effectiveness:', error);
      return null;
    }
  }
  /**
   * الحصول على إعدادات الأولوية
   */
  async getPrioritySettings(companyId) {
    if (!companyId) {
      return {
        promptPriority: 'high',
        patternsPriority: 'medium',
        conflictResolution: 'merge_smart',
        enforcePersonality: true,
        enforceLanguageStyle: true,
        autoDetectConflicts: true,
        conflictReports: true
      };
    }

    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const aiSettings = await prisma.aiSettings.findFirst({
        where: { companyId }
      });

      if (aiSettings) {
        return {
          promptPriority: aiSettings.promptPriority || 'high',
          patternsPriority: aiSettings.patternsPriority || 'medium',
          conflictResolution: aiSettings.conflictResolution || 'merge_smart',
          enforcePersonality: aiSettings.enforcePersonality !== false,
          enforceLanguageStyle: aiSettings.enforceLanguageStyle !== false,
          autoDetectConflicts: aiSettings.autoDetectConflicts !== false,
          conflictReports: aiSettings.conflictReports !== false
        };
      }
    } catch (error) {
      console.error('❌ [ResponseOptimizer] Error getting priority settings:', error);
    }

    return {
      promptPriority: 'high',
      patternsPriority: 'medium',
      conflictResolution: 'merge_smart',
      enforcePersonality: true,
      enforceLanguageStyle: true,
      autoDetectConflicts: true,
      conflictReports: true
    };
  }

  /**
   * تطبيق فلتر العامية المصرية
   */
  applyColloquialFilter(response) {
    const formalToColloquial = {
      'بالطبع': 'اكيد',
      'يسعدني سؤالك': 'يسعدني',
      'ممتاز اختيارك': 'جامد اختيارك',
      'أهلاً وسهلاً بيك': 'اهلا بيكي',
      'بالتأكيد متوفر': 'اكيد موجود',
      'شكراً جزيلاً': 'شكراً',
      'مرحباً بكم': 'اهلا',
      'يسعدني مساعدتك': 'يسعدني اساعدك',
      'بكل سرور': 'بكل سرور'
    };

    let colloquialResponse = response;

    for (const [formal, colloquial] of Object.entries(formalToColloquial)) {
      colloquialResponse = colloquialResponse.replace(new RegExp(formal, 'g'), colloquial);
    }

    //console.log('🗣️ [ResponseOptimizer] Applied colloquial filter');
    return colloquialResponse;
  }

  /**
   * فحص إذا كان البرونت يطلب العامية
   */
  isColloquialPrompt(prompt) {
    const colloquialIndicators = [
      'عامية',
      'اسلوبك كويس',
      'كلام عادي',
      'بساطة',
      'مصري',
      'ازيك',
      'ازيكم'
    ];

    return colloquialIndicators.some(indicator =>
      prompt.toLowerCase().includes(indicator)
    );
  }

  /**
   * فحص توافق النمط مع البرونت
   */
  isPatternCompatibleWithPrompt(pattern, prompt) {
    // فحص بسيط للتوافق
    if (this.isColloquialPrompt(prompt) && pattern.pattern && pattern.pattern.successfulWords) {
      const formalWords = ['بالطبع', 'يسعدني سؤالك', 'أهلاً وسهلاً', 'مرحباً بكم'];
      const hasConflictingWords = pattern.pattern.successfulWords.some(word =>
        formalWords.includes(word)
      );
      return !hasConflictingWords;
    }

    return true; // افتراضي: متوافق
  }

  /**
   * فحص إذا كان الأسلوب سيتعارض مع البرونت
   */
  wouldStyleConflictWithPrompt(patterns, prompt) {
    // فحص بسيط للتعارض
    const promptRequiresShort = prompt.includes('مختصر') || prompt.includes('علي قد الحاجه');
    const patternsRequireLong = patterns.some(p =>
      p.pattern && p.pattern.preferredLength && p.pattern.preferredLength > 20
    );

    return promptRequiresShort && patternsRequireLong;
  }

  // Helper methods for new functionality
  async applyLimitedOptimizations(response, patterns, basePrompt, prioritySettings) {
    let optimizedResponse = response;

    const compatiblePatterns = patterns.filter(pattern => {
      return this.isPatternCompatibleWithPrompt(pattern, basePrompt);
    });

    if (compatiblePatterns.length > 0) {
      optimizedResponse = await this.applyWordOptimizations(optimizedResponse, compatiblePatterns);

      if (prioritySettings.enforceLanguageStyle && this.isColloquialPrompt(basePrompt)) {
        optimizedResponse = this.applyColloquialFilter(optimizedResponse);
      }
    }

    return optimizedResponse;
  }

  async applyFullOptimizations(response, patterns, messageContext) {
    let optimizedResponse = response;

    optimizedResponse = await this.applyWordOptimizations(optimizedResponse, patterns);
    optimizedResponse = await this.applyStyleOptimizations(optimizedResponse, patterns, messageContext);
    optimizedResponse = await this.applyEmotionalOptimizations(optimizedResponse, patterns);
    optimizedResponse = await this.applyContextualOptimizations(optimizedResponse, patterns, messageContext);

    return optimizedResponse;
  }

  async applyBalancedOptimizations(response, patterns, messageContext, basePrompt, prioritySettings) {
    let optimizedResponse = response;

    optimizedResponse = await this.applyWordOptimizations(optimizedResponse, patterns);

    if (!basePrompt || !this.wouldStyleConflictWithPrompt(patterns, basePrompt)) {
      optimizedResponse = await this.applyStyleOptimizations(optimizedResponse, patterns, messageContext);
    }

    if (prioritySettings.enforceLanguageStyle && basePrompt && this.isColloquialPrompt(basePrompt)) {
      optimizedResponse = this.applyColloquialFilter(optimizedResponse);
    }

    return optimizedResponse;
  }

  async detectResponseConflicts(response, basePrompt, patterns) {
    const mockPatterns = [{
      type: 'response_analysis',
      pattern: { successfulWords: this.extractWordsFromResponse(response) }
    }];

    return await this.conflictDetector.detectAllConflicts(basePrompt, mockPatterns);
  }

  async resolveResponseConflicts(response, basePrompt, patterns, conflicts, prioritySettings) {
    let resolvedResponse = response;

    switch (prioritySettings.conflictResolution) {
      case 'prompt_wins':
        resolvedResponse = this.adjustResponseToMatchPrompt(response, basePrompt, conflicts);
        break;
      case 'patterns_win':
        break;
      case 'merge_smart':
      default:
        resolvedResponse = this.smartMergeResponse(response, basePrompt, conflicts, prioritySettings);
        break;
    }

    return resolvedResponse;
  }

  extractWordsFromResponse(response) {
    return response.split(' ').filter(word => word.length > 2);
  }

  adjustResponseToMatchPrompt(response, basePrompt, conflicts) {
    let adjustedResponse = response;

    if (this.isColloquialPrompt(basePrompt)) {
      adjustedResponse = this.applyColloquialFilter(adjustedResponse);
    }

    return adjustedResponse;
  }

  smartMergeResponse(response, basePrompt, conflicts, prioritySettings) {
    let mergedResponse = response;

    if (prioritySettings.enforceLanguageStyle && this.isColloquialPrompt(basePrompt)) {
      mergedResponse = this.applyColloquialFilter(mergedResponse);
    }

    return mergedResponse;
  }
}

module.exports = ResponseOptimizer;
