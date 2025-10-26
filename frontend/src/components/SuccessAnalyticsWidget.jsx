import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Button
} from '@mui/material';
import {
  TrendingUp,
  Psychology,
  Star,
  CheckCircle,
  Refresh,
  Visibility,
  Analytics
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import successAnalyticsAPI from '../services/successAnalyticsAPI';

const SuccessAnalyticsWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuickStats();
  }, []);

  const fetchQuickStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const stats = await successAnalyticsAPI.getQuickStats();
      setData(stats);
    } catch (err) {
      setError('فشل في جلب الإحصائيات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ ml: 2 }}>جاري التحميل...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <IconButton size="small" onClick={fetchQuickStats}>
              <Refresh />
            </IconButton>
          }>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            لا توجد بيانات متاحة حالياً
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* العنوان */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <Psychology sx={{ mr: 1, color: 'primary.main' }} />
            تحليلات النجاح السريعة
          </Typography>
          <Box>
            <Tooltip title="تحديث">
              <IconButton size="small" onClick={fetchQuickStats}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="عرض التفاصيل">
              <IconButton size="small" onClick={() => navigate('/success-analytics')}>
                <Visibility />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* الإحصائيات الرئيسية */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Box textAlign="center" p={1} sx={{ bgcolor: 'success.light', borderRadius: 2 }}>
              <Typography variant="h4" color="success.contrastText">
                {data.summary.conversionRate}%
              </Typography>
              <Typography variant="caption" color="success.contrastText">
                معدل التحويل
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6}>
            <Box textAlign="center" p={1} sx={{ bgcolor: 'primary.light', borderRadius: 2 }}>
              <Typography variant="h4" color="primary.contrastText">
                {data.summary.successfulConversations}
              </Typography>
              <Typography variant="caption" color="primary.contrastText">
                محادثات ناجحة
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* القيمة الإجمالية */}
        <Box mb={3}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            القيمة الإجمالية (آخر أسبوع)
          </Typography>
          <Box display="flex" alignItems="center">
            <Typography variant="h5" color="warning.main" sx={{ mr: 1 }}>
              {data.summary.totalValue.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              جنيه
            </Typography>
          </Box>
        </Box>

        {/* أفضل الأنماط */}
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Star sx={{ mr: 1, color: 'warning.main' }} />
            أفضل الأنماط المعتمدة
          </Typography>
          
          {data.topPatterns.length > 0 ? (
            <Box>
              {data.topPatterns.slice(0, 3).map((pattern, index) => (
                <Box key={pattern.id} mb={1}>
                  <Box display="flex" justifyContent="between" alignItems="center" mb={0.5}>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      {pattern.description.substring(0, 40)}...
                    </Typography>
                    <Chip
                      label={`${(pattern.successRate * 100).toFixed(0)}%`}
                      size="small"
                      color="success"
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={pattern.successRate * 100}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              لا توجد أنماط معتمدة بعد
            </Typography>
          )}
        </Box>

        {/* معلومات إضافية */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              الأنماط النشطة
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {data.summary.activePatterns}
            </Typography>
          </Box>
          
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary">
              آخر تحديث
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {new Date().toLocaleTimeString('ar-EG', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Typography>
          </Box>
        </Box>

        {/* أزرار الإجراءات */}
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              startIcon={<Analytics />}
              onClick={() => navigate('/success-analytics')}
            >
              التحليلات
            </Button>
          </Grid>
          
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              startIcon={<CheckCircle />}
              onClick={() => navigate('/pattern-management')}
            >
              إدارة الأنماط
            </Button>
          </Grid>
        </Grid>

        {/* مؤشر الأداء */}
        <Box mt={2} p={1} sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            مؤشر الأداء العام
          </Typography>
          <Box display="flex" alignItems="center">
            <LinearProgress
              variant="determinate"
              value={parseFloat(data.summary.conversionRate)}
              sx={{ flexGrow: 1, mr: 1, height: 6, borderRadius: 3 }}
              color={
                parseFloat(data.summary.conversionRate) >= 80 ? 'success' :
                parseFloat(data.summary.conversionRate) >= 60 ? 'warning' : 'error'
              }
            />
            <Typography variant="caption" fontWeight="bold">
              {parseFloat(data.summary.conversionRate) >= 80 ? 'ممتاز' :
               parseFloat(data.summary.conversionRate) >= 60 ? 'جيد' : 'يحتاج تحسين'}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SuccessAnalyticsWidget;
