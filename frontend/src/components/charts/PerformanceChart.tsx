import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, Clock, Zap, Brain, Target } from 'lucide-react';

interface PerformanceData {
  responseTime: {
    average: number;
    min: number;
    max: number;
    slowResponses: number;
    fastResponses: number;
    slowResponseRate: number;
  };
  contentQuality: {
    averageLength: number;
    withImages: number;
    withoutImages: number;
    imageUsageRate: number;
  };
  aiMetrics: {
    averageConfidence: number;
    ragUsage: number;
    ragUsageRate: number;
    modelDistribution: { [key: string]: number };
  };
  intentAnalysis: { [key: string]: number };
  totalResponses: number;
}

interface PerformanceChartProps {
  data: PerformanceData;
  loading?: boolean;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, loading = false }) => {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getResponseTimeStatus = (avgTime: number) => {
    if (avgTime < 2000) return { color: 'text-green-600', bg: 'bg-green-100', icon: Zap, label: 'سريع' };
    if (avgTime < 5000) return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock, label: 'متوسط' };
    return { color: 'text-red-600', bg: 'bg-red-100', icon: TrendingDown, label: 'بطيء' };
  };

  const getConfidenceStatus = (confidence: number) => {
    if (confidence >= 90) return { color: 'text-green-600', bg: 'bg-green-100', label: 'ممتاز' };
    if (confidence >= 70) return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'جيد' };
    if (confidence >= 50) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'مقبول' };
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'ضعيف' };
  };

  const responseTimeStatus = getResponseTimeStatus(data.responseTime.average);
  const confidenceStatus = getConfidenceStatus(data.aiMetrics.averageConfidence);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
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
    );
  }

  if (data.totalResponses === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد بيانات أداء</h3>
            <p className="text-gray-500">ستظهر مقاييس الأداء عندما يبدأ البوت في الرد على العملاء</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Response Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <responseTimeStatus.icon className="w-4 h-4 mr-2" />
              وقت الاستجابة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatTime(data.responseTime.average)}
            </div>
            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${responseTimeStatus.color} ${responseTimeStatus.bg}`}>
              {responseTimeStatus.label}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              أسرع: {formatTime(data.responseTime.min)} • أبطأ: {formatTime(data.responseTime.max)}
            </div>
          </CardContent>
        </Card>

        {/* AI Confidence */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              ثقة الذكاء الاصطناعي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {data.aiMetrics.averageConfidence}%
            </div>
            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${confidenceStatus.color} ${confidenceStatus.bg}`}>
              {confidenceStatus.label}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              من {data.totalResponses} رد
            </div>
          </CardContent>
        </Card>

        {/* Content Quality */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              جودة المحتوى
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {data.contentQuality.averageLength}
            </div>
            <div className="text-xs text-gray-500 mb-2">حرف متوسط</div>
            <div className="flex items-center space-x-2 space-x-reverse text-xs">
              <span className="text-blue-600">📷 {data.contentQuality.imageUsageRate}%</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">📝 {100 - data.contentQuality.imageUsageRate}%</span>
            </div>
          </CardContent>
        </Card>

        {/* RAG Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              استخدام قاعدة المعرفة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {data.aiMetrics.ragUsageRate}%
            </div>
            <div className="text-xs text-gray-500 mb-2">
              {data.aiMetrics.ragUsage} من {data.totalResponses} رد
            </div>
            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              data.aiMetrics.ragUsageRate > 50 
                ? 'text-green-600 bg-green-100' 
                : 'text-yellow-600 bg-yellow-100'
            }`}>
              {data.aiMetrics.ragUsageRate > 50 ? 'استخدام جيد' : 'يحتاج تحسين'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>توزيع أوقات الاستجابة</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">ردود سريعة (&lt; 5s)</span>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(data.responseTime.fastResponses / data.totalResponses) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-green-600">
                    {data.responseTime.fastResponses}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">ردود بطيئة (&gt; 5s)</span>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${data.responseTime.slowResponseRate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-red-600">
                    {data.responseTime.slowResponses}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intent Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Target className="w-5 h-5 text-purple-600" />
              <span>تحليل أنواع الاستفسارات</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.intentAnalysis).map(([intent, count]) => {
                const percentage = Math.round((count / data.totalResponses) * 100);
                const intentLabels: { [key: string]: string } = {
                  'price_inquiry': 'استفسارات الأسعار',
                  'product_inquiry': 'استفسارات المنتجات',
                  'shipping_inquiry': 'استفسارات الشحن',
                  'general': 'استفسارات عامة',
                  'support': 'طلبات الدعم'
                };
                
                return (
                  <div key={intent} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {intentLabels[intent] || intent}
                    </span>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-purple-600 w-8">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Distribution */}
      {Object.keys(data.aiMetrics.modelDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Brain className="w-5 h-5 text-indigo-600" />
              <span>توزيع نماذج الذكاء الاصطناعي</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.aiMetrics.modelDistribution).map(([model, count]) => {
                const percentage = Math.round((count / data.totalResponses) * 100);
                return (
                  <div key={model} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-900 mb-1">{model}</div>
                    <div className="text-2xl font-bold text-indigo-600 mb-2">{count}</div>
                    <div className="text-xs text-gray-500">{percentage}% من الردود</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerformanceChart;
