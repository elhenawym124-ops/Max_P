import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle, Download, Calendar, TrendingUp, FileText } from 'lucide-react';
import { getApiUrl } from '../config/environment'; // Import environment config

interface ReportSummary {
  healthScore: number;
  status: string;
  keyMetrics: {
    totalResponses: number;
    successRate: string;
    averageResponseTime: string;
    activeAlerts: number;
  };
  mainConcerns: string[];
  recommendationsCount: number;
  lastGenerated: string;
}

interface DailyReport {
  type: string;
  date: string;
  generatedAt: string;
  performance: {
    totalResponses: number;
    successRate: number;
    errorRate: number;
    averageResponseTime: number;
    slowRate: number;
    emptyRate: number;
    healthStatus: string;
  };
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    suggestion: string;
  }>;
  executiveSummary: {
    healthScore: number;
    status: string;
    keyMetrics: {
      totalResponses: number;
      successRate: string;
      averageResponseTime: string;
      activeAlerts: number;
    };
    mainConcerns: string[];
    overallTrend: string;
  };
}

const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
  const [exporting, setExporting] = useState(false);

  const fetchSummary = async () => {
    try {
      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const response = await fetch(`${apiUrl}/monitor/reports/summary`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.success) {
        setSummary(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchDailyReport = async (date: string) => {
    try {
      setError(null);
      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const response = await fetch(`${apiUrl}/monitor/reports/daily?date=${date}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.success) {
        setDailyReport(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error fetching daily report:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const exportReport = async (type: string, format: string) => {
    try {
      setExporting(true);
      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const response = await fetch(`${apiUrl}/monitor/reports/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, format, date: selectedDate })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.success) {
        // محاكاة التحميل
        const blob = new Blob([JSON.stringify(data.data.report, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.data.export.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error exporting report:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSummary(),
        fetchDailyReport(selectedDate)
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [selectedDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'good': return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'fair': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'poor': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>جاري تحميل التقارير...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">التقارير والتحليلات</h1>
          <p className="text-gray-600 mt-1">تقارير مفصلة عن أداء النظام</p>
        </div>
        <div className="flex space-x-2 space-x-reverse">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={() => fetchDailyReport(selectedDate)} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            تحديث
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-600 font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                {getStatusIcon(summary.status)}
                <span className="mr-2">نقاط الصحة</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary.healthScore}/100
              </div>
              <Badge className={getStatusColor(summary.status)}>
                {summary.status === 'excellent' && 'ممتاز'}
                {summary.status === 'good' && 'جيد'}
                {summary.status === 'fair' && 'مقبول'}
                {summary.status === 'poor' && 'ضعيف'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">إجمالي الردود</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.keyMetrics.totalResponses}
              </div>
              <p className="text-xs text-gray-500">معدل النجاح: {summary.keyMetrics.successRate}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">وقت الاستجابة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {summary.keyMetrics.averageResponseTime}
              </div>
              <p className="text-xs text-gray-500">متوسط الوقت</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">التوصيات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {summary.recommendationsCount}
              </div>
              <p className="text-xs text-gray-500">توصية متاحة</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Report */}
      {dailyReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>ملخص الأداء</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">معدل النجاح:</span>
                  <span className="font-medium text-green-600">{dailyReport.performance.successRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">معدل الأخطاء:</span>
                  <span className="font-medium text-red-600">{dailyReport.performance.errorRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">الردود البطيئة:</span>
                  <span className="font-medium text-yellow-600">{dailyReport.performance.slowRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">الردود الفارغة:</span>
                  <span className="font-medium text-gray-600">{dailyReport.performance.emptyRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>التوصيات</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyReport.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {dailyReport.recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className={`border rounded-lg p-3 ${getPriorityColor(rec.priority)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{rec.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {rec.priority === 'critical' && 'حرج'}
                          {rec.priority === 'high' && 'عالي'}
                          {rec.priority === 'medium' && 'متوسط'}
                          {rec.priority === 'low' && 'منخفض'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-700">{rec.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">لا توجد توصيات</p>
                  <p className="text-xs text-gray-500">النظام يعمل بشكل مثالي</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <Download className="w-5 h-5 text-green-600" />
            <span>تصدير التقارير</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => exportReport('daily', 'json')}
              disabled={exporting}
              variant="outline"
            >
              {exporting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              تقرير يومي (JSON)
            </Button>
            
            <Button 
              onClick={() => exportReport('weekly', 'json')}
              disabled={exporting}
              variant="outline"
            >
              {exporting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              تقرير أسبوعي (JSON)
            </Button>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>• التقارير متاحة بصيغة JSON</p>
            <p>• يمكن إضافة صيغ PDF و Excel لاحقاً</p>
            <p>• التقارير تحتوي على جميع البيانات والتحليلات</p>
          </div>
        </CardContent>
      </Card>

      {/* Main Concerns */}
      {dailyReport && dailyReport.executiveSummary.mainConcerns.length > 0 && 
       dailyReport.executiveSummary.mainConcerns[0] !== 'لا توجد مخاوف رئيسية' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>المخاوف الرئيسية</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailyReport.executiveSummary.mainConcerns.map((concern, index) => (
                <div key={index} className="flex items-center space-x-2 space-x-reverse">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">{concern}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsPage;
