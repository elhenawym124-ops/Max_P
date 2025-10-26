/**
 * خدمة تنظيف الأنماط المكررة والمتشابهة
 * Pattern Cleanup Service for removing duplicates and similar patterns
 */

const { PrismaClient } = require('@prisma/client');

class PatternCleanupService {
  constructor() {
    this.prisma = new PrismaClient();
    //console.log('🧹 [PatternCleanup] Service initialized');
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
   * البحث عن الأنماط المكررة والمتشابهة
   */
  async findDuplicatePatterns(companyId) {
    try {
      //console.log(`🔍 [PatternCleanup] Finding duplicate patterns for company: ${companyId}`);

      const patterns = await this.prisma.successPattern.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' }
      });

      //console.log(`📊 [PatternCleanup] Analyzing ${patterns.length} patterns...`);

      const duplicateGroups = [];
      const processed = new Set();

      for (let i = 0; i < patterns.length; i++) {
        if (processed.has(patterns[i].id)) continue;

        const currentPattern = patterns[i];
        const similarPatterns = [currentPattern];
        processed.add(currentPattern.id);

        // البحث عن الأنماط المشابهة
        for (let j = i + 1; j < patterns.length; j++) {
          if (processed.has(patterns[j].id)) continue;

          const comparePattern = patterns[j];
          
          // فحص التشابه
          const textSimilarity = this.calculateTextSimilarity(
            currentPattern.description.toLowerCase(),
            comparePattern.description.toLowerCase()
          );

          const typeSimilarity = currentPattern.patternType === comparePattern.patternType;
          const successRateDiff = Math.abs(currentPattern.successRate - comparePattern.successRate);

          // معايير التشابه
          const isDuplicate = (
            (textSimilarity >= 0.85) || // تشابه نصي عالي
            (textSimilarity >= 0.70 && typeSimilarity && successRateDiff <= 0.05) // تشابه متوسط + نفس النوع + معدل نجاح متقارب
          );

          if (isDuplicate) {
            similarPatterns.push(comparePattern);
            processed.add(comparePattern.id);
          }
        }

        // إضافة المجموعة إذا كانت تحتوي على أكثر من نمط
        if (similarPatterns.length > 1) {
          duplicateGroups.push(similarPatterns);
        }
      }

      //console.log(`📊 [PatternCleanup] Found ${duplicateGroups.length} duplicate groups`);
      return duplicateGroups;

    } catch (error) {
      console.error('❌ [PatternCleanup] Error finding duplicates:', error);
      return [];
    }
  }

  /**
   * دمج الأنماط المتشابهة
   */
  async mergeSimilarPatterns(patternGroup) {
    try {
      if (patternGroup.length <= 1) return null;

      //console.log(`🔄 [PatternCleanup] Merging ${patternGroup.length} similar patterns...`);

      // اختيار أفضل نمط (أعلى معدل نجاح + أحدث)
      const bestPattern = patternGroup.reduce((best, current) => {
        if (current.successRate > best.successRate) return current;
        if (current.successRate === best.successRate && current.createdAt > best.createdAt) return current;
        return best;
      });

      // حساب المتوسط المرجح لمعدل النجاح
      const totalSampleSize = patternGroup.reduce((sum, p) => sum + (p.sampleSize || 10), 0);
      const weightedSuccessRate = patternGroup.reduce((sum, p) => {
        return sum + (p.successRate * (p.sampleSize || 10));
      }, 0) / totalSampleSize;

      // تحديث النمط الأفضل
      const updatedPattern = await this.prisma.successPattern.update({
        where: { id: bestPattern.id },
        data: {
          successRate: weightedSuccessRate,
          sampleSize: totalSampleSize,
          metadata: JSON.stringify({
            ...JSON.parse(bestPattern.metadata || '{}'),
            mergedFrom: patternGroup.filter(p => p.id !== bestPattern.id).map(p => p.id),
            mergedAt: new Date().toISOString(),
            mergeReason: 'Duplicate patterns cleanup',
            originalCount: patternGroup.length
          }),
          updatedAt: new Date()
        }
      });

      // FIXED: Add company isolation for security
      // حذف الأنماط الأخرى
      const toDelete = patternGroup.filter(p => p.id !== bestPattern.id);
      if (toDelete.length > 0) {
        await this.prisma.successPattern.deleteMany({
          where: {
            id: { in: toDelete.map(p => p.id) },
            companyId: bestPattern.companyId // Company isolation
          }
        });
      }

      //console.log(`✅ [PatternCleanup] Merged ${patternGroup.length} patterns into one (${bestPattern.id})`);
      //console.log(`   📊 New success rate: ${(weightedSuccessRate * 100).toFixed(1)}%`);
      //console.log(`   📊 Total sample size: ${totalSampleSize}`);

      return {
        mergedPatternId: bestPattern.id,
        originalCount: patternGroup.length,
        deletedCount: toDelete.length,
        newSuccessRate: weightedSuccessRate,
        totalSampleSize
      };

    } catch (error) {
      console.error('❌ [PatternCleanup] Error merging patterns:', error);
      return null;
    }
  }

  /**
   * تنظيف شامل للأنماط المكررة
   */
  async cleanupDuplicatePatterns(companyId) {
    try {
      //console.log(`🧹 [PatternCleanup] Starting comprehensive cleanup for company: ${companyId}`);

      const startTime = Date.now();
      
      // البحث عن الأنماط المكررة
      const duplicateGroups = await this.findDuplicatePatterns(companyId);
      
      if (duplicateGroups.length === 0) {
        //console.log('✅ [PatternCleanup] No duplicate patterns found');
        return {
          success: true,
          duplicateGroupsFound: 0,
          patternsProcessed: 0,
          patternsDeleted: 0,
          patternsMerged: 0,
          timeTaken: Date.now() - startTime
        };
      }

      let totalProcessed = 0;
      let totalDeleted = 0;
      let totalMerged = 0;

      // دمج كل مجموعة من الأنماط المتشابهة
      for (const group of duplicateGroups) {
        const mergeResult = await this.mergeSimilarPatterns(group);
        
        if (mergeResult) {
          totalProcessed += mergeResult.originalCount;
          totalDeleted += mergeResult.deletedCount;
          totalMerged += 1;
        }
      }

      const timeTaken = Date.now() - startTime;

      //console.log(`🎉 [PatternCleanup] Cleanup completed successfully!`);
      //console.log(`   📊 Duplicate groups found: ${duplicateGroups.length}`);
      //console.log(`   📊 Patterns processed: ${totalProcessed}`);
      //console.log(`   📊 Patterns deleted: ${totalDeleted}`);
      //console.log(`   📊 Patterns merged: ${totalMerged}`);
      //console.log(`   ⏱️ Time taken: ${timeTaken}ms`);

      return {
        success: true,
        duplicateGroupsFound: duplicateGroups.length,
        patternsProcessed: totalProcessed,
        patternsDeleted: totalDeleted,
        patternsMerged: totalMerged,
        timeTaken
      };

    } catch (error) {
      console.error('❌ [PatternCleanup] Error in cleanup:', error);
      return {
        success: false,
        error: error.message,
        duplicateGroupsFound: 0,
        patternsProcessed: 0,
        patternsDeleted: 0,
        patternsMerged: 0
      };
    }
  }

  /**
   * إحصائيات الأنماط قبل وبعد التنظيف
   */
  async getCleanupStats(companyId) {
    try {
      const patterns = await this.prisma.successPattern.findMany({
        where: { companyId },
        select: {
          id: true,
          patternType: true,
          successRate: true,
          description: true,
          createdAt: true
        }
      });

      // تجميع حسب النوع
      const byType = {};
      patterns.forEach(p => {
        if (!byType[p.patternType]) byType[p.patternType] = 0;
        byType[p.patternType]++;
      });

      // تجميع حسب معدل النجاح
      const bySuccessRate = {};
      patterns.forEach(p => {
        const rate = Math.round(p.successRate * 100);
        const key = `${p.patternType}_${rate}`;
        if (!bySuccessRate[key]) bySuccessRate[key] = 0;
        bySuccessRate[key]++;
      });

      return {
        totalPatterns: patterns.length,
        byType,
        bySuccessRate,
        potentialDuplicates: Object.values(bySuccessRate).filter(count => count > 1).length
      };

    } catch (error) {
      console.error('❌ [PatternCleanup] Error getting stats:', error);
      return null;
    }
  }
}

module.exports = PatternCleanupService;
