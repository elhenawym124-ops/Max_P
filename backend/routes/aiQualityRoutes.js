/**
 * مسارات API لنظام التقييم الذكي
 */

const express = require('express');
const router = express.Router();

// الحصول على خدمة التقييم من aiAgentService
const aiAgentService = require('../services/aiAgentService');

// دالة للحصول على خدمة التقييم
const getQualityMonitorService = () => {
  try {
    if (aiAgentService && aiAgentService.qualityMonitor) {
      return aiAgentService.qualityMonitor;
    }
    //console.log('⚠️ [AI-QUALITY-ROUTES] Quality monitor service not available in aiAgentService');
    return null;
  } catch (error) {
    console.error('❌ [AI-QUALITY-ROUTES] Error accessing quality monitor service:', error);
    return null;
  }
};

/**
 * GET /api/v1/ai-quality/statistics
 * الحصول على إحصائيات الجودة العامة
 */
router.get('/statistics', async (req, res) => {
  try {
    const qualityService = getQualityMonitorService();
    if (!qualityService) {
      return res.status(503).json({
        success: false,
        error: 'Quality monitoring service not available'
      });
    }

    const statistics = qualityService.getQualityStatistics();
    
    res.json({
      success: true,
      data: statistics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI-QUALITY-ROUTES] Error getting statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/ai-quality/evaluation/:messageId
 * الحصول على تقييم رسالة محددة
 */
router.get('/evaluation/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const qualityService = getQualityMonitorService();
    
    if (!qualityService) {
      return res.status(503).json({
        success: false,
        error: 'Quality monitoring service not available'
      });
    }

    const evaluation = qualityService.getEvaluation(messageId);
    
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation not found'
      });
    }

    res.json({
      success: true,
      data: evaluation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI-QUALITY-ROUTES] Error getting evaluation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/ai-quality/recent
 * الحصول على آخر التقييمات
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const qualityService = getQualityMonitorService();
    
    if (!qualityService) {
      return res.status(503).json({
        success: false,
        error: 'Quality monitoring service not available'
      });
    }

    const recentEvaluations = qualityService.getRecentEvaluations(limit);
    
    res.json({
      success: true,
      data: recentEvaluations,
      count: recentEvaluations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI-QUALITY-ROUTES] Error getting recent evaluations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/ai-quality/by-quality/:level
 * الحصول على التقييمات حسب مستوى الجودة
 */
router.get('/by-quality/:level', async (req, res) => {
  try {
    const { level } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const qualityService = getQualityMonitorService();
    
    if (!qualityService) {
      return res.status(503).json({
        success: false,
        error: 'Quality monitoring service not available'
      });
    }

    // التحقق من صحة مستوى الجودة
    const validLevels = ['excellent', 'good', 'acceptable', 'poor', 'very_poor'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quality level. Valid levels: ' + validLevels.join(', ')
      });
    }

    const evaluations = qualityService.getEvaluationsByQuality(level, limit);
    
    res.json({
      success: true,
      data: evaluations,
      qualityLevel: level,
      count: evaluations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI-QUALITY-ROUTES] Error getting evaluations by quality:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/ai-quality/problematic
 * الحصول على التقييمات ذات المشاكل
 */
router.get('/problematic', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const qualityService = getQualityMonitorService();
    
    if (!qualityService) {
      return res.status(503).json({
        success: false,
        error: 'Quality monitoring service not available'
      });
    }

    const problematicEvaluations = qualityService.getProblematicEvaluations(limit);
    
    res.json({
      success: true,
      data: problematicEvaluations,
      count: problematicEvaluations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI-QUALITY-ROUTES] Error getting problematic evaluations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/ai-quality/trends
 * تحليل الاتجاهات
 */
router.get('/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const qualityService = getQualityMonitorService();
    
    if (!qualityService) {
      return res.status(503).json({
        success: false,
        error: 'Quality monitoring service not available'
      });
    }

    const trends = qualityService.analyzeTrends(days);
    
    res.json({
      success: true,
      data: trends,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI-QUALITY-ROUTES] Error analyzing trends:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/ai-quality/system-status
 * حالة نظام التقييم
 */
router.get('/system-status', async (req, res) => {
  try {
    const qualityService = getQualityMonitorService();
    
    if (!qualityService) {
      return res.status(503).json({
        success: false,
        error: 'Quality monitoring service not available'
      });
    }

    const systemStatus = qualityService.getSystemStatus();
    
    res.json({
      success: true,
      data: systemStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI-QUALITY-ROUTES] Error getting system status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/ai-quality/settings
 * تحديث إعدادات التقييم
 */
router.post('/settings', async (req, res) => {
  try {
    const qualityService = getQualityMonitorService();
    
    if (!qualityService) {
      return res.status(503).json({
        success: false,
        error: 'Quality monitoring service not available'
      });
    }

    const { enabled, settings } = req.body;
    
    if (typeof enabled === 'boolean') {
      qualityService.setEnabled(enabled);
    }
    
    if (settings && typeof settings === 'object') {
      qualityService.updateSettings(settings);
    }
    
    const updatedStatus = qualityService.getSystemStatus();
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI-QUALITY-ROUTES] Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/ai-quality/metrics-summary
 * ملخص المقاييس للوحة التحكم
 */
router.get('/metrics-summary', async (req, res) => {
  try {
    const qualityService = getQualityMonitorService();
    
    if (!qualityService) {
      return res.status(503).json({
        success: false,
        error: 'Quality monitoring service not available'
      });
    }

    const statistics = qualityService.getQualityStatistics();
    const recentEvaluations = qualityService.getRecentEvaluations(50);
    const problematicCount = qualityService.getProblematicEvaluations(100).length;
    
    // حساب المقاييس الأساسية
    const summary = {
      totalEvaluations: statistics.overall.totalEvaluations,
      averageScore: statistics.overall.averageScore,
      qualityDistribution: statistics.overall.qualityDistribution,
      topIssues: statistics.overall.topIssues,
      problematicCount,
      recentTrend: {
        last24h: recentEvaluations.filter(eval => 
          new Date(eval.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        averageScoreLast10: recentEvaluations.slice(0, 10).reduce((sum, eval) => 
          sum + eval.scores.overall, 0
        ) / Math.min(10, recentEvaluations.length) || 0
      },
      metrics: {
        relevance: statistics.relevance,
        accuracy: statistics.accuracy,
        clarity: statistics.clarity,
        completeness: statistics.completeness,
        ragUsage: statistics.ragUsage
      }
    };
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI-QUALITY-ROUTES] Error getting metrics summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/ai-quality/sentiment-analysis
 * الحصول على إحصائيات تحليل المشاعر
 */
router.get('/sentiment-analysis', async (req, res) => {
  try {
    const qualityService = getQualityMonitorService();
    if (!qualityService) {
      return res.status(503).json({
        success: false,
        error: 'Quality monitoring service not available'
      });
    }

    // الحصول على التقييمات الحديثة مع بيانات المشاعر
    const recentEvaluations = qualityService.getRecentEvaluations(100);

    // تحليل بيانات المشاعر
    const sentimentData = analyzeSentimentData(recentEvaluations);

    res.json({
      success: true,
      data: sentimentData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI-QUALITY-ROUTES] Error getting sentiment analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/ai-quality/analyze-sentiment
 * تحليل مشاعر رسالة معينة
 */
router.post('/analyze-sentiment', async (req, res) => {
  try {
    const { customerMessage, botResponse } = req.body;

    if (!customerMessage) {
      return res.status(400).json({
        success: false,
        error: 'Customer message is required'
      });
    }

    const qualityService = getQualityMonitorService();
    if (!qualityService || !qualityService.evaluator) {
      return res.status(503).json({
        success: false,
        error: 'Quality monitoring service not available'
      });
    }

    // تحليل المشاعر
    const sentimentResult = await qualityService.evaluator.analyzeSentiment(
      customerMessage,
      botResponse || ''
    );

    res.json({
      success: true,
      data: sentimentResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI-QUALITY-ROUTES] Error analyzing sentiment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * دالة مساعدة لتحليل بيانات المشاعر
 */
function analyzeSentimentData(evaluations) {
  const sentimentStats = {
    total: 0,
    withSentiment: 0,
    distribution: {
      very_satisfied: 0,
      satisfied: 0,
      neutral: 0,
      dissatisfied: 0,
      very_dissatisfied: 0
    },
    averageScore: 0,
    trends: {
      improving: false,
      stable: true,
      declining: false
    }
  };

  let totalScore = 0;
  let scoreCount = 0;

  evaluations.forEach(evaluation => {
    sentimentStats.total++;

    if (evaluation.sentiment) {
      sentimentStats.withSentiment++;

      // توزيع المستويات
      if (sentimentStats.distribution[evaluation.sentiment.level] !== undefined) {
        sentimentStats.distribution[evaluation.sentiment.level]++;
      }

      // متوسط الدرجات
      totalScore += evaluation.sentiment.score;
      scoreCount++;
    }
  });

  // حساب المتوسط
  if (scoreCount > 0) {
    sentimentStats.averageScore = Math.round(totalScore / scoreCount);
  }

  // تحليل الاتجاهات (مبسط)
  if (evaluations.length >= 10) {
    const recent = evaluations.slice(0, 5);
    const older = evaluations.slice(5, 10);

    const recentAvg = calculateAverageSentiment(recent);
    const olderAvg = calculateAverageSentiment(older);

    if (recentAvg > olderAvg + 5) {
      sentimentStats.trends = { improving: true, stable: false, declining: false };
    } else if (recentAvg < olderAvg - 5) {
      sentimentStats.trends = { improving: false, stable: false, declining: true };
    }
  }

  return sentimentStats;
}

/**
 * حساب متوسط المشاعر لمجموعة من التقييمات
 */
function calculateAverageSentiment(evaluations) {
  const sentimentScores = evaluations
    .filter(e => e.sentiment && e.sentiment.score)
    .map(e => e.sentiment.score);

  if (sentimentScores.length === 0) return 50;

  return sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
}

module.exports = router;
