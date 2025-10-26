import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RefreshCw, Save, RotateCcw, Settings, AlertTriangle } from 'lucide-react';
import { getApiUrl } from '../config/environment'; // Import environment config

interface AlertThresholds {
  errorRate: number;
  emptyRate: number;
  slowRate: number;
  responseTime: number;
  minResponses: number;
}

const AlertSettings: React.FC = () => {
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    errorRate: 10,
    emptyRate: 5,
    slowRate: 30,
    responseTime: 15000,
    minResponses: 5
  });
  
  const [originalThresholds, setOriginalThresholds] = useState<AlertThresholds>({
    errorRate: 10,
    emptyRate: 5,
    slowRate: 30,
    responseTime: 15000,
    minResponses: 5
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchThresholds = async () => {
    try {
      setError(null);
      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const response = await fetch(`${apiUrl}/monitor/alerts`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data.stats.thresholds) {
        const fetchedThresholds = data.data.stats.thresholds;
        setThresholds(fetchedThresholds);
        setOriginalThresholds(fetchedThresholds);
      }
    } catch (err) {
      console.error('Error fetching thresholds:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveThresholds = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const response = await fetch(`${apiUrl}/monitor/alerts/thresholds`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(thresholds)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOriginalThresholds(thresholds);
        setSuccess('تم حفظ الإعدادات بنجاح');
        
        // إخفاء رسالة النجاح بعد 3 ثواني
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to save thresholds');
      }
    } catch (err) {
      console.error('Error saving thresholds:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    const defaults: AlertThresholds = {
      errorRate: 10,
      emptyRate: 5,
      slowRate: 30,
      responseTime: 15000,
      minResponses: 5
    };
    setThresholds(defaults);
  };

  const resetToOriginal = () => {
    setThresholds(originalThresholds);
  };

  const hasChanges = () => {
    return JSON.stringify(thresholds) !== JSON.stringify(originalThresholds);
  };

  useEffect(() => {
    fetchThresholds();
  }, []);

  const handleInputChange = (field: keyof AlertThresholds, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setThresholds(prev => ({
        ...prev,
        [field]: numValue
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>جاري تحميل الإعدادات...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إعدادات التنبيهات</h1>
          <p className="text-gray-600 mt-1">
            تخصيص عتبات التنبيهات لمراقبة أداء النظام
          </p>
        </div>
        <Button onClick={fetchThresholds} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          تحديث
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-600 text-sm font-medium">{success}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <div className="text-red-600 text-sm font-medium">{error}</div>
          </div>
        </div>
      )}

      {/* Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Error Rate Threshold */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <span className="text-red-500">🚨</span>
              <span>عتبة معدل الأخطاء</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  معدل الأخطاء (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={thresholds.errorRate}
                  onChange={(e) => handleInputChange('errorRate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  سيتم إرسال تنبيه عند تجاوز هذا المعدل
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty Rate Threshold */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <span className="text-yellow-500">⚠️</span>
              <span>عتبة الردود الفارغة</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  معدل الردود الفارغة (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={thresholds.emptyRate}
                  onChange={(e) => handleInputChange('emptyRate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  تنبيه عند زيادة الردود الفارغة عن هذا المعدل
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slow Rate Threshold */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <span className="text-orange-500">🐌</span>
              <span>عتبة الردود البطيئة</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  معدل الردود البطيئة (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={thresholds.slowRate}
                  onChange={(e) => handleInputChange('slowRate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  تنبيه عند زيادة الردود البطيئة (أكثر من 10 ثواني)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Time Threshold */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <span className="text-blue-500">⏰</span>
              <span>عتبة وقت الاستجابة</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  متوسط وقت الاستجابة (ميلي ثانية)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={thresholds.responseTime}
                  onChange={(e) => handleInputChange('responseTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  تنبيه عند تجاوز متوسط وقت الاستجابة لهذا الحد
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Minimum Responses */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <span className="text-purple-500">📊</span>
              <span>الحد الأدنى للردود</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عدد الردود المطلوب للتحليل
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={thresholds.minResponses}
                  onChange={(e) => handleInputChange('minResponses', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  لن يتم تحليل التنبيهات حتى يصل عدد الردود لهذا الحد الأدنى
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-4 space-x-reverse">
          <Button
            onClick={resetToDefaults}
            variant="outline"
            disabled={saving}
          >
            <Settings className="w-4 h-4 mr-2" />
            القيم الافتراضية
          </Button>
          
          <Button
            onClick={resetToOriginal}
            variant="outline"
            disabled={saving || !hasChanges()}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            إلغاء التغييرات
          </Button>
        </div>

        <Button
          onClick={saveThresholds}
          disabled={saving || !hasChanges()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>

      {/* Current Values Display */}
      <Card>
        <CardHeader>
          <CardTitle>القيم الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-red-600">{thresholds.errorRate}%</div>
              <div className="text-gray-600">معدل الأخطاء</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-yellow-600">{thresholds.emptyRate}%</div>
              <div className="text-gray-600">الردود الفارغة</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-orange-600">{thresholds.slowRate}%</div>
              <div className="text-gray-600">الردود البطيئة</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-600">{thresholds.responseTime}ms</div>
              <div className="text-gray-600">وقت الاستجابة</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-purple-600">{thresholds.minResponses}</div>
              <div className="text-gray-600">الحد الأدنى</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertSettings;
