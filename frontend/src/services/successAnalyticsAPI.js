/**
 * خدمة API لنظام تحليلات أنماط النجاح
 */

const API_BASE_URL = '/api/v1/success-learning';

// دالة مساعدة للحصول على الـ token
const getAuthToken = () => {
  return localStorage.getItem('accessToken') || localStorage.getItem('token');
};

// دالة مساعدة لمعالجة الأخطاء
const handleAuthError = (response) => {
  if (response.status === 401) {
    // إعادة توجيه لصفحة تسجيل الدخول
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('companyId');
    console.log('🚫 [API] Authentication failed, redirecting to login');
    // استخدام window.location للتأكد من إعادة التوجيه
    setTimeout(() => {
      window.location.href = '/auth/login';
    }, 100);
    throw new Error('انتهت صلاحية جلسة العمل، يرجى تسجيل الدخول مرة أخرى');
  }
};

class SuccessAnalyticsAPI {
  /**
   * جلب الأنماط المكتشفة مع دعم التصفح
   */
  async getPatterns(options = {}) {
    try {
      const params = new URLSearchParams();
      const token = getAuthToken();

      // لا نحتاج لإضافة companyId - سيتم استخدامه من المصادقة في Backend

      if (options.patternType) params.append('patternType', options.patternType);
      if (options.isActive !== undefined) params.append('isActive', options.isActive);
      if (options.isApproved !== undefined) params.append('isApproved', options.isApproved);
      if (options.limit) params.append('limit', options.limit);
      if (options.page) params.append('page', options.page);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);

      const response = await fetch(`${API_BASE_URL}/patterns?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        handleAuthError(response);
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في جلب الأنماط');
      }

      const data = await response.json();

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
   * الموافقة على نمط
   */
  async approvePattern(patternId, approvedBy = 'user') {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/patterns/${patternId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
   * إيقاف اعتماد نمط معتمد
   */
  async unapprovePattern(patternId, reason = 'تم إيقاف الاعتماد يدوياً') {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/patterns/${patternId}/unapprove`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'فشل في إيقاف اعتماد النمط');
      }

      return data.data;
    } catch (error) {
      console.error('خطأ في إيقاف اعتماد النمط:', error);
      throw error;
    }
  }

  /**
   * رفض نمط
   */
  async rejectPattern(patternId) {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/patterns/${patternId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
   * حذف نمط نهائياً
   */
  async deletePattern(patternId, reason = 'تم الحذف يدوياً') {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/patterns/${patternId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'فشل في حذف النمط');
      }

      return data.data;
    } catch (error) {
      console.error('خطأ في حذف النمط:', error);
      throw error;
    }
  }

  /**
   * تفعيل نظام إدارة الأنماط
   */
  async enablePatternSystem() {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/system/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'فشل في تفعيل نظام الأنماط');
      }

      return data.data;
    } catch (error) {
      console.error('خطأ في تفعيل نظام الأنماط:', error);
      throw error;
    }
  }

  /**
   * إيقاف نظام إدارة الأنماط
   */
  async disablePatternSystem(reason = 'تم الإيقاف يدوياً') {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/system/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'فشل في إيقاف نظام الأنماط');
      }

      return data.data;
    } catch (error) {
      console.error('خطأ في إيقاف نظام الأنماط:', error);
      throw error;
    }
  }

  /**
   * الحصول على حالة نظام إدارة الأنماط
   */
  async getPatternSystemStatus() {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/system/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        handleAuthError(response);
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في جلب حالة النظام');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'فشل في جلب حالة النظام');
      }

      return data.data;
    } catch (error) {
      console.error('خطأ في جلب حالة نظام الأنماط:', error);
      throw error;
    }
  }

  /**
   * جلب إحصائيات النتائج
   */
  async getOutcomeStats(timeRange = 30) {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/outcome-stats?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
   * جلب فعالية الردود
   */
  async getResponseEffectiveness(options = {}) {
    try {
      const params = new URLSearchParams();

      if (options.conversationId) params.append('conversationId', options.conversationId);
      if (options.responseType) params.append('responseType', options.responseType);
      if (options.minEffectiveness) params.append('minEffectiveness', options.minEffectiveness);
      if (options.limit) params.append('limit', options.limit);

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/response-effectiveness?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
   * جلب إحصائيات أداء الأنماط
   */
  async getPatternPerformance() {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/pattern-performance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        handleAuthError(response);
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في جلب إحصائيات الأداء');
      }

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
      if (options.patternId) params.append('patternId', options.patternId);
      if (options.days) params.append('days', options.days);

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/pattern-usage?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        handleAuthError(response);
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في جلب إحصائيات الاستخدام');
      }

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
          totalPatterns: patterns.patterns?.length || 0,
          activePatterns: patterns.patterns?.filter(p => p.isActive && p.isApproved).length || 0,
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
   * تشغيل تحليل شامل
   */
  async runComprehensiveAnalysis(options = {}) {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/run-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timeRange: options.timeRange || 30
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
   * اختبار نمط معين
   */
  async testPattern(patternId, testMessage) {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/test-pattern`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patternId,
          testMessage
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
   * تحليل أنماط جديدة
   */
  async analyzeNewPatterns() {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/analyze-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
   * تسجيل نتيجة محادثة
   */
  async recordOutcome(outcomeData) {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/record-outcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
   * اكتشاف أنماط جديدة
   */
  async detectNewPatterns(timeRange = 7) {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/detect-patterns?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
}

// إنشاء instance واحد للاستخدام
const successAnalyticsAPI = new SuccessAnalyticsAPI();

export default successAnalyticsAPI;
