import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import PerformanceChart from '../components/charts/PerformanceChart';
import InsightsPanel from '../components/charts/InsightsPanel';
import QualityFilters from '../components/filters/QualityFilters';
import SmartAlerts from '../components/alerts/SmartAlerts';
import { RefreshCw, Settings, Download, Filter, AlertTriangle, CheckCircle, TrendingUp, Bell } from 'lucide-react';
import { getApiUrl } from '../config/environment'; // Import environment config

interface QualityStats {
  ratings: {
    total: number;
    positive: number;
    negative: number;
    satisfaction: number;
  };
  responses: {
    rated: number;
    unrated: number;
    totalResponses: number;
  };
  analysis: {
    status: string;
    satisfaction: number;
    negativeRate: number;
    concerns: string[];
    hasEnoughData: boolean;
    recommendation: string;
  };
  recentRatings: Array<{
    id: string;
    rating: string;
    comment: string;
    timestamp: string;
    customerId: string;
  }>;
  performance: any;
  dailyInsights: any;
}

const AdvancedQualityDashboard: React.FC = () => {
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'insights' | 'alerts'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    ratingType: 'all' as 'all' | 'positive' | 'negative',
    responseTime: 'all' as 'all' | 'fast' | 'slow',
    confidence: 'all' as 'all' | 'high' | 'medium' | 'low',
    intent: 'all' as 'all' | 'price_inquiry' | 'product_inquiry' | 'shipping_inquiry' | 'general',
    model: 'all' as 'all' | 'gemini-2.5-pro' | 'gemini-2.0-flash'
  });

  const fetchAllData = async () => {
    try {
      setError(null);
      
      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const token = localStorage.getItem('accessToken');
      
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      
      const [statsRes, performanceRes, insightsRes] = await Promise.all([
        fetch(`${apiUrl}/monitor/quality/stats`, { headers }),
        fetch(`${apiUrl}/monitor/quality/performance`, { headers }),
        fetch(`${apiUrl}/monitor/quality/insights`, { headers })
      ]);

      if (!statsRes.ok || !performanceRes.ok || !insightsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [statsData, performanceData, insightsData] = await Promise.all([
        statsRes.json(),
        performanceRes.json(),
        insightsRes.json()
      ]);

      if (statsData.success) setStats(statsData.data);
      if (performanceData.success) setPerformance(performanceData.data);
      if (insightsData.success) setInsights(insightsData.data);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchAllData, 30000); // تحديث كل 30 ثانية
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>جاري تحميل لوحة التحكم المتقدمة...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">لوحة تحكم الجودة المتقدمة</h1>
          <p className="text-gray-600 mt-1">مراقبة شاملة لأداء وجودة البوت مع تحليلات متقدمة</p>
        </div>
        <div className="flex space-x-2 space-x-reverse">
          <QualityFilters
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={fetchAllData}
            onResetFilters={() => {
              setFilters({
                dateRange: { start: '', end: '' },
                ratingType: 'all',
                responseTime: 'all',
                confidence: 'all',
                intent: 'all',
                model: 'all'
              });
              fetchAllData();
            }}
            isOpen={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
          />
          <button
            onClick={fetchAllData}
            disabled={loading}
            className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-lg transition-colors ${
              loading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'جاري التحديث...' : 'تحديث'}</span>
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-lg transition-colors ${
              autoRefresh
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{autoRefresh ? 'تحديث تلقائي' : 'تحديث يدوي'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-600 font-medium">خطأ: {error}</span>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">إجمالي التقييمات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.ratings.total}</div>
              <p className="text-xs text-gray-500">
                {stats.ratings.positive} إيجابي • {stats.ratings.negative} سلبي
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">معدل الرضا</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.ratings.satisfaction}%</div>
              <p className="text-xs text-gray-500">من إجمالي التقييمات</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">الردود المقيمة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.responses.rated}</div>
              <p className="text-xs text-gray-500">من {stats.responses.totalResponses} رد</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                {getStatusIcon(stats.analysis.status)}
                <span className="mr-2">حالة النظام</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(stats.analysis.status)}`}>
                {stats.analysis.status === 'excellent' && 'ممتاز'}
                {stats.analysis.status === 'good' && 'جيد'}
                {stats.analysis.status === 'fair' && 'مقبول'}
                {stats.analysis.status === 'poor' && 'ضعيف'}
                {stats.analysis.status === 'unknown' && 'غير معروف'}
              </div>
              <p className="text-xs text-gray-500 mt-1">{stats.analysis.recommendation}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 space-x-reverse">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'performance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            مقاييس الأداء
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'insights'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            الرؤى والاتجاهات
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bell className="w-4 h-4 inline mr-1" />
            التنبيهات الذكية
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Recent Ratings */}
            <Card>
              <CardHeader>
                <CardTitle>آخر التقييمات</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentRatings.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {stats.recentRatings.slice(0, 5).map((rating) => (
                      <div key={rating.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            {rating.rating === 'positive' ? (
                              <span className="text-green-500">👍</span>
                            ) : (
                              <span className="text-red-500">👎</span>
                            )}
                            <span className={`text-sm font-medium ${
                              rating.rating === 'positive' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {rating.rating === 'positive' ? 'إيجابي' : 'سلبي'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(rating.timestamp).toLocaleString('ar-EG')}
                          </span>
                        </div>
                        {rating.comment && (
                          <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                            "{rating.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-600">لا توجد تقييمات بعد</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'performance' && performance && (
          <PerformanceChart data={performance} loading={loading} />
        )}

        {activeTab === 'insights' && insights && (
          <InsightsPanel data={insights} loading={loading} />
        )}

        {activeTab === 'alerts' && (
          <SmartAlerts
            qualityStats={stats}
            performanceData={performance}
            className="w-full"
          />
        )}
      </div>
    </div>
  );
};

export default AdvancedQualityDashboard;
