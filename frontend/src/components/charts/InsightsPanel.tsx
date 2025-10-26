import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Calendar, BarChart3, Lightbulb } from 'lucide-react';

interface DailyStats {
  date: string;
  responses: {
    total: number;
    slow: number;
    fast: number;
    avgResponseTime: number;
    totalResponseTime: number;
  };
  ratings: {
    total: number;
    positive: number;
    negative: number;
    satisfaction: number;
  };
  intents: { [key: string]: number };
  models: { [key: string]: number };
  ragUsage: number;
}

interface Trend {
  direction: 'increasing' | 'decreasing' | 'stable';
  change: number;
  percentage: number;
}

interface Insight {
  type: 'success' | 'warning' | 'info' | 'error';
  category: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

interface InsightsData {
  today: DailyStats | null;
  yesterday: DailyStats | null;
  last7Days: Array<{
    date: string;
    responses: number;
    ratings: number;
    satisfaction: number;
    avgResponseTime: number;
  }>;
  trends: {
    satisfaction: Trend;
    responseTime: Trend;
    volume: Trend;
  };
  insights: Insight[];
}

interface InsightsPanelProps {
  data: InsightsData;
  loading?: boolean;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ data, loading = false }) => {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <BarChart3 className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (direction: string, isGoodTrend: boolean = true) => {
    if (direction === 'stable') return 'text-gray-600';
    const isPositive = (direction === 'increasing' && isGoodTrend) || (direction === 'decreasing' && !isGoodTrend);
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Lightbulb className="w-4 h-4 text-blue-600" />;
    }
  };

  const getInsightBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Summary */}
      {data.today && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>ملخص اليوم</span>
              <span className="text-sm text-gray-500 font-normal">
                {new Date(data.today.date).toLocaleDateString('ar-EG')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.today.responses.total}</div>
                <div className="text-sm text-gray-600">رد</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data.today.ratings.total}</div>
                <div className="text-sm text-gray-600">تقييم</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{data.today.ratings.satisfaction}%</div>
                <div className="text-sm text-gray-600">رضا</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatTime(data.today.responses.avgResponseTime)}
                </div>
                <div className="text-sm text-gray-600">متوسط الوقت</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              {getTrendIcon(data.trends.satisfaction.direction)}
              <span className="mr-2">اتجاه الرضا</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold mb-1 ${getTrendColor(data.trends.satisfaction.direction, true)}`}>
              {data.trends.satisfaction.direction === 'stable' ? 'مستقر' : 
               data.trends.satisfaction.direction === 'increasing' ? 'متزايد' : 'متناقص'}
            </div>
            {data.trends.satisfaction.percentage !== 0 && (
              <div className="text-sm text-gray-600">
                {data.trends.satisfaction.percentage > 0 ? '+' : ''}{data.trends.satisfaction.percentage}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              {getTrendIcon(data.trends.responseTime.direction)}
              <span className="mr-2">اتجاه وقت الاستجابة</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold mb-1 ${getTrendColor(data.trends.responseTime.direction, false)}`}>
              {data.trends.responseTime.direction === 'stable' ? 'مستقر' : 
               data.trends.responseTime.direction === 'increasing' ? 'متزايد' : 'متناقص'}
            </div>
            {data.trends.responseTime.percentage !== 0 && (
              <div className="text-sm text-gray-600">
                {data.trends.responseTime.percentage > 0 ? '+' : ''}{data.trends.responseTime.percentage}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              {getTrendIcon(data.trends.volume.direction)}
              <span className="mr-2">اتجاه الحجم</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold mb-1 ${getTrendColor(data.trends.volume.direction, true)}`}>
              {data.trends.volume.direction === 'stable' ? 'مستقر' : 
               data.trends.volume.direction === 'increasing' ? 'متزايد' : 'متناقص'}
            </div>
            {data.trends.volume.percentage !== 0 && (
              <div className="text-sm text-gray-600">
                {data.trends.volume.percentage > 0 ? '+' : ''}{data.trends.volume.percentage}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 7-Day Overview */}
      {data.last7Days.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>نظرة عامة على آخر 7 أيام</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.last7Days.map((day, index) => (
                <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(day.date).toLocaleDateString('ar-EG', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    {index === 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        اليوم
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 space-x-reverse text-sm">
                    <div className="text-center">
                      <div className="font-medium text-blue-600">{day.responses}</div>
                      <div className="text-xs text-gray-500">ردود</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-600">{day.ratings}</div>
                      <div className="text-xs text-gray-500">تقييمات</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-purple-600">{day.satisfaction}%</div>
                      <div className="text-xs text-gray-500">رضا</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-orange-600">{formatTime(day.avgResponseTime)}</div>
                      <div className="text-xs text-gray-500">وقت</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {data.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              <span>رؤى ذكية</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.map((insight, index) => (
                <div key={index} className={`p-4 rounded-lg border ${getInsightBg(insight.type)}`}>
                  <div className="flex items-start space-x-3 space-x-reverse">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {insight.category}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          insight.priority === 'high' ? 'bg-red-100 text-red-800' :
                          insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {insight.priority === 'high' ? 'عالي' : 
                           insight.priority === 'medium' ? 'متوسط' : 'منخفض'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!data.today && data.last7Days.length === 0 && data.insights.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد رؤى متاحة</h3>
              <p className="text-gray-500">ستظهر الرؤى والاتجاهات عندما تتوفر بيانات كافية</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InsightsPanel;
