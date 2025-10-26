import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  Psychology,
  Analytics,
  Refresh,
  Timeline,
  Star,
  CheckCircle,
  Cancel,
  Info
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement
} from 'chart.js';
import successAnalyticsAPI from '../services/successAnalyticsAPI';
import PatternDetailsModal from '../components/PatternDetailsModal';
import ResponseEffectivenessCard from '../components/ResponseEffectivenessCard';

// تسجيل مكونات Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

const SuccessAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState({
    outcomeStats: null,
    patterns: [],
    responseEffectiveness: [],
    analysisResult: null
  });
  const [error, setError] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // جلب البيانات عند تحميل الصفحة
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await successAnalyticsAPI.getAllData(30);

      setData({
        outcomeStats: result.outcomeStats,
        patterns: result.patterns,
        responseEffectiveness: result.responseEffectiveness,
        analysisResult: null
      });
    } catch (err) {
      setError('فشل في جلب البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const runComprehensiveAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await successAnalyticsAPI.runComprehensiveAnalysis({ timeRange: 30 });
      setData(prev => ({ ...prev, analysisResult: result }));
    } catch (err) {
      setError('خطأ في التحليل: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePatternClick = (pattern) => {
    setSelectedPattern(pattern);
    setModalOpen(true);
  };

  const handleApprovePattern = async (patternId) => {
    try {
      await successAnalyticsAPI.approvePattern(patternId);
      await fetchAllData(); // إعادة تحميل البيانات
      setModalOpen(false);
    } catch (err) {
      setError('فشل في الموافقة على النمط: ' + err.message);
    }
  };

  const handleRejectPattern = async (patternId) => {
    try {
      await successAnalyticsAPI.rejectPattern(patternId);
      await fetchAllData(); // إعادة تحميل البيانات
      setModalOpen(false);
    } catch (err) {
      setError('فشل في رفض النمط: ' + err.message);
    }
  };

  // إعداد بيانات الرسوم البيانية
  const outcomeChartData = data.outcomeStats ? {
    labels: ['مبيعات ناجحة', 'مهجورة', 'محولة', 'محلولة'],
    datasets: [{
      data: [
        data.outcomeStats.purchase,
        data.outcomeStats.abandoned,
        data.outcomeStats.escalated,
        data.outcomeStats.resolved
      ],
      backgroundColor: ['#4caf50', '#f44336', '#ff9800', '#2196f3'],
      borderWidth: 2
    }]
  } : null;

  const effectivenessChartData = data.responseEffectiveness?.responses ? {
    labels: data.responseEffectiveness.responses.slice(0, 10).map((_, i) => `رد ${i + 1}`),
    datasets: [{
      label: 'فعالية الرد',
      data: data.responseEffectiveness.responses.slice(0, 10).map(r => r.effectivenessScore),
      borderColor: '#2196f3',
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      tension: 0.4
    }]
  } : null;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>جاري تحميل تحليلات النجاح...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* العنوان والأزرار */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Psychology sx={{ mr: 1, color: 'primary.main' }} />
            تحليلات أنماط النجاح
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            تحليل ذكي لأنماط المحادثات الناجحة وتحسين الأداء
          </Typography>
        </Box>
        
        <Box>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={fetchAllData} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={analyzing ? <CircularProgress size={20} /> : <Analytics />}
            onClick={runComprehensiveAnalysis}
            disabled={analyzing}
            sx={{ ml: 1 }}
          >
            {analyzing ? 'جاري التحليل...' : 'تشغيل تحليل شامل'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* الإحصائيات الرئيسية */}
      {data.outcomeStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CheckCircle sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{data.outcomeStats.purchase}</Typography>
                    <Typography variant="body2">مبيعات ناجحة</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUp sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{data.outcomeStats.conversionRate}%</Typography>
                    <Typography variant="body2">معدل التحويل</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Star sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h4">
                      {data.responseEffectiveness?.stats?.averageEffectiveness || '0'}
                    </Typography>
                    <Typography variant="body2">متوسط الفعالية</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Timeline sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{data.outcomeStats.totalValue}</Typography>
                    <Typography variant="body2">إجمالي القيمة (جنيه)</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        {/* رسم بياني للنتائج */}
        {outcomeChartData && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  توزيع نتائج المحادثات
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Doughnut 
                    data={outcomeChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' }
                      }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* رسم بياني لفعالية الردود */}
        {effectivenessChartData && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  فعالية الردود الأخيرة
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line 
                    data={effectivenessChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: { beginAtZero: true, max: 10 }
                      }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* الأنماط المكتشفة */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                أنماط النجاح المكتشفة
              </Typography>
              {data.patterns.length > 0 ? (
                <Grid container spacing={2}>
                  {data.patterns.map((pattern, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Card
                        variant="outlined"
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            boxShadow: 2,
                            transform: 'translateY(-2px)',
                            transition: 'all 0.2s ease'
                          }
                        }}
                        onClick={() => handlePatternClick(pattern)}
                      >
                        <CardContent>
                          <Box display="flex" justifyContent="between" alignItems="start" mb={1}>
                            <Chip
                              label={pattern.patternType}
                              color="primary"
                              size="small"
                            />
                            <Box display="flex" gap={0.5}>
                              <Chip
                                label={`${(pattern.successRate * 100).toFixed(1)}%`}
                                color="success"
                                size="small"
                              />
                              {pattern.isApproved && (
                                <Chip
                                  label="معتمد"
                                  color="success"
                                  size="small"
                                  icon={<CheckCircle />}
                                />
                              )}
                            </Box>
                          </Box>
                          <Typography variant="body2" gutterBottom>
                            {pattern.description}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={pattern.successRate * 100}
                            sx={{ mt: 1 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            عينة: {pattern.sampleSize} | ثقة: {(pattern.confidenceLevel * 100).toFixed(0)}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info" icon={<Info />}>
                  لم يتم اكتشاف أنماط كافية بعد. قم بتشغيل التحليل الشامل لاكتشاف الأنماط.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* أفضل الردود */}
        {data.responseEffectiveness?.responses && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  أفضل الردود فعالية
                </Typography>
                <Box sx={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {data.responseEffectiveness.responses.slice(0, 6).map((response) => (
                    <ResponseEffectivenessCard
                      key={response.id}
                      response={response}
                      showDetails={true}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* نتائج التحليل الشامل */}
        {data.analysisResult && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  نتائج التحليل الشامل
                </Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                  تم تشغيل التحليل الشامل بنجاح في {new Date(data.analysisResult.analysisDate).toLocaleString('ar-EG')}
                </Alert>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" gutterBottom>أنماط النجاح:</Typography>
                    <Typography variant="body2">
                      تم تحليل {data.analysisResult.successPatterns?.metadata?.totalOutcomes || 0} محادثة
                      و {data.analysisResult.successPatterns?.metadata?.totalResponses || 0} رد
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" gutterBottom>الأنماط الجديدة:</Typography>
                    <Typography variant="body2">
                      تم اكتشاف {data.analysisResult.newPatterns?.metadata?.totalDetected || 0} نمط جديد
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" gutterBottom>الإحصائيات:</Typography>
                    <Typography variant="body2">
                      معدل التحويل: {data.analysisResult.outcomeStats?.conversionRate || 0}%
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* مودال تفاصيل النمط */}
      <PatternDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        pattern={selectedPattern}
        onApprove={handleApprovePattern}
        onReject={handleRejectPattern}
      />
    </Box>
  );
};

export default SuccessAnalytics;
