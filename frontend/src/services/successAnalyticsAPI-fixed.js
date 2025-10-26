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
      console.error('خطأ في جلب الإحصائيات:', error);
      throw error;
    }
  },

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
        count: data.data?.patterns?.length || 0,
        message: data.message
      });

      if (!data.success) {
        throw new Error(data.message || 'فشل في جلب الأنماط');
      }

      return data.data;
    } catch (error) {
      console.error('خطأ في جلب الأنماط:', error);
      throw error;
    }
  },

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
  },

  /**
   * إيقاف اعتماد نمط معتمد
   */
  async unapprovePattern(patternId, reason = 'تم إيقاف الاعتماد يدوياً') {
    try {
      const response = await fetch(`${API_BASE_URL}/patterns/${patternId}/unapprove`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
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
  },

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
}

// إنشاء instance واحد للاستخدام
const successAnalyticsAPI = new SuccessAnalyticsAPI();

export default successAnalyticsAPI;
