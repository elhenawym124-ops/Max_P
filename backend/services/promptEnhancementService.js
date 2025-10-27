/**
 * خدمة تحسين الـ Prompts بناءً على الأنماط المكتشفة
 * Prompt Enhancement Service - يحسن prompts الـ AI بناءً على الأنماط الناجحة
 */

const ConflictDetectionService = require('./conflictDetectionService');

class PromptEnhancementService {
  constructor() {
    this.basePrompts = new Map();
    this.enhancedPrompts = new Map();
    this.conflictDetector = new ConflictDetectionService();

    //console.log('🎨 [PromptEnhancement] Service initialized');
    this.initializeBasePrompts();
  }

  /**
   * تهيئة الـ prompts الأساسية
   */
  initializeBasePrompts() {
    this.basePrompts.set('greeting', {
      arabic: 'أنت مساعد ذكي ومهذب. رد على العميل بطريقة ودودة ومهنية.',
      english: 'You are a smart and polite assistant. Respond to the customer in a friendly and professional manner.'
    });

    this.basePrompts.set('product_inquiry', {
      arabic: 'أنت خبير في المنتجات. قدم معلومات دقيقة ومفيدة عن المنتجات.',
      english: 'You are a product expert. Provide accurate and helpful information about products.'
    });

    this.basePrompts.set('price_inquiry', {
      arabic: 'أنت مستشار مبيعات محترف. اعرض الأسعار بطريقة جذابة ومقنعة.',
      english: 'You are a professional sales consultant. Present prices in an attractive and convincing way.'
    });

    this.basePrompts.set('support', {
      arabic: 'أنت مختص في الدعم الفني. ساعد العميل في حل مشكلته بصبر وكفاءة.',
      english: 'You are a technical support specialist. Help the customer solve their problem with patience and efficiency.'
    });
  }

  /**
   * تحسين الـ prompt بناءً على الأنماط المعتمدة مع احترام إعدادات الأولوية
   */
  async enhancePromptWithPatterns(basePrompt, patterns, messageType = 'general', companyId = null) {
    try {
      //console.log(`🎨 [PromptEnhancement] Enhancing prompt for type: ${messageType}`);

      // الحصول على إعدادات الأولوية
      const prioritySettings = await this.getPrioritySettings(companyId);

      // كشف التعارض أولاً
      const conflicts = await this.conflictDetector.detectAllConflicts(basePrompt, patterns, companyId);

      if (conflicts.hasConflicts) {
        //console.log(`⚠️ [PromptEnhancement] Detected ${conflicts.conflicts.length} conflicts with severity: ${conflicts.severity}`);

        // حل التعارض حسب الإعدادات
        const resolvedData = await this.resolveConflicts(basePrompt, patterns, conflicts, prioritySettings);
        return await this.applyEnhancementsWithPriority(resolvedData.prompt, resolvedData.patterns, prioritySettings, messageType);
      }

      // إذا لم يكن هناك تعارض، طبق التحسينات العادية
      return await this.applyEnhancementsWithPriority(basePrompt, patterns, prioritySettings, messageType);

    } catch (error) {
      console.error('❌ [PromptEnhancement] Error enhancing prompt:', error);
      return basePrompt;
    }
  }

