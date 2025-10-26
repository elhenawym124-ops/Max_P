import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { RefreshCw, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';
import RatingButtons from '../components/quality/RatingButtons';
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
}

const QualityTestPage: React.FC = () => {
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const token = localStorage.getItem('accessToken');
      
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      
      const response = await fetch(`${apiUrl}/monitor/quality/stats`, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // تحديث كل 2 دقيقة (reduced from 10 seconds)
    const interval = setInterval(fetchStats, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRatingSubmit = (rating: 'positive' | 'negative', comment?: string) => {
    console.log('Rating submitted:', { rating, comment });
    
    // تحديث الإحصائيات بعد التقييم
    setTimeout(fetchStats, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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
          <span>جاري تحميل البيانات...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">اختبار نظام تقييم الجودة</h1>
          <p className="text-gray-600 mt-1">اختبار أزرار التقييم ومراقبة الإحصائيات</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 font-medium">خطأ: {error}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
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
              <CardTitle className="text-sm font-medium text-gray-600">حالة النظام</CardTitle>
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

      {/* Test Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sample Bot Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span>رسائل تجريبية من البوت</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Message 1 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start space-x-3 space-x-reverse">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">🤖</span>
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-sm text-gray-800">
                      مرحباً! سعر الكوتشي 349 جنيه، وخاماته مستوردة ونعله طبي ومريح جداً في اللبس.
                    </p>
                  </div>
                  <div className="mt-2">
                    <RatingButtons
                      messageId="test_msg_001"
                      conversationId="test_conv_001"
                      customerId="test_customer_001"
                      onRatingSubmit={handleRatingSubmit}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Message 2 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start space-x-3 space-x-reverse">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">🤖</span>
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-sm text-gray-800">
                      الشحن متوفر لجميع المحافظات. للقاهرة والجيزة 30 جنيه، وباقي المحافظات 50 جنيه.
                    </p>
                  </div>
                  <div className="mt-2">
                    <RatingButtons
                      messageId="test_msg_002"
                      conversationId="test_conv_001"
                      customerId="test_customer_001"
                      onRatingSubmit={handleRatingSubmit}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Message 3 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start space-x-3 space-x-reverse">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">🤖</span>
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-sm text-gray-800">
                      عذراً، لم أفهم طلبك. هل يمكنك توضيح ما تريده بشكل أكثر تفصيلاً؟
                    </p>
                  </div>
                  <div className="mt-2">
                    <RatingButtons
                      messageId="test_msg_003"
                      conversationId="test_conv_001"
                      customerId="test_customer_001"
                      onRatingSubmit={handleRatingSubmit}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Ratings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <ThumbsUp className="w-5 h-5 text-green-600" />
              <span>آخر التقييمات</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.recentRatings.length > 0 ? (
              <div className="space-y-3">
                {stats.recentRatings.map((rating) => (
                  <div key={rating.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        {rating.rating === 'positive' ? (
                          <ThumbsUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <ThumbsDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${
                          rating.rating === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {rating.rating === 'positive' ? 'إيجابي' : 'سلبي'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(rating.timestamp)}
                      </span>
                    </div>
                    {rating.comment && (
                      <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                        "{rating.comment}"
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      العميل: {rating.customerId}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">لا توجد تقييمات بعد</p>
                <p className="text-xs text-gray-500">جرب تقييم الرسائل التجريبية</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QualityTestPage;
