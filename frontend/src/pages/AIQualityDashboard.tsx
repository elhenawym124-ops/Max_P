import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../utils/urlHelper';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { RefreshCw, Brain, TrendingUp, AlertTriangle, CheckCircle, Target, Zap, Eye, Heart, Smile, Meh, Frown, ThumbsUp } from 'lucide-react';

interface SentimentAnalysis {
  score: number;
  level: 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied' | 'very_dissatisfied';
  confidence: number;
  keywords: string[];
  reasoning: string;
}

interface QualityEvaluation {
  messageId: string;
  conversationId: string;
  timestamp: string;
  scores: {
    relevance: number;
    accuracy: number;
    clarity: number;
    completeness: number;
    ragUsage: number;
    overall: number;
  };
  qualityLevel: 'excellent' | 'good' | 'acceptable' | 'poor' | 'very_poor';
  model: string;
  confidence: number;
  sentiment?: SentimentAnalysis | null;
  issues: string[];
  recommendations: string[];
}

interface SentimentStatistics {
  total: number;
  withSentiment: number;
  distribution: {
    very_satisfied: number;
    satisfied: number;
    neutral: number;
    dissatisfied: number;
    very_dissatisfied: number;
  };
  averageScore: number;
  trends: {
    improving: boolean;
    stable: boolean;
    declining: boolean;
  };
}

interface QualityStatistics {
  overall: {
    totalEvaluations: number;
    averageScore: number;
    qualityDistribution: {
      excellent: number;
      good: number;
      acceptable: number;
      poor: number;
      very_poor: number;
    };
    topIssues: Array<{ issue: string; count: number }>;
  };
  relevance: { average: number; trend: string };
  accuracy: { average: number; trend: string };
  clarity: { average: number; trend: string };
  completeness: { average: number; trend: string };
  ragUsage: { average: number; trend: string };
}

interface TrendsData {
  totalEvaluations: number;
  averageScore: number;
  trends: {
    relevance: { direction: string; change: number; confidence: string };
    accuracy: { direction: string; change: number; confidence: string };
    clarity: { direction: string; change: number; confidence: string };
    completeness: { direction: string; change: number; confidence: string };
    ragUsage: { direction: string; change: number; confidence: string };
  };
  insights: string[];
}

