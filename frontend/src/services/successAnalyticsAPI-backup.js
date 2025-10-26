/**
 * خدمة API لنظام تحليلات أنماط النجاح
 */

const API_BASE_URL = '/api/v1/success-learning';

class SuccessAnalyticsAPI {
  /**
   * جلب إحصائيات النتائج
   */
  async getOutcomeStats(timeRange = 30) {
    try {
      const response = await fetch(`${API_BASE_URL}/outcome-stats?timeRange=${timeRange}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'فشل في جلب الإحصائيات');
      }
      
      return data.data;
    } catch (error) {
      console.error('خطأ في جلب إحصائيات النتائج:', error);
      throw error;
    }
  }

  /**
   * جلب الأنماط المكتشفة
   */
  async getPatterns(options = {}) {
    try {
      const params = new URLSearchParams();

      // إضافة companyId (مطلوب)
      const companyId = options.companyId || localStorage.getItem('companyId') || 'cme4yvrco002kuftceydlrwdi';
      params.append('companyId', companyId);

      if (options.patternType) params.append('patternType', options.patternType);
      if (options.isActive !== undefined) params.append('isActive', options.isActive);
      if (options.isApproved !== undefined) params.append('isApproved', options.isApproved);
      if (options.limit) params.append('limit', options.limit);

      console.log('🔍 [Frontend] Fetching patterns with params:', params.toString());

      const response = await fetch(`${API_BASE_URL}/patterns?${params}`);
      const data = await response.json();

      console.log('📊 [Frontend] API Response:', {
        success: data.success,
        patternsCount: data.data?.patterns?.length || 0,
        totalCount: data.data?.count || 0
      });

      if (!data.success) {
        throw new Error(data.message || 'فشل في جلب الأنماط');
      }

      return data.data;
    } catch (error) {
      console.error('خطأ في جلب الأنماط:', error);
      throw error;
    }
  }

  /**
   * جلب فعالية الردود
   */
  async getResponseEffectiveness(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.conversationId) params.append('conversationId', options.conversationId);
      if (options.responseType) params.append('responseType', options.responseType);
      if (options.minEffectiveness) params.append('minEffectiveness', options.minEffectiveness);
      if (options.limit) params.append('limit', options.limit);

      const response = await fetch(`${API_BASE_URL}/response-effectiveness?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'فشل في جلب فعالية الردود');
      }
      
      return data.data;
    } catch (error) {
      console.error('خطأ في جلب فعالية الردود:', error);
      throw error;
    }
  }

  /**
   * تحليل أنماط النجاح
   */
  async analyzePatterns(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.timeRange) params.append('timeRange', options.timeRange);
      if (options.minSampleSize) params.append('minSampleSize', options.minSampleSize);
      if (options.patternTypes) params.append('patternTypes', options.patternTypes);

      const response = await fetch(`${API_BASE_URL}/analyze-patterns?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'فشل في تحليل الأنماط');
      }
      
      return data.data;
    } catch (error) {
      console.error('خطأ في تحليل الأنماط:', error);
      throw error;
    }
  }

  /**
   * اكتشاف أنماط جديدة
   */
  async detectNewPatterns(timeRange = 7) {
    try {
      const response = await fetch(`${API_BASE_URL}/detect-patterns?timeRange=${timeRange}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'فشل في اكتشاف الأنماط');
      }
      
      return data.data;
    } catch (error) {
      console.error('خطأ في اكتشاف الأنماط:', error);
      throw error;
    }
  }

  /**
   * تسجيل نتيجة محادثة
   */
  async recordOutcome(outcomeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/record-outcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(outcomeData)
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'فشل في تسجيل النتيجة');
      }
      
      return data.data;
    } catch (error) {
      console.error('خطأ في تسجيل النتيجة:', error);
      throw error;
    }
  }

  /**
   * الموافقة على نمط
   */
  async approvePattern(patternId, approvedBy = 'user') {
    try {
      const response = await fetch(`${API_BASE_URL}/patterns/${patternId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approvedBy })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'فشل في الموافقة على النمط');
      }
      
      return data.data;
    } catch (error) {
      console.error('خطأ في الموافقة على النمط:', error);
      throw error;
    }
  }

  /**
   * رفض نمط
   */
  async rejectPattern(patternId) {
    try {
      const response = await fetch(`${API_BASE_URL}/patterns/${patternId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'فشل في رفض النمط');
      }
      
      return data.data;
    } catch (error) {
      console.error('خطأ في رفض النمط:', error);
      throw error;
    }
  }

  /**
   * تشغيل تحليل شامل
   */
  async runComprehensiveAnalysis(options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}/run-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeRange: options.timeRange || 30,
          companyId: options.companyId
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'فشل في تشغيل التحليل الشامل');
      }
      
      return data.data;
    } catch (error) {
      console.error('خطأ في التحليل الشامل:', error);
      throw error;
    }
  }

  /**
   * جلب جميع البيانات مرة واحدة
   */
  async getAllData(timeRange = 30) {
    try {
      const [outcomeStats, patterns, effectiveness] = await Promise.all([
        this.getOutcomeStats(timeRange),
        this.getPatterns({ limit: 20 }),
        this.getResponseEffectiveness({ limit: 50 })
      ]);

      return {
        outcomeStats,
        patterns: patterns.patterns,
        responseEffectiveness: effectiveness
      };
    } catch (error) {
      console.error('خطأ في جلب جميع البيانات:', error);
      throw error;
    }
  }

  /**
   * جلب إحصائيات سريعة للداشبورد
   */
  async getQuickStats() {
    try {
      const [outcomeStats, patterns] = await Promise.all([
        this.getOutcomeStats(7), // آخر أسبوع
        this.getPatterns({ limit: 5, isApproved: true })
      ]);

      return {
        weeklyStats: outcomeStats,
        topPatterns: patterns.patterns,
        summary: {
          conversionRate: outcomeStats.conversionRate,
          totalValue: outcomeStats.totalValue,
          successfulConversations: outcomeStats.purchase,
          activePatterns: patterns.patterns.filter(p => p.isActive).length
        }
      };
    } catch (error) {
      console.error('خطأ في جلب الإحصائيات السريعة:', error);
      throw error;
    }
  }

  /**
   * تصدير البيانات
   */
  async exportData(format = 'json', timeRange = 30) {
    try {
      const data = await this.getAllData(timeRange);
      
      if (format === 'csv') {
        return this.convertToCSV(data);
      }
      
      return data;
    } catch (error) {
      console.error('خطأ في تصدير البيانات:', error);
      throw error;
    }
  }

  /**
   * تحويل البيانات إلى CSV
   */
  convertToCSV(data) {
    // تحويل بسيط للـ CSV
    const csvData = [];
    
    // إضافة الإحصائيات
    csvData.push(['نوع البيانات', 'القيمة']);
    csvData.push(['معدل التحويل', data.outcomeStats.conversionRate + '%']);
    csvData.push(['إجمالي القيمة', data.outcomeStats.totalValue]);
    csvData.push(['المبيعات الناجحة', data.outcomeStats.purchase]);
    
    // إضافة الأنماط
    csvData.push(['', '']); // سطر فارغ
    csvData.push(['الأنماط المكتشفة', '']);
    csvData.push(['النوع', 'الوصف', 'معدل النجاح', 'حجم العينة']);
    
    data.patterns.forEach(pattern => {
      csvData.push([
        pattern.patternType,
        pattern.description,
        (pattern.successRate * 100).toFixed(1) + '%',
        pattern.sampleSize
      ]);
    });

    return csvData.map(row => row.join(',')).join('\n');
  }
  /**
   * جلب إحصائيات أداء الأنماط
   */
  async getPatternPerformance(companyId = null) {
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);

      const response = await fetch(`${API_BASE_URL}/pattern-performance?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'فشل في جلب إحصائيات الأداء');
      }

      return data.data;
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الأداء:', error);
      throw error;
    }
  }

  /**
   * جلب إحصائيات استخدام الأنماط
   */
  async getPatternUsage(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.companyId) params.append('companyId', options.companyId);
      if (options.patternId) params.append('patternId', options.patternId);
      if (options.days) params.append('days', options.days);

      const response = await fetch(`${API_BASE_URL}/pattern-usage?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'فشل في جلب إحصائيات الاستخدام');
      }

      return data.data;
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الاستخدام:', error);
      throw error;
    }
  }

  /**
   * اختبار نمط معين
   */
  async testPattern(patternId, testMessage, companyId = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/test-pattern`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patternId,
          testMessage,
          companyId
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'فشل في اختبار النمط');
      }

      return data.data;
    } catch (error) {
      console.error('خطأ في اختبار النمط:', error);
      throw error;
    }
  }

  /**
   * جلب ملخص شامل للأنماط
   */
  async getPatternsSummary(companyId = null) {
    try {
      const [patterns, performance, usage] = await Promise.all([
        this.getPatterns({ companyId }),
        this.getPatternPerformance(companyId),
        this.getPatternUsage({ companyId, days: 7 })
      ]);

      return {
        patterns,
        performance,
        usage,
        summary: {
          totalPatterns: patterns.length,
          activePatterns: patterns.filter(p => p.isActive && p.isApproved).length,
          avgPerformance: performance.summary?.avgSuccessRate || 0,
          weeklyUsage: usage.totalRecords || 0
        }
      };
    } catch (error) {
      console.error('خطأ في جلب ملخص الأنماط:', error);
      throw error;
    }
  }

  /**
   * تحليل أنماط جديدة
   */
  async analyzeNewPatterns() {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'فشل في تحليل الأنماط الجديدة');
      }

      return data.data;
    } catch (error) {
      console.error('خطأ في تحليل الأنماط الجديدة:', error);
      throw error;
    }
  }

  /**
   * اعتماد نمط
   */
  async approvePattern(patternId) {
    try {
      const response = await fetch(`${API_BASE_URL}/patterns/${patternId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'فشل في اعتماد النمط');
      }

      return data.data;
    } catch (error) {
      console.error('خطأ في اعتماد النمط:', error);
      throw error;
    }
  }
}

// إنشاء instance واحد للاستخدام
const successAnalyticsAPI = new SuccessAnalyticsAPI();

export default successAnalyticsAPI;
