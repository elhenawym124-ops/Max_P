/**
 * خدمة API لنظام تحليلات أنماط النجاح
 */

const API_BASE_URL = '/api/v1/success-learning';

class SuccessAnalyticsAPI {
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

      const response = await fetch(`${API_BASE_URL}/patterns?${params}`);
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
   * تفعيل نظام إدارة الأنماط
   */
  async enablePatternSystem(companyId = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/system/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          companyId: companyId || localStorage.getItem('companyId') || 'cme4yvrco002kuftceydlrwdi'
        })
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
  async disablePatternSystem(companyId = null, reason = 'تم الإيقاف يدوياً') {
    try {
      const response = await fetch(`${API_BASE_URL}/system/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          companyId: companyId || localStorage.getItem('companyId') || 'cme4yvrco002kuftceydlrwdi',
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
  async getPatternSystemStatus(companyId = null) {
    try {
      const params = new URLSearchParams();
      params.append('companyId', companyId || localStorage.getItem('companyId') || 'cme4yvrco002kuftceydlrwdi');

      const response = await fetch(`${API_BASE_URL}/system/status?${params}`);
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
}

// إنشاء instance واحد للاستخدام
const successAnalyticsAPI = new SuccessAnalyticsAPI();

export default successAnalyticsAPI;