const AIQualityDashboard: React.FC = () => {
  const [statistics, setStatistics] = useState<QualityStatistics | null>(null);
  const [recentEvaluations, setRecentEvaluations] = useState<QualityEvaluation[]>([]);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [sentimentStats, setSentimentStats] = useState<SentimentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'evaluations' | 'trends' | 'sentiment'>('overview');

  const fetchData = async () => {
    try {
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      const [statsRes, recentRes, trendsRes, sentimentRes] = await Promise.all([
        fetch(buildApiUrl('ai-quality/statistics'), { headers }),
        fetch(buildApiUrl('ai-quality/recent?limit=10'), { headers }),
        fetch(buildApiUrl('ai-quality/trends?days=7'), { headers }),
        fetch(buildApiUrl('ai-quality/sentiment-analysis'), { headers })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) setStatistics(statsData.data);
      }

      if (recentRes.ok) {
        const recentData = await recentRes.json();
        if (recentData.success) setRecentEvaluations(recentData.data);
      }

      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        if (trendsData.success) setTrends(trendsData.data);
      }

      if (sentimentRes.ok) {
        const sentimentData = await sentimentRes.json();
        if (sentimentData.success) setSentimentStats(sentimentData.data);
      }

    } catch (err) {
      console.error('Error fetching AI quality data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // تحديث كل 5 دقائق (reduced from 30 seconds)
    return () => clearInterval(interval);
  }, []);

  const getQualityColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'acceptable': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-orange-600 bg-orange-100';
      case 'very_poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getQualityLabel = (level: string) => {
    switch (level) {
      case 'excellent': return 'ممتاز';
      case 'good': return 'جيد';
      case 'acceptable': return 'مقبول';
      case 'poor': return 'ضعيف';
      case 'very_poor': return 'ضعيف جداً';
      default: return 'غير معروف';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining': return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      default: return <Target className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSentimentIcon = (level: string) => {
    switch (level) {
      case 'very_satisfied': return <ThumbsUp className="w-4 h-4 text-green-600" />;
      case 'satisfied': return <Smile className="w-4 h-4 text-blue-600" />;
      case 'neutral': return <Meh className="w-4 h-4 text-gray-600" />;
      case 'dissatisfied': return <Frown className="w-4 h-4 text-orange-600" />;
      case 'very_dissatisfied': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Meh className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSentimentLabel = (level: string) => {
    switch (level) {
      case 'very_satisfied': return 'راضي جداً';
      case 'satisfied': return 'راضي';
      case 'neutral': return 'محايد';
      case 'dissatisfied': return 'غير راضي';
      case 'very_dissatisfied': return 'غاضب';
      default: return 'غير معروف';
    }
  };

  const getSentimentColor = (level: string) => {
    switch (level) {
      case 'very_satisfied': return 'text-green-600 bg-green-100';
      case 'satisfied': return 'text-blue-600 bg-blue-100';
      case 'neutral': return 'text-gray-600 bg-gray-100';
      case 'dissatisfied': return 'text-orange-600 bg-orange-100';
      case 'very_dissatisfied': return 'text-red-600 bg-red-100';
      default: return 'text-gray-400 bg-gray-50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>جاري تحميل لوحة التقييم الذكي...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2 space-x-reverse">
            <Brain className="w-8 h-8 text-purple-600" />
            <span>لوحة التقييم الذكي</span>
          </h1>
          <p className="text-gray-600 mt-1">تقييم تلقائي لجودة ردود الذكاء الاصطناعي</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-lg transition-colors ${
            loading 
              ? 'bg-gray-400 text-white cursor-not-allowed' 
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'جاري التحديث...' : 'تحديث'}</span>
        </button>
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
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">إجمالي التقييمات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{statistics.overall.totalEvaluations}</div>
              <p className="text-xs text-gray-500">تقييم تلقائي</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">متوسط الجودة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(statistics.overall.averageScore)}`}>
                {statistics.overall.averageScore}%
              </div>
              <p className="text-xs text-gray-500">من 100%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">الملاءمة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(statistics.relevance.average)}`}>
                {statistics.relevance.average}%
              </div>
              <div className="flex items-center mt-1">
                {getTrendIcon(statistics.relevance.trend)}
                <span className="text-xs text-gray-500 mr-1">{statistics.relevance.trend}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">الدقة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(statistics.accuracy.average)}`}>
                {statistics.accuracy.average}%
              </div>
              <div className="flex items-center mt-1">
                {getTrendIcon(statistics.accuracy.trend)}
                <span className="text-xs text-gray-500 mr-1">{statistics.accuracy.trend}</span>
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Heart className="w-4 h-4 ml-1 text-pink-500" />
                رضا العملاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${sentimentStats ? getScoreColor(sentimentStats.averageScore) : 'text-gray-400'}`}>
                {sentimentStats ? `${sentimentStats.averageScore}%` : '--'}
              </div>
              <div className="flex items-center mt-1">
                {sentimentStats && sentimentStats.trends.improving && (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                )}
                {sentimentStats && sentimentStats.trends.declining && (
                  <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                )}
                {sentimentStats && sentimentStats.trends.stable && (
                  <Target className="w-4 h-4 text-gray-600" />
                )}
                <span className="text-xs text-gray-500 mr-1">
                  {sentimentStats ? `${sentimentStats.withSentiment}/${sentimentStats.total}` : 'لا توجد بيانات'}
                </span>
              </div>
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
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('evaluations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'evaluations'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            آخر التقييمات
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trends'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            الاتجاهات والرؤى
          </button>
          <button
            onClick={() => setActiveTab('sentiment')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sentiment'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            😊 تحليل المشاعر
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && statistics && (
          <div className="space-y-6">
            {/* Quality Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>توزيع مستويات الجودة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(statistics.overall.qualityDistribution).map(([level, count]) => (
                    <div key={level} className="text-center">
                      <div className={`text-2xl font-bold ${getQualityColor(level).split(' ')[0]}`}>
                        {count}
                      </div>
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(level)}`}>
                        {getQualityLabel(level)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Issues */}
            {statistics.overall.topIssues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 space-x-reverse">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span>أهم المشاكل المكتشفة</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statistics.overall.topIssues.map((issue, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <span className="text-sm text-gray-700">{issue.issue}</span>
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                          {issue.count} مرة
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    الوضوح
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getScoreColor(statistics.clarity.average)}`}>
                    {statistics.clarity.average}%
                  </div>
                  <div className="flex items-center mt-1">
                    {getTrendIcon(statistics.clarity.trend)}
                    <span className="text-xs text-gray-500 mr-1">{statistics.clarity.trend}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    الاكتمال
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getScoreColor(statistics.completeness.average)}`}>
                    {statistics.completeness.average}%
                  </div>
                  <div className="flex items-center mt-1">
                    {getTrendIcon(statistics.completeness.trend)}
                    <span className="text-xs text-gray-500 mr-1">{statistics.completeness.trend}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                    <Zap className="w-4 h-4 mr-2" />
                    استخدام RAG
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getScoreColor(statistics.ragUsage.average)}`}>
                    {statistics.ragUsage.average}%
                  </div>
                  <div className="flex items-center mt-1">
                    {getTrendIcon(statistics.ragUsage.trend)}
                    <span className="text-xs text-gray-500 mr-1">{statistics.ragUsage.trend}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'evaluations' && (
          <Card>
            <CardHeader>
              <CardTitle>آخر التقييمات</CardTitle>
            </CardHeader>
            <CardContent>
              {recentEvaluations.length > 0 ? (
                <div className="space-y-4">
                  {recentEvaluations.map((evaluation) => (
                    <div key={evaluation.messageId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className="text-sm font-medium text-gray-900">
                            {evaluation.messageId}
                          </span>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(evaluation.qualityLevel)}`}>
                            {getQualityLabel(evaluation.qualityLevel)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500">
                          <span>{evaluation.model}</span>
                          <span>•</span>
                          <span>{new Date(evaluation.timestamp).toLocaleString('ar-EG')}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-3">
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getScoreColor(evaluation.scores.overall)}`}>
                            {evaluation.scores.overall}%
                          </div>
                          <div className="text-xs text-gray-500">إجمالي</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getScoreColor(evaluation.scores.relevance)}`}>
                            {evaluation.scores.relevance}%
                          </div>
                          <div className="text-xs text-gray-500">ملاءمة</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getScoreColor(evaluation.scores.accuracy)}`}>
                            {evaluation.scores.accuracy}%
                          </div>
                          <div className="text-xs text-gray-500">دقة</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getScoreColor(evaluation.scores.clarity)}`}>
                            {evaluation.scores.clarity}%
                          </div>
                          <div className="text-xs text-gray-500">وضوح</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getScoreColor(evaluation.scores.completeness)}`}>
                            {evaluation.scores.completeness}%
                          </div>
                          <div className="text-xs text-gray-500">اكتمال</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getScoreColor(evaluation.scores.ragUsage)}`}>
                            {evaluation.scores.ragUsage}%
                          </div>
                          <div className="text-xs text-gray-500">RAG</div>
                        </div>

                        {/* Sentiment Column */}
                        <div className="text-center">
                          {evaluation.sentiment ? (
                            <div>
                              <div className="flex items-center justify-center mb-1">
                                {getSentimentIcon(evaluation.sentiment.level)}
                              </div>
                              <div className={`text-sm font-bold ${getSentimentColor(evaluation.sentiment.level).split(' ')[0]}`}>
                                {evaluation.sentiment.score}%
                              </div>
                              <div className="text-xs text-gray-500">
                                {getSentimentLabel(evaluation.sentiment.level)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-sm text-gray-400">--</div>
                              <div className="text-xs text-gray-400">لا يوجد</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {evaluation.issues.length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-red-600 mb-1">المشاكل:</div>
                          <div className="flex flex-wrap gap-1">
                            {evaluation.issues.map((issue, index) => (
                              <span key={index} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                                {issue}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {evaluation.recommendations.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-blue-600 mb-1">التوصيات:</div>
                          <div className="flex flex-wrap gap-1">
                            {evaluation.recommendations.map((rec, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                {rec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد تقييمات بعد</h3>
                  <p className="text-gray-500">ستظهر التقييمات عندما يبدأ البوت في الرد على العملاء</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'trends' && trends && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تحليل الاتجاهات (آخر 7 أيام)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(trends.trends).map(([metric, trend]) => {
                    const metricNames: { [key: string]: string } = {
                      relevance: 'الملاءمة',
                      accuracy: 'الدقة',
                      clarity: 'الوضوح',
                      completeness: 'الاكتمال',
                      ragUsage: 'استخدام RAG'
                    };

                    return (
                      <div key={metric} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {metricNames[metric]}
                          </span>
                          {getTrendIcon(trend.direction)}
                        </div>
                        <div className="text-lg font-bold text-gray-900 mb-1">
                          {trend.direction === 'improving' && 'تحسن'}
                          {trend.direction === 'declining' && 'تراجع'}
                          {trend.direction === 'stable' && 'مستقر'}
                        </div>
                        <div className="text-xs text-gray-500">
                          التغيير: {trend.change > 0 ? '+' : ''}{trend.change}
                        </div>
                        <div className="text-xs text-gray-500">
                          الثقة: {trend.confidence}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {trends.insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 space-x-reverse">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <span>رؤى ذكية</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trends.insights.map((insight, index) => (
                      <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-800">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>ملخص الفترة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">إجمالي التقييمات:</span>
                      <span className="text-sm font-medium">{trends.totalEvaluations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">متوسط الجودة:</span>
                      <span className={`text-sm font-medium ${getScoreColor(trends.averageScore)}`}>
                        {trends.averageScore}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Sentiment Analysis Tab */}
        {activeTab === 'sentiment' && sentimentStats && (
          <div className="space-y-6">
            {/* Sentiment Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Heart className="w-5 h-5 ml-2 text-pink-500" />
                    إحصائيات عامة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">إجمالي التقييمات:</span>
                      <span className="text-sm font-medium">{sentimentStats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">تحليل المشاعر:</span>
                      <span className="text-sm font-medium">{sentimentStats.withSentiment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">متوسط الرضا:</span>
                      <span className={`text-sm font-medium ${getScoreColor(sentimentStats.averageScore)}`}>
                        {sentimentStats.averageScore}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 ml-2 text-blue-500" />
                    الاتجاهات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sentimentStats.trends.improving && (
                      <div className="flex items-center text-green-600">
                        <TrendingUp className="w-4 h-4 ml-2" />
                        <span className="text-sm">تحسن في الرضا</span>
                      </div>
                    )}
                    {sentimentStats.trends.declining && (
                      <div className="flex items-center text-red-600">
                        <TrendingUp className="w-4 h-4 ml-2 rotate-180" />
                        <span className="text-sm">انخفاض في الرضا</span>
                      </div>
                    )}
                    {sentimentStats.trends.stable && (
                      <div className="flex items-center text-gray-600">
                        <Target className="w-4 h-4 ml-2" />
                        <span className="text-sm">مستقر</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="w-5 h-5 ml-2 text-purple-500" />
                    نظرة سريعة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round((sentimentStats.withSentiment / sentimentStats.total) * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">معدل التحليل</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sentiment Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>توزيع مستويات الرضا</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(sentimentStats.distribution).map(([level, count]) => (
                    <div key={level} className="text-center">
                      <div className="flex flex-col items-center space-y-2">
                        {getSentimentIcon(level)}
                        <div className={`text-2xl font-bold ${getSentimentColor(level).split(' ')[0]}`}>
                          {count}
                        </div>
                        <div className="text-xs text-gray-600">{getSentimentLabel(level)}</div>
                        <div className="text-xs text-gray-500">
                          {sentimentStats.total > 0 ? Math.round((count / sentimentStats.total) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Sentiment Data */}
        {activeTab === 'sentiment' && !sentimentStats && (
          <Card>
            <CardContent className="text-center py-12">
              <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات مشاعر</h3>
              <p className="text-gray-600">لم يتم تحليل أي مشاعر بعد. ابدأ محادثة مع العملاء لرؤية التحليل.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AIQualityDashboard;
