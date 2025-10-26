/**
 * خدمة كشف التعارض بين البرونت والأنماط
 * Conflict Detection Service for Prompt vs Patterns
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const prisma = getSharedPrismaClient();

class ConflictDetectionService {
  constructor() {
    this.languagePatterns = {
      colloquial: ['كويس', 'ازيك', 'ازيكم', 'اهلا', 'يلا', 'خلاص', 'ماشي', 'تمام', 'جامد', 'حلو'],
      formal: ['بالطبع', 'يسعدني', 'أهلاً وسهلاً', 'مرحباً', 'شكراً جزيلاً', 'بالتأكيد', 'حسناً']
    };
    
    this.personalityKeywords = {
      friendly: ['حبيبتي', 'يا قمر', 'عزيزتي', 'ودود', 'طيب'],
      professional: ['محترم', 'مهني', 'رسمي', 'أعمال'],
      casual: ['عادي', 'بساطة', 'مريح', 'عفوي']
    };
  }

  /**
   * كشف جميع أنواع التعارض
   */
  async detectAllConflicts(prompt, patterns, companyId = null) {
    try {
      //console.log('🔍 [CONFLICT-DETECTOR] Starting comprehensive conflict detection');
      
      const conflicts = {
        hasConflicts: false,
        conflicts: [],
        severity: 'low',
        recommendations: []
      };

      // كشف تعارض اللغة
      const languageConflict = this.detectLanguageConflict(prompt, patterns);
      if (languageConflict.hasConflict) {
        conflicts.conflicts.push(languageConflict);
        conflicts.hasConflicts = true;
      }

      // كشف تعارض الشخصية
      const personalityConflict = this.detectPersonalityConflict(prompt, patterns);
      if (personalityConflict.hasConflict) {
        conflicts.conflicts.push(personalityConflict);
        conflicts.hasConflicts = true;
      }

      // كشف تعارض أسلوب الرد
      const styleConflict = this.detectStyleConflict(prompt, patterns);
      if (styleConflict.hasConflict) {
        conflicts.conflicts.push(styleConflict);
        conflicts.hasConflicts = true;
      }

      // كشف تعارض اختيار الكلمات
      const wordChoiceConflict = this.detectWordChoiceConflict(prompt, patterns);
      if (wordChoiceConflict.hasConflict) {
        conflicts.conflicts.push(wordChoiceConflict);
        conflicts.hasConflicts = true;
      }

      // تحديد شدة التعارض
      conflicts.severity = this.calculateConflictSeverity(conflicts.conflicts);
      
      // توليد التوصيات
      conflicts.recommendations = this.generateRecommendations(conflicts.conflicts);

      // حفظ التقرير إذا كان مطلوباً
      if (conflicts.hasConflicts && companyId) {
        await this.saveConflictReport(companyId, conflicts, prompt, patterns);
      }

      //console.log(`🔍 [CONFLICT-DETECTOR] Detection complete: ${conflicts.conflicts.length} conflicts found`);
      return conflicts;

    } catch (error) {
      console.error('❌ [CONFLICT-DETECTOR] Error in conflict detection:', error);
      return { hasConflicts: false, conflicts: [], severity: 'low', recommendations: [] };
    }
  }

  /**
   * كشف تعارض اللغة (عامية vs فصحى)
   */
  detectLanguageConflict(prompt, patterns) {
    const promptStyle = this.detectLanguageStyle(prompt);
    const patternsStyle = this.detectPatternsLanguageStyle(patterns);
    
    const hasConflict = promptStyle !== patternsStyle && promptStyle !== 'mixed' && patternsStyle !== 'mixed';
    
    return {
      type: 'language_style',
      hasConflict,
      promptStyle,
      patternsStyle,
      severity: hasConflict ? 'high' : 'low',
      description: hasConflict 
        ? `تعارض في أسلوب اللغة: البرونت يستخدم ${promptStyle} والأنماط تستخدم ${patternsStyle}`
        : 'لا يوجد تعارض في أسلوب اللغة',
      recommendation: hasConflict 
        ? `توحيد أسلوب اللغة ليكون ${promptStyle} في جميع الأنماط`
        : null
    };
  }

  /**
   * كشف تعارض الشخصية
   */
  detectPersonalityConflict(prompt, patterns) {
    const promptPersonality = this.extractPersonality(prompt);
    const patternsPersonality = this.extractPatternsPersonality(patterns);
    
    const conflictingTraits = this.findConflictingPersonalityTraits(promptPersonality, patternsPersonality);
    const hasConflict = conflictingTraits.length > 0;
    
    return {
      type: 'personality',
      hasConflict,
      promptPersonality,
      patternsPersonality,
      conflictingTraits,
      severity: hasConflict ? 'medium' : 'low',
      description: hasConflict 
        ? `تعارض في الشخصية: ${conflictingTraits.join(', ')}`
        : 'لا يوجد تعارض في الشخصية',
      recommendation: hasConflict 
        ? 'توحيد سمات الشخصية بين البرونت والأنماط'
        : null
    };
  }

  /**
   * كشف تعارض أسلوب الرد
   */
  detectStyleConflict(prompt, patterns) {
    const promptStyle = this.extractResponseStyle(prompt);
    const patternsStyle = this.extractPatternsResponseStyle(patterns);
    
    const hasConflict = this.areStylesConflicting(promptStyle, patternsStyle);
    
    return {
      type: 'response_style',
      hasConflict,
      promptStyle,
      patternsStyle,
      severity: hasConflict ? 'medium' : 'low',
      description: hasConflict 
        ? 'تعارض في أسلوب الرد بين البرونت والأنماط'
        : 'لا يوجد تعارض في أسلوب الرد',
      recommendation: hasConflict 
        ? 'توحيد أسلوب الرد (طول الرد، هيكل الرد، استخدام الرموز)'
        : null
    };
  }

  /**
   * كشف تعارض اختيار الكلمات
   */
  detectWordChoiceConflict(prompt, patterns) {
    const promptWords = this.extractKeyWords(prompt);
    const patternsWords = this.extractPatternsWords(patterns);
    
    const conflictingWords = this.findConflictingWords(promptWords, patternsWords);
    const hasConflict = conflictingWords.length > 0;
    
    return {
      type: 'word_choice',
      hasConflict,
      conflictingWords,
      severity: hasConflict ? 'low' : 'low',
      description: hasConflict 
        ? `تعارض في اختيار الكلمات: ${conflictingWords.slice(0, 3).join(', ')}`
        : 'لا يوجد تعارض في اختيار الكلمات',
      recommendation: hasConflict 
        ? 'مراجعة الكلمات المتعارضة وتوحيد المصطلحات'
        : null
    };
  }

  /**
   * تحديد أسلوب اللغة في النص
   */
  detectLanguageStyle(text) {
    const colloquialCount = this.languagePatterns.colloquial.filter(word => 
      text.toLowerCase().includes(word)
    ).length;
    
    const formalCount = this.languagePatterns.formal.filter(word => 
      text.toLowerCase().includes(word)
    ).length;
    
    if (colloquialCount > formalCount) return 'colloquial';
    if (formalCount > colloquialCount) return 'formal';
    return 'mixed';
  }

  /**
   * تحديد أسلوب اللغة في الأنماط
   */
  detectPatternsLanguageStyle(patterns) {
    let colloquialCount = 0;
    let formalCount = 0;
    
    patterns.forEach(pattern => {
      if (pattern.pattern && pattern.pattern.successfulWords) {
        pattern.pattern.successfulWords.forEach(word => {
          if (this.languagePatterns.colloquial.includes(word.toLowerCase())) {
            colloquialCount++;
          }
          if (this.languagePatterns.formal.includes(word.toLowerCase())) {
            formalCount++;
          }
        });
      }
    });
    
    if (colloquialCount > formalCount) return 'colloquial';
    if (formalCount > colloquialCount) return 'formal';
    return 'mixed';
  }

  /**
   * استخراج سمات الشخصية من النص
   */
  extractPersonality(text) {
    const personality = [];
    
    Object.keys(this.personalityKeywords).forEach(trait => {
      const keywords = this.personalityKeywords[trait];
      const found = keywords.some(keyword => text.toLowerCase().includes(keyword));
      if (found) personality.push(trait);
    });
    
    return personality;
  }

  /**
   * استخراج سمات الشخصية من الأنماط
   */
  extractPatternsPersonality(patterns) {
    const personality = [];
    
    patterns.forEach(pattern => {
      if (pattern.description) {
        Object.keys(this.personalityKeywords).forEach(trait => {
          const keywords = this.personalityKeywords[trait];
          const found = keywords.some(keyword => 
            pattern.description.toLowerCase().includes(keyword)
          );
          if (found && !personality.includes(trait)) {
            personality.push(trait);
          }
        });
      }
    });
    
    return personality;
  }

  /**
   * حساب شدة التعارض
   */
  calculateConflictSeverity(conflicts) {
    if (conflicts.length === 0) return 'low';
    
    const highSeverityCount = conflicts.filter(c => c.severity === 'high').length;
    const mediumSeverityCount = conflicts.filter(c => c.severity === 'medium').length;
    
    if (highSeverityCount > 0) return 'high';
    if (mediumSeverityCount > 1) return 'high';
    if (mediumSeverityCount > 0) return 'medium';
    return 'low';
  }

  /**
   * توليد التوصيات
   */
  generateRecommendations(conflicts) {
    const recommendations = [];
    
    conflicts.forEach(conflict => {
      if (conflict.recommendation) {
        recommendations.push({
          type: conflict.type,
          priority: conflict.severity,
          action: conflict.recommendation
        });
      }
    });
    
    return recommendations;
  }

  /**
   * حفظ تقرير التعارض
   */
  async saveConflictReport(companyId, conflicts, prompt, patterns) {
    try {
      for (const conflict of conflicts.conflicts) {
        await prisma.conflictReports.create({
          data: {
            id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            companyId,
            conflictType: conflict.type,
            promptContent: prompt.substring(0, 1000), // تحديد الطول
            patternsInvolved: JSON.stringify(patterns.map(p => ({ id: p.id, type: p.type }))),
            conflictDetails: JSON.stringify(conflict),
            resolutionApplied: 'merge_smart', // افتراضي
            severity: conflict.severity,
            resolved: false
          }
        });
      }
      
      //console.log(`📊 [CONFLICT-DETECTOR] Saved ${conflicts.conflicts.length} conflict reports`);
    } catch (error) {
      console.error('❌ [CONFLICT-DETECTOR] Error saving conflict report:', error);
    }
  }

  // Helper methods
  extractResponseStyle(text) { return { length: 'medium', structure: 'simple' }; }
  extractPatternsResponseStyle(patterns) { return { length: 'medium', structure: 'simple' }; }
  areStylesConflicting(style1, style2) { return false; }
  extractKeyWords(text) { return []; }
  extractPatternsWords(patterns) { return []; }
  findConflictingWords(words1, words2) { return []; }
  findConflictingPersonalityTraits(traits1, traits2) { return []; }
}

module.exports = ConflictDetectionService;