  /**
   * تطبيق التحسينات مع احترام الأولوية
   */
  async applyEnhancementsWithPriority(basePrompt, patterns, prioritySettings, messageType) {
    let enhancedPrompt = basePrompt;

    // إضافة تأكيد على البرونت الأساسي إذا كانت أولويته عالية
    if (prioritySettings.promptPriority === 'high') {
      enhancedPrompt += `\n\n🚨 مهم جداً: التزم بالشخصية والأسلوب المحدد أعلاه بدقة تامة!`;

      if (prioritySettings.enforcePersonality) {
        enhancedPrompt += `\n- احتفظ بنفس الشخصية المحددة في البرونت`;
      }

      if (prioritySettings.enforceLanguageStyle) {
        enhancedPrompt += `\n- احتفظ بنفس أسلوب اللغة المحدد في البرونت`;
      }
    }

    // تطبيق تحسينات الأنماط حسب الأولوية
    if (prioritySettings.patternsPriority === 'high') {
      // تطبيق جميع الأنماط بقوة
      enhancedPrompt = this.applyWordPatternEnhancements(enhancedPrompt, patterns);
      enhancedPrompt = this.applyStylePatternEnhancements(enhancedPrompt, patterns);
      enhancedPrompt = this.applyEmotionalPatternEnhancements(enhancedPrompt, patterns);
      enhancedPrompt = this.applyTimingPatternEnhancements(enhancedPrompt, patterns);
    } else if (prioritySettings.patternsPriority === 'medium') {
      // تطبيق الأنماط مع احترام البرونت
      enhancedPrompt = this.applyCompatiblePatterns(enhancedPrompt, patterns, basePrompt);
    } else {
      // تطبيق الأنماط فقط إذا لم تتعارض مع البرونت
      enhancedPrompt = this.applyNonConflictingPatterns(enhancedPrompt, patterns, basePrompt);
    }

    // إضافة إرشادات خاصة بنوع الرسالة
    enhancedPrompt = this.addMessageTypeGuidance(enhancedPrompt, messageType, patterns);

    //console.log(`✅ [PromptEnhancement] Enhanced prompt with priority settings applied`);
    return enhancedPrompt;
  }

  /**
   * حل التعارض حسب الإعدادات
   */
  async resolveConflicts(basePrompt, patterns, conflicts, prioritySettings) {
    //console.log(`🔧 [PromptEnhancement] Resolving conflicts using strategy: ${prioritySettings.conflictResolution}`);

    switch (prioritySettings.conflictResolution) {
      case 'prompt_wins':
        return {
          prompt: basePrompt,
          patterns: this.filterPatternsToMatchPrompt(patterns, basePrompt, conflicts)
        };

      case 'patterns_win':
        return {
          prompt: this.adjustPromptToMatchPatterns(basePrompt, patterns, conflicts),
          patterns: patterns
        };

      case 'merge_smart':
      default:
        return this.smartMergeConflicts(basePrompt, patterns, conflicts, prioritySettings);
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
      const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');

      const aiSettings = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.aiSettings.findFirst({
          where: { companyId }
        });
      }, 3);

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
      console.error('❌ [PromptEnhancement] Error getting priority settings:', error);
    }

    // إعدادات افتراضية
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
   * تطبيق تحسينات أنماط الكلمات على الـ prompt
   */
  applyWordPatternEnhancements(prompt, patterns) {
    const wordPatterns = patterns.filter(p => p.type === 'word_usage');
    
    if (wordPatterns.length === 0) return prompt;

    let enhancement = '\n\nإرشادات الكلمات الناجحة:\n';
    
    for (const pattern of wordPatterns) {
      const patternData = pattern.pattern;
      
      if (patternData.successfulWords && Array.isArray(patternData.successfulWords)) {
        enhancement += `- استخدم هذه الكلمات الناجحة: ${patternData.successfulWords.join(', ')} (معدل نجاح: ${Math.round(pattern.successRate * 100)}%)\n`;
      }
      
      if (patternData.failureWords && Array.isArray(patternData.failureWords)) {
        enhancement += `- تجنب هذه الكلمات: ${patternData.failureWords.join(', ')}\n`;
      }
    }

    return prompt + enhancement;
  }

  /**
   * تطبيق تحسينات أنماط الأسلوب على الـ prompt
   */
  applyStylePatternEnhancements(prompt, patterns) {
    const stylePatterns = patterns.filter(p => p.type === 'response_style');
    
    if (stylePatterns.length === 0) return prompt;

    let enhancement = '\n\nإرشادات الأسلوب:\n';
    
    for (const pattern of stylePatterns) {
      const patternData = pattern.pattern;
      
      if (patternData.preferredLength) {
        enhancement += `- اجعل ردك حوالي ${patternData.preferredLength} كلمة\n`;
      }
      
      if (patternData.style === 'concise') {
        enhancement += '- استخدم أسلوب مختصر ومباشر\n';
      } else if (patternData.style === 'detailed') {
        enhancement += '- قدم تفاصيل كافية ومفيدة\n';
      }
      
      if (patternData.structure) {
        enhancement += `- اتبع هذا الهيكل: ${patternData.structure}\n`;
      }
    }

    return prompt + enhancement;
  }

  /**
   * تطبيق تحسينات الأنماط العاطفية على الـ prompt
   */
  applyEmotionalPatternEnhancements(prompt, patterns) {
    const emotionalPatterns = patterns.filter(p => p.type === 'emotional_tone');
    
    if (emotionalPatterns.length === 0) return prompt;

    let enhancement = '\n\nإرشادات النبرة العاطفية:\n';
    
    for (const pattern of emotionalPatterns) {
      const patternData = pattern.pattern;
      
      if (patternData.preferredSentiment > 0.5) {
        enhancement += '- استخدم نبرة إيجابية ومتفائلة\n';
        enhancement += '- أضف كلمات تعبر عن الحماس والسعادة\n';
      } else if (patternData.preferredSentiment < -0.3) {
        enhancement += '- استخدم نبرة هادئة ومتفهمة\n';
      } else {
        enhancement += '- حافظ على نبرة محايدة ومهنية\n';
      }
      
      if (patternData.emotionalWords && Array.isArray(patternData.emotionalWords)) {
        enhancement += `- استخدم هذه الكلمات العاطفية: ${patternData.emotionalWords.join(', ')}\n`;
      }
    }

    return prompt + enhancement;
  }

  /**
   * تطبيق تحسينات أنماط التوقيت على الـ prompt
   */
  applyTimingPatternEnhancements(prompt, patterns) {
    const timingPatterns = patterns.filter(p => p.type === 'timing');
    
    if (timingPatterns.length === 0) return prompt;

    let enhancement = '\n\nإرشادات التوقيت:\n';
    
    for (const pattern of timingPatterns) {
      const patternData = pattern.pattern;
      
      if (patternData.optimalResponseTime) {
        enhancement += `- اهدف للرد خلال ${patternData.optimalResponseTime}\n`;
      }
      
      if (patternData.urgencyLevel === 'high') {
        enhancement += '- هذا استفسار عاجل، رد بسرعة وكفاءة\n';
      }
    }

    return prompt + enhancement;
  }

  /**
   * إضافة إرشادات خاصة بنوع الرسالة
   */
  addMessageTypeGuidance(prompt, messageType, patterns) {
    const typeGuidance = {
      'greeting': '\n\nللتحية: ابدأ بترحيب حار واسأل كيف يمكنك المساعدة.',
      'product_inquiry': '\n\nلاستفسار المنتج: قدم معلومات شاملة واقترح منتجات مناسبة.',
      'price_inquiry': '\n\nلاستفسار السعر: اذكر السعر بوضوح واعرض أي عروض متاحة.',
      'support': '\n\nللدعم الفني: اطرح أسئلة محددة لفهم المشكلة وقدم حلول عملية.',
      'order_inquiry': '\n\nلاستفسار الطلب: تحقق من تفاصيل الطلب وقدم معلومات دقيقة عن الحالة.'
    };

    const guidance = typeGuidance[messageType] || '';
    return prompt + guidance;
  }

  /**
   * بناء prompt مخصص للشركة
   */
  async buildCompanySpecificPrompt(companyId, messageType, patterns, companyInfo = null) {
    try {
      // الحصول على الـ prompt الأساسي
      let basePrompt = this.getBasePrompt(messageType);
      
      // إضافة معلومات الشركة إذا كانت متوفرة
      if (companyInfo) {
        basePrompt = this.addCompanyContext(basePrompt, companyInfo);
      }
      
      // تحسين الـ prompt بالأنماط
      const enhancedPrompt = await this.enhancePromptWithPatterns(
        basePrompt, 
        patterns, 
        messageType, 
        companyId
      );

      return enhancedPrompt;

    } catch (error) {
      console.error('❌ [PromptEnhancement] Error building company-specific prompt:', error);
      return this.getBasePrompt(messageType);
    }
  }

  /**
   * الحصول على الـ prompt الأساسي
   */
  getBasePrompt(messageType) {
    const promptData = this.basePrompts.get(messageType) || this.basePrompts.get('greeting');
    return promptData.arabic; // استخدام العربية كافتراضي
  }

  /**
   * إضافة سياق الشركة للـ prompt
   */
  addCompanyContext(prompt, companyInfo) {
    let contextualPrompt = prompt;
    
    if (companyInfo.name) {
      contextualPrompt += `\n\nأنت تمثل شركة ${companyInfo.name}.`;
    }
    
    if (companyInfo.industry) {
      contextualPrompt += `\nالشركة تعمل في مجال ${companyInfo.industry}.`;
    }
    
    if (companyInfo.tone) {
      contextualPrompt += `\nاستخدم نبرة ${companyInfo.tone} في ردودك.`;
    }
    
    if (companyInfo.specialInstructions) {
      contextualPrompt += `\n\nتعليمات خاصة: ${companyInfo.specialInstructions}`;
    }

    return contextualPrompt;
  }

  /**
   * تحليل فعالية الـ prompt المحسن
   */
  async analyzePromptEffectiveness(promptId, conversationOutcomes) {
    try {
      const successfulOutcomes = conversationOutcomes.filter(outcome => 
        outcome.outcome === 'purchase' || outcome.customerSatisfaction >= 4
      );
      
      const effectiveness = {
        totalConversations: conversationOutcomes.length,
        successfulConversations: successfulOutcomes.length,
        successRate: successfulOutcomes.length / conversationOutcomes.length,
        averageSatisfaction: conversationOutcomes.reduce((sum, outcome) => 
          sum + (outcome.customerSatisfaction || 0), 0) / conversationOutcomes.length,
        averageResponseTime: conversationOutcomes.reduce((sum, outcome) => 
          sum + (outcome.responseTime || 0), 0) / conversationOutcomes.length
      };

      //console.log(`📊 [PromptEnhancement] Prompt effectiveness: ${Math.round(effectiveness.successRate * 100)}%`);
      return effectiveness;

    } catch (error) {
      console.error('❌ [PromptEnhancement] Error analyzing prompt effectiveness:', error);
      return null;
    }
  }

  /**
   * تطبيق الأنماط المتوافقة فقط
   */
  applyCompatiblePatterns(prompt, patterns, basePrompt) {
    // فلترة الأنماط التي تتوافق مع البرونت
    const compatiblePatterns = patterns.filter(pattern => {
      return this.isPatternCompatibleWithPrompt(pattern, basePrompt);
    });

    let enhancedPrompt = prompt;
    enhancedPrompt = this.applyWordPatternEnhancements(enhancedPrompt, compatiblePatterns);
    enhancedPrompt = this.applyStylePatternEnhancements(enhancedPrompt, compatiblePatterns);

    return enhancedPrompt;
  }

  /**
   * تطبيق الأنماط غير المتعارضة فقط
   */
  applyNonConflictingPatterns(prompt, patterns, basePrompt) {
    const nonConflictingPatterns = patterns.filter(pattern => {
      return !this.doesPatternConflictWithPrompt(pattern, basePrompt);
    });

    let enhancedPrompt = prompt;
    if (nonConflictingPatterns.length > 0) {
      enhancedPrompt = this.applyWordPatternEnhancements(enhancedPrompt, nonConflictingPatterns);
    }

    return enhancedPrompt;
  }

  /**
   * فلترة الأنماط لتتوافق مع البرونت
   */
  filterPatternsToMatchPrompt(patterns, basePrompt, conflicts) {
    return patterns.filter(pattern => {
      // إزالة الأنماط التي تسبب تعارض
      const causesConflict = conflicts.conflicts.some(conflict => {
        return this.isPatternInvolvedInConflict(pattern, conflict);
      });

      return !causesConflict;
    });
  }

  /**
   * تعديل البرونت ليتوافق مع الأنماط
   */
  adjustPromptToMatchPatterns(basePrompt, patterns, conflicts) {
    let adjustedPrompt = basePrompt;

    // تعديل البرونت بناءً على الأنماط المهمة
    const importantPatterns = patterns.filter(p => p.successRate > 0.8);

    if (importantPatterns.length > 0) {
      adjustedPrompt += `\n\nإرشادات إضافية من الأنماط الناجحة:`;
      importantPatterns.forEach(pattern => {
        if (pattern.pattern && pattern.pattern.successfulWords) {
          adjustedPrompt += `\n- استخدم هذه الكلمات: ${pattern.pattern.successfulWords.join(', ')}`;
        }
      });
    }

    return adjustedPrompt;
  }

  /**
   * دمج ذكي للتعارضات
   */
  smartMergeConflicts(basePrompt, patterns, conflicts, prioritySettings) {
    let mergedPrompt = basePrompt;
    let mergedPatterns = [...patterns];

    // تحليل كل تعارض وحله بذكاء
    conflicts.conflicts.forEach(conflict => {
      switch (conflict.type) {
        case 'language_style':
          if (prioritySettings.enforceLanguageStyle) {
            // البرونت يفوز في أسلوب اللغة
            mergedPatterns = this.adjustPatternsLanguageStyle(mergedPatterns, conflict.promptStyle);
          } else {
            // السماح بالمزج
            mergedPrompt += `\n- يمكن استخدام ${conflict.promptStyle} و ${conflict.patternsStyle} حسب السياق`;
          }
          break;

        case 'personality':
          if (prioritySettings.enforcePersonality) {
            // البرونت يفوز في الشخصية
            mergedPatterns = this.adjustPatternsPersonality(mergedPatterns, conflict.promptPersonality);
          }
          break;

        default:
          // للتعارضات الأخرى، استخدم التوازن
          break;
      }
    });

    return { prompt: mergedPrompt, patterns: mergedPatterns };
  }

  /**
   * تحديث الـ prompt بناءً على النتائج
   */
  async updatePromptBasedOnResults(promptId, effectiveness, patterns) {
    try {
      if (effectiveness.successRate < 0.6) {
        //console.log(`⚠️ [PromptEnhancement] Low success rate detected: ${Math.round(effectiveness.successRate * 100)}%`);

        // إعادة تحسين الـ prompt
        const improvedPrompt = await this.enhancePromptWithPatterns(
          this.getBasePrompt('general'),
          patterns.filter(p => p.successRate > 0.8), // استخدام الأنماط عالية الأداء فقط
          'general'
        );

        //console.log('🔄 [PromptEnhancement] Prompt updated based on performance feedback');
        return improvedPrompt;
      }

      return null; // لا حاجة للتحديث

    } catch (error) {
      console.error('❌ [PromptEnhancement] Error updating prompt:', error);
      return null;
    }
  }

  // Helper methods
  isPatternCompatibleWithPrompt(pattern, prompt) { return true; }
  doesPatternConflictWithPrompt(pattern, prompt) { return false; }
  isPatternInvolvedInConflict(pattern, conflict) { return false; }
  adjustPatternsLanguageStyle(patterns, style) { return patterns; }
  adjustPatternsPersonality(patterns, personality) { return patterns; }

  /**
   * تنظيف ذاكرة التخزين المؤقت
   */
  clearCache() {
    this.enhancedPrompts.clear();
    //console.log('🧹 [PromptEnhancement] Cleared prompt cache');
  }
}

module.exports = PromptEnhancementService;
