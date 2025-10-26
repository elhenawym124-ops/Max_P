import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  Pagination,
  TableSortLabel
} from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  Add,
  FilterList,
  Refresh,
  Download,
  Psychology,
  Search,
  Analytics,
  Settings,
  TrendingUp,
  Compare,
  AutoAwesome,
  PlayArrow,
  CleaningServices,
  GroupWork,
  Stop,
  BarChart,
  RemoveCircle,
  Error
} from '@mui/icons-material';
import successAnalyticsAPI from '../services/successAnalyticsAPI';
import PatternDetailsModal from '../components/PatternDetailsModal';

const PatternManagement = () => {
  const navigate = useNavigate();
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    patternType: '',
    isActive: '',
    isApproved: ''
  });

  // New state for enhanced features
  const [performance, setPerformance] = useState(null);
  const [usage, setUsage] = useState(null);
  const [summary, setSummary] = useState(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatterns, setSelectedPatterns] = useState([]);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false); // إيقاف التحديث التلقائي افتراضياً
  const [refreshInterval, setRefreshInterval] = useState(60); // زيادة الفترة إلى دقيقة

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [sortBy, setSortBy] = useState('successRate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [groupSimilar, setGroupSimilar] = useState(false);
  const [cleanupStats, setCleanupStats] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [previousPatternCount, setPreviousPatternCount] = useState(0);
  const [newPatternsDetected, setNewPatternsDetected] = useState(false);

  // فحص المصادقة عند تحميل الصفحة
  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) {
      console.log('🚫 [PatternManagement] No token found, redirecting to login');
      navigate('/auth/login');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchAllData(true); // Reset to first page
    fetchSystemStatus();
  }, [filters]);

  // تحديث دوري لحالة النظام كل 30 ثانية
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 [Frontend] تحديث دوري لحالة النظام...');
      fetchSystemStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    let intervalId;

    if (autoRefresh) {
      console.log(`🔄 [PatternManagement] Auto-refresh enabled - updating every ${refreshInterval} seconds`);

      intervalId = setInterval(() => {
        console.log('⏰ [PatternManagement] Auto-refresh triggered');
        fetchAllData();
        setLastUpdate(new Date());
      }, refreshInterval * 1000); // Convert seconds to milliseconds
    }

    return () => {
      if (intervalId) {
        console.log('🛑 [PatternManagement] Auto-refresh disabled');
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, filters]);

  const fetchAllData = async (resetPage = false) => {
    console.log('🔄 [PatternManagement] Starting data fetch...');
    setLoading(true);
    setError(null);

    try {
      const currentPage = resetPage ? 1 : pagination.page;

      console.log('📊 [PatternManagement] Fetching patterns with filters:', {
        ...filters,
        page: currentPage,
        limit: pagination.limit,
        sortBy,
        sortOrder
      });

      // Fetch patterns with enhanced data and pagination
      const [patternsResult, performanceResult, usageResult] = await Promise.all([
        successAnalyticsAPI.getPatterns({
          ...filters,
          page: currentPage,
          limit: pagination.limit,
          sortBy,
          sortOrder
        }),
        successAnalyticsAPI.getPatternPerformance(),
        successAnalyticsAPI.getPatternUsage({ days: 30 })
      ]);

      console.log('✅ [PatternManagement] Patterns fetched:', {
        count: patternsResult.patterns?.length || 0,
        pagination: patternsResult.pagination,
        patterns: patternsResult.patterns?.slice(0, 3).map(p => ({ id: p.id, description: p.description.substring(0, 50) }))
      });

      setPatterns(patternsResult.patterns || []);
      setPerformance(performanceResult);
      setUsage(usageResult);

      // Update pagination info
      if (patternsResult.pagination) {
        setPagination(patternsResult.pagination);
      }

      // Check for new patterns (only on first page)
      if (currentPage === 1) {
        const currentPatternCount = patternsResult.pagination?.total || patternsResult.patterns?.length || 0;
        if (previousPatternCount > 0 && currentPatternCount > previousPatternCount) {
          const newPatternsCount = currentPatternCount - previousPatternCount;
          console.log(`🆕 [PatternManagement] Detected ${newPatternsCount} new patterns!`);
          setNewPatternsDetected(true);

          // Show notification for 5 seconds
          setTimeout(() => setNewPatternsDetected(false), 5000);
        }
        setPreviousPatternCount(currentPatternCount);
      }

      // Calculate summary
      const totalPatterns = patternsResult.pagination?.total || patternsResult.patterns?.length || 0;
      const activePatterns = patternsResult.patterns?.filter(p => p.isActive && p.isApproved).length || 0;
      const avgPerformance = performanceResult.summary?.avgSuccessRate || 0;

      setSummary({
        totalPatterns,
        activePatterns,
        avgPerformance,
        totalUsage: performanceResult.summary?.totalUsage || 0
      });

    } catch (err) {
      setError('فشل في جلب البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatterns = fetchAllData; // Keep backward compatibility

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handleSortChange = (newSortBy, newSortOrder = 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Effect to fetch data when pagination or sorting changes
  useEffect(() => {
    fetchAllData();
  }, [pagination.page, pagination.limit, sortBy, sortOrder]);

  const handlePatternClick = (pattern) => {
    setSelectedPattern(pattern);
    setModalOpen(true);
  };

  const handleApprovePattern = async (patternId) => {
    try {
      await successAnalyticsAPI.approvePattern(patternId);
      await fetchPatterns();
      setModalOpen(false);
    } catch (err) {
      setError('فشل في الموافقة على النمط: ' + err.message);
    }
  };

  const handleUnapprovePattern = async (patternId) => {
    try {
      await successAnalyticsAPI.unapprovePattern(patternId);
      await fetchPatterns();
      setModalOpen(false);
    } catch (err) {
      setError('فشل في إيقاف اعتماد النمط: ' + err.message);
    }
  };

  const handleRejectPattern = async (patternId) => {
    try {
      await successAnalyticsAPI.rejectPattern(patternId);
      await fetchPatterns();
      setModalOpen(false);
    } catch (err) {
      setError('فشل في رفض النمط: ' + err.message);
    }
  };

  const handleDeletePattern = async (patternId, patternDescription) => {
    // تأكيد الحذف
    const confirmDelete = window.confirm(
      `هل أنت متأكد من حذف هذا النمط نهائياً؟\n\n"${patternDescription.substring(0, 100)}..."\n\nلا يمكن التراجع عن هذا الإجراء.`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await successAnalyticsAPI.deletePattern(patternId, 'تم الحذف من واجهة الإدارة');
      await fetchPatterns();
      setModalOpen(false);

      // إظهار رسالة نجاح
      setError(null);
      // يمكن إضافة toast notification هنا

    } catch (err) {
      setError('فشل في حذف النمط: ' + err.message);
    }
  };

  const handleTestPattern = async (pattern) => {
    if (!testMessage.trim()) {
      setError('يرجى إدخال رسالة للاختبار');
      return;
    }

    try {
      // لا نحتاج لتمرير companyId - سيتم استخدامه من المصادقة في Backend
      const result = await successAnalyticsAPI.testPattern(pattern.id, testMessage);
      setTestResult(result);
    } catch (err) {
      setError('فشل في اختبار النمط: ' + err.message);
    }
  };

  const openTestModal = (pattern) => {
    setSelectedPattern(pattern);
    setTestModalOpen(true);
    setTestMessage('مرحباً، كيف يمكنني مساعدتك؟');
    setTestResult(null);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const exportPatterns = async () => {
    try {
      const data = await successAnalyticsAPI.exportData('csv', 30);
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patterns-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('فشل في تصدير البيانات: ' + err.message);
    }
  };

  const analyzeNewPatterns = async () => {
    try {
      setLoading(true);
      // استدعاء API لتحليل أنماط جديدة
      await successAnalyticsAPI.analyzeNewPatterns();
      await fetchPatterns(); // تحديث البيانات
      setError(null);
    } catch (err) {
      setError('فشل في تحليل الأنماط الجديدة: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedPatterns(patterns.map(p => p.id));
    } else {
      setSelectedPatterns([]);
    }
  };

  const handleSelectPattern = (patternId) => {
    setSelectedPatterns(prev =>
      prev.includes(patternId)
        ? prev.filter(id => id !== patternId)
        : [...prev, patternId]
    );
  };

  const handleBulkApprove = async () => {
    try {
      setLoading(true);
      for (const patternId of selectedPatterns) {
        await successAnalyticsAPI.approvePattern(patternId);
      }
      await fetchPatterns();
      setSelectedPatterns([]);
      setError(null);
    } catch (err) {
      setError('فشل في اعتماد الأنماط: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUnapprove = async () => {
    try {
      setLoading(true);
      for (const patternId of selectedPatterns) {
        await successAnalyticsAPI.unapprovePattern(patternId);
      }
      await fetchPatterns();
      setSelectedPatterns([]);
      setError(null);
    } catch (err) {
      setError('فشل في إيقاف اعتماد الأنماط: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // جلب حالة النظام
  const fetchSystemStatus = async () => {
    try {
      console.log('🔄 [Frontend] جاري جلب حالة النظام...');
      setSystemLoading(true);
      const status = await successAnalyticsAPI.getPatternSystemStatus();
      console.log('📊 [Frontend] حالة النظام المستلمة:', status);
      setSystemStatus(status);
      console.log('✅ [Frontend] تم تحديث حالة النظام في الواجهة');
    } catch (err) {
      console.error('❌ [Frontend] خطأ في جلب حالة النظام:', err);
    } finally {
      setSystemLoading(false);
    }
  };

  // تفعيل النظام
  const handleEnableSystem = async () => {
    try {
      console.log('🚀 [Frontend] بدء تفعيل النظام...');
      setSystemLoading(true);

      const result = await successAnalyticsAPI.enablePatternSystem();
      console.log('✅ [Frontend] نتيجة التفعيل:', result);

      await fetchSystemStatus();
      await fetchPatterns();
      setError(null);

      console.log('🎉 [Frontend] تم تفعيل النظام بنجاح');
    } catch (err) {
      console.error('❌ [Frontend] فشل في تفعيل النظام:', err);
      setError('فشل في تفعيل النظام: ' + err.message);
    } finally {
      setSystemLoading(false);
    }
  };

  // إيقاف النظام
  const handleDisableSystem = async () => {
    try {
      console.log('🛑 [Frontend] بدء إيقاف النظام...');
      setSystemLoading(true);

      const result = await successAnalyticsAPI.disablePatternSystem(null, 'تم الإيقاف من الواجهة');
      console.log('✅ [Frontend] نتيجة الإيقاف:', result);

      // انتظار قصير للتأكد من تحديث قاعدة البيانات
      await new Promise(resolve => setTimeout(resolve, 1000));

      await fetchSystemStatus();
      await fetchPatterns();
      setError(null);

      console.log('🎉 [Frontend] تم إيقاف النظام بنجاح');
    } catch (err) {
      console.error('❌ [Frontend] فشل في إيقاف النظام:', err);
      setError('فشل في إيقاف النظام: ' + err.message);
    } finally {
      setSystemLoading(false);
    }
  };

  const handleComparePatterns = () => {
    if (selectedPatterns.length >= 2) {
      // فتح مودال المقارنة
      console.log('مقارنة الأنماط:', selectedPatterns);
    }
  };

  const getPatternTypeIcon = (type) => {
    switch (type) {
      case 'word_usage': return '📝';
      case 'timing': return '⏰';
      case 'response_style': return '🎨';
      case 'emotional_tone': return '😊';
      default: return '🔍';
    }
  };

  const getPatternTypeName = (type) => {
    switch (type) {
      case 'word_usage': return 'استخدام الكلمات';
      case 'timing': return 'التوقيت';
      case 'response_style': return 'أسلوب الرد';
      case 'emotional_tone': return 'النبرة العاطفية';
      default: return type;
    }
  };

  const getSuccessRateColor = (rate) => {
    if (rate >= 0.8) return 'success';
    if (rate >= 0.6) return 'warning';
    return 'error';
  };

  // تجميع الأنماط المتشابهة
  const groupSimilarPatterns = (patterns) => {
    if (!groupSimilar) return patterns;

    const grouped = {};

    patterns.forEach(pattern => {
      const key = `${pattern.patternType}_${Math.round(pattern.successRate * 100)}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(pattern);
    });

    // تحويل المجموعات إلى أنماط مدمجة
    const mergedPatterns = [];

    Object.entries(grouped).forEach(([key, group]) => {
      if (group.length === 1) {
        mergedPatterns.push(group[0]);
      } else {
        // دمج الأنماط المتشابهة
        const merged = {
          ...group[0],
          id: `merged_${key}`,
          description: `${group.length} أنماط متشابهة: ${group[0].description.substring(0, 50)}...`,
          sampleSize: group.reduce((sum, p) => sum + (p.sampleSize || 0), 0),
          isGroup: true,
          groupCount: group.length,
          groupPatterns: group
        };
        mergedPatterns.push(merged);
      }
    });

    return mergedPatterns;
  };

  // تنظيف الأنماط المكررة
  const cleanupDuplicatePatterns = async () => {
    try {
      setCleanupLoading(true);
      // لا نحتاج لتمرير companyId - سيتم استخدامه من المصادقة في Backend
      const response = await fetch(`/api/v1/success-learning/cleanup-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({ dryRun: false })
      });

      const result = await response.json();

      if (result.success) {
        await fetchAllData(); // إعادة تحميل البيانات
        setError(null);
        alert(`تم تنظيف ${result.patternsDeleted} نمط مكرر بنجاح!`);
      } else {
        setError('فشل في تنظيف الأنماط: ' + result.error);
      }
    } catch (err) {
      setError('خطأ في تنظيف الأنماط: ' + err.message);
    } finally {
      setCleanupLoading(false);
    }
  };

  const getPatternPerformance = (patternId) => {
    if (!performance || !performance.performance) return null;
    return performance.performance.find(p => p.pattern.id === patternId);
  };

  const getPatternUsage = (patternId) => {
    if (!usage || !usage.usage) return null;
    return usage.usage.find(u => u.patternId === patternId);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>جاري تحميل الأنماط...</Typography>
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
            إدارة أنماط النجاح
            {autoRefresh && (
              <Chip
                label="تحديث تلقائي"
                size="small"
                color="success"
                sx={{
                  ml: 2,
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                    '100%': { opacity: 1 }
                  }
                }}
              />
            )}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            إدارة ومراجعة الأنماط المكتشفة من تحليل المحادثات
            {autoRefresh && (
              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'success.main' }}>
                • آخر تحديث: {lastUpdate.toLocaleTimeString('ar-EG')}
              </Typography>
            )}
          </Typography>
        </Box>

        {/* شريط حالة النظام */}
        {systemStatus && (
          <Card sx={{
            mb: 2,
            bgcolor: systemStatus.enabled ? 'success.light' : 'error.light',
            color: systemStatus.enabled ? 'success.contrastText' : 'error.contrastText'
          }}>
            <CardContent sx={{ py: 1 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  <Chip
                    icon={systemStatus.enabled ? <CheckCircle /> : <Stop />}
                    label={systemStatus.enabled ? 'النظام مفعل' : 'النظام معطل'}
                    color={systemStatus.enabled ? 'success' : 'error'}
                    size="small"
                    sx={{ mr: 2 }}
                  />
                  <Typography variant="body2">
                    {systemStatus.enabled
                      ? `${systemStatus.activePatterns} نمط نشط من أصل ${systemStatus.totalPatterns}`
                      : `${systemStatus.totalPatterns} نمط معطل`
                    }
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<Refresh />}
                    onClick={fetchSystemStatus}
                    disabled={systemLoading}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    تحديث
                  </Button>

                  {systemStatus.enabled ? (
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={systemLoading ? <CircularProgress size={16} /> : <Stop />}
                      onClick={handleDisableSystem}
                      disabled={systemLoading}
                    >
                      إيقاف النظام
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      color="success"
                      startIcon={systemLoading ? <CircularProgress size={16} /> : <PlayArrow />}
                      onClick={handleEnableSystem}
                      disabled={systemLoading}
                    >
                      تفعيل النظام
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* إشعار الأنماط الجديدة */}
        {newPatternsDetected && (
          <Alert
            severity="success"
            sx={{
              mb: 2,
              animation: 'slideIn 0.5s ease-out',
              '@keyframes slideIn': {
                '0%': { transform: 'translateY(-20px)', opacity: 0 },
                '100%': { transform: 'translateY(0)', opacity: 1 }
              }
            }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setNewPatternsDetected(false)}
              >
                <Cancel fontSize="inherit" />
              </IconButton>
            }
          >
            🎉 تم اكتشاف أنماط جديدة! تحقق من الأنماط التي تحتاج موافقة.
          </Alert>
        )}

        <Box>
          <Tooltip title="إنشاء نمط جديد">
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setSettingsModalOpen(true)}
              sx={{ mr: 1 }}
            >
              إنشاء نمط
            </Button>
          </Tooltip>

          <Tooltip title="تحليل أنماط جديدة">
            <Button
              variant="outlined"
              startIcon={<AutoAwesome />}
              onClick={analyzeNewPatterns}
              sx={{ mr: 1 }}
            >
              تحليل جديد
            </Button>
          </Tooltip>

          <Tooltip title="عرض الإحصائيات">
            <IconButton onClick={() => setAnalyticsModalOpen(true)}>
              <BarChart />
            </IconButton>
          </Tooltip>

          <Tooltip title="تحديث البيانات">
            <IconButton onClick={fetchPatterns} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>

          <Tooltip title="تنظيف الأنماط المكررة">
            <IconButton
              onClick={cleanupDuplicatePatterns}
              disabled={cleanupLoading}
              color="warning"
            >
              <CleaningServices />
            </IconButton>
          </Tooltip>

          <Tooltip title={groupSimilar ? "إلغاء التجميع" : "تجميع المتشابهة"}>
            <IconButton
              onClick={() => setGroupSimilar(!groupSimilar)}
              color={groupSimilar ? "primary" : "default"}
            >
              <GroupWork />
            </IconButton>
          </Tooltip>

          <Tooltip title="تحديث قوي (مسح الكاش)">
            <IconButton
              onClick={() => {
                // مسح الكاش وإعادة تحميل البيانات
                localStorage.removeItem('patterns_cache');
                window.location.reload();
              }}
              disabled={loading}
              sx={{ color: 'orange' }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>

          <Tooltip title={autoRefresh ? "إيقاف التحديث التلقائي" : "تفعيل التحديث التلقائي"}>
            <IconButton
              onClick={() => setAutoRefresh(!autoRefresh)}
              sx={{
                color: autoRefresh ? 'success.main' : 'text.secondary',
                animation: autoRefresh ? 'pulse 2s infinite' : 'none'
              }}
            >
              <AutoAwesome />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportPatterns}
            sx={{ ml: 1 }}
          >
            تصدير
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Real-time Status Bar */}
      {autoRefresh && (
        <Card sx={{ mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
          <CardContent sx={{ py: 1 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center">
                <AutoAwesome sx={{
                  mr: 1,
                  animation: 'spin 2s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }} />
                <Typography variant="body2">
                  التحديث التلقائي مفعل - يتم التحديث كل {refreshInterval} ثانية
                </Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <Typography variant="caption" sx={{ mr: 2 }}>
                  آخر تحديث: {lastUpdate.toLocaleTimeString('ar-EG')}
                </Typography>
                <Chip
                  label={`${patterns.length} نمط`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إجمالي الأنماط
                </Typography>
                <Typography variant="h3" fontWeight="bold">
                  {summary.totalPatterns}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  أنماط مكتشفة
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  الأنماط النشطة
                </Typography>
                <Typography variant="h3" fontWeight="bold">
                  {summary.activePatterns}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  معتمدة ونشطة
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  متوسط الأداء
                </Typography>
                <Typography variant="h3" fontWeight="bold">
                  {Math.round(summary.avgPerformance)}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  معدل النجاح
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إجمالي الاستخدام
                </Typography>
                <Typography variant="h3" fontWeight="bold">
                  {summary.totalUsage}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  مرة تطبيق
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* البحث والفلاتر */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterList sx={{ mr: 1 }} />
            البحث والفلاتر
          </Typography>

          <Grid container spacing={2}>
            {/* شريط البحث */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                placeholder="البحث في الأنماط..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" gap={1}>
                <Button
                  variant={selectedPatterns.length > 0 ? "contained" : "outlined"}
                  size="small"
                  startIcon={<CheckCircle />}
                  onClick={handleBulkApprove}
                  disabled={selectedPatterns.length === 0}
                >
                  اعتماد المحدد ({selectedPatterns.length})
                </Button>

                <Button
                  variant="outlined"
                  size="small"
                  color="warning"
                  startIcon={<RemoveCircle />}
                  onClick={handleBulkUnapprove}
                  disabled={selectedPatterns.length === 0}
                >
                  إيقاف اعتماد المحدد ({selectedPatterns.length})
                </Button>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Compare />}
                  onClick={handleComparePatterns}
                  disabled={selectedPatterns.length < 2}
                >
                  مقارنة
                </Button>
              </Box>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع النمط</InputLabel>
                <Select
                  value={filters.patternType}
                  label="نوع النمط"
                  onChange={(e) => handleFilterChange('patternType', e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="word_usage">استخدام الكلمات</MenuItem>
                  <MenuItem value="timing">التوقيت</MenuItem>
                  <MenuItem value="response_style">أسلوب الرد</MenuItem>
                  <MenuItem value="emotional_tone">النبرة العاطفية</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={filters.isActive}
                  label="الحالة"
                  onChange={(e) => handleFilterChange('isActive', e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="true">نشط</MenuItem>
                  <MenuItem value="false">غير نشط</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>الاعتماد</InputLabel>
                <Select
                  value={filters.isApproved}
                  label="الاعتماد"
                  onChange={(e) => handleFilterChange('isApproved', e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="true">معتمد</MenuItem>
                  <MenuItem value="false">غير معتمد</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* جدول الأنماط */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              الأنماط المكتشفة ({pagination.total || patterns.length})
            </Typography>

            <Box display="flex" alignItems="center" gap={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>عدد العناصر</InputLabel>
                <Select
                  value={pagination.limit}
                  label="عدد العناصر"
                  onChange={(e) => handleLimitChange(e.target.value)}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>ترتيب حسب</InputLabel>
                <Select
                  value={sortBy}
                  label="ترتيب حسب"
                  onChange={(e) => handleSortChange(e.target.value, sortOrder)}
                >
                  <MenuItem value="successRate">معدل النجاح</MenuItem>
                  <MenuItem value="createdAt">تاريخ الإنشاء</MenuItem>
                  <MenuItem value="sampleSize">حجم العينة</MenuItem>
                </Select>
              </FormControl>

              <Button
                size="small"
                onClick={() => handleSortChange(sortBy, sortOrder === 'desc' ? 'asc' : 'desc')}
                startIcon={sortOrder === 'desc' ? '↓' : '↑'}
              >
                {sortOrder === 'desc' ? 'تنازلي' : 'تصاعدي'}
              </Button>
            </Box>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Switch
                      checked={selectedPatterns.length === patterns.length && patterns.length > 0}
                      indeterminate={
                        selectedPatterns.length > 0 && selectedPatterns.length < patterns.length
                          ? true
                          : undefined
                      }
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الوصف</TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortBy === 'successRate'}
                      direction={sortBy === 'successRate' ? sortOrder : 'desc'}
                      onClick={() => handleSortChange('successRate', sortBy === 'successRate' && sortOrder === 'desc' ? 'asc' : 'desc')}
                    >
                      معدل النجاح
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortBy === 'sampleSize'}
                      direction={sortBy === 'sampleSize' ? sortOrder : 'desc'}
                      onClick={() => handleSortChange('sampleSize', sortBy === 'sampleSize' && sortOrder === 'desc' ? 'asc' : 'desc')}
                    >
                      حجم العينة
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">مستوى الثقة</TableCell>
                  <TableCell align="center">الاستخدام</TableCell>
                  <TableCell align="center">الأداء الحالي</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                  <TableCell align="center">الاعتماد</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupSimilarPatterns(patterns).filter(pattern =>
                  searchTerm === '' ||
                  pattern.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  getPatternTypeName(pattern.patternType).toLowerCase().includes(searchTerm.toLowerCase())
                ).map((pattern) => (
                  <TableRow
                    key={pattern.id}
                    hover
                    selected={selectedPatterns.includes(pattern.id)}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handlePatternClick(pattern)}
                  >
                    <TableCell padding="checkbox">
                      <Switch
                        checked={selectedPatterns.includes(pattern.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectPattern(pattern.id);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <span style={{ marginLeft: 8 }}>
                          {pattern.isGroup ? '📦' : getPatternTypeIcon(pattern.patternType)}
                        </span>
                        {pattern.isGroup ?
                          `${getPatternTypeName(pattern.patternType)} (${pattern.groupCount})` :
                          getPatternTypeName(pattern.patternType)
                        }
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Tooltip
                        title={pattern.description.length > 200 ? pattern.description : ''}
                        placement="top"
                        arrow
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 500,
                            wordWrap: 'break-word',
                            whiteSpace: 'normal',
                            lineHeight: 1.4,
                            cursor: pattern.description.length > 200 ? 'help' : 'default'
                          }}
                        >
                          {pattern.description}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Chip
                        label={`${(pattern.successRate * 100).toFixed(1)}%`}
                        color={getSuccessRateColor(pattern.successRate)}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell align="center">
                      {pattern.sampleSize}
                    </TableCell>
                    
                    <TableCell align="center">
                      {(pattern.confidenceLevel * 100).toFixed(0)}%
                    </TableCell>

                    <TableCell align="center">
                      {(() => {
                        const patternUsage = getPatternUsage(pattern.id);
                        return patternUsage ? (
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {patternUsage.totalUsage}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              مرة
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        );
                      })()}
                    </TableCell>

                    <TableCell align="center">
                      {(() => {
                        const patternPerf = getPatternPerformance(pattern.id);
                        return patternPerf ? (
                          <Box>
                            <Chip
                              label={`${(patternPerf.currentSuccessRate * 100).toFixed(1)}%`}
                              color={getSuccessRateColor(patternPerf.currentSuccessRate)}
                              size="small"
                            />
                            <Typography variant="caption" display="block" color="text.secondary">
                              {patternPerf.performanceTrend === 'up' ? '📈' :
                               patternPerf.performanceTrend === 'down' ? '📉' : '➡️'}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        );
                      })()}
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={pattern.isActive ? 'نشط' : 'غير نشط'}
                        color={pattern.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={pattern.isApproved ? 'معتمد' : 'غير معتمد'}
                        color={pattern.isApproved ? 'success' : 'warning'}
                        size="small"
                        icon={pattern.isApproved ? <CheckCircle /> : <Cancel />}
                      />
                    </TableCell>
                    
                    <TableCell align="center">
                      <Tooltip title="عرض التفاصيل">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePatternClick(pattern);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="اختبار النمط">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTestModal(pattern);
                          }}
                        >
                          <Psychology />
                        </IconButton>
                      </Tooltip>
                      
                      {!pattern.isApproved && (
                        <>
                          <Tooltip title="اعتماد">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprovePattern(pattern.id);
                              }}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="رفض">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectPattern(pattern.id);
                              }}
                            >
                              <Cancel />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}

                      {pattern.isApproved && (
                        <Tooltip title="إيقاف الاعتماد">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnapprovePattern(pattern.id);
                            }}
                          >
                            <RemoveCircle />
                          </IconButton>
                        </Tooltip>
                      )}

                      <Tooltip title="حذف نهائي">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePattern(pattern.id, pattern.description);
                          }}
                          sx={{ ml: 0.5 }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {patterns.length === 0 && !loading && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                لا توجد أنماط مطابقة للفلاتر المحددة
              </Typography>
            </Box>
          )}

          {/* التنقل بين الصفحات */}
          {pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
              <Typography variant="body2" color="text.secondary">
                عرض {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} من {pagination.total} نمط
              </Typography>

              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={(event, page) => handlePageChange(page)}
                color="primary"
                showFirstButton
                showLastButton
                siblingCount={1}
                boundaryCount={1}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* مودال تفاصيل النمط */}
      <PatternDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        pattern={selectedPattern}
        onApprove={handleApprovePattern}
        onReject={handleRejectPattern}
      />

      {/* مودال اختبار النمط */}
      <Dialog
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          اختبار النمط: {selectedPattern?.description}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="رسالة تجريبية"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="أدخل رسالة لاختبار تأثير النمط عليها..."
              sx={{ mb: 3 }}
            />

            {testResult && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  النتيجة:
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    الرسالة الأصلية:
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography>{testResult.originalMessage}</Typography>
                  </Paper>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    الرسالة المحسنة:
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                    <Typography>{testResult.optimizedMessage}</Typography>
                  </Paper>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    التحسينات:
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        تغيير الطول: {testResult.improvement.lengthChange > 0 ? '+' : ''}{testResult.improvement.lengthChange} حرف
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        كلمات مضافة: {testResult.improvement.wordsAdded > 0 ? '+' : ''}{testResult.improvement.wordsAdded}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestModalOpen(false)}>
            إغلاق
          </Button>
          <Button
            variant="contained"
            onClick={() => handleTestPattern(selectedPattern)}
            disabled={!testMessage.trim()}
          >
            اختبار النمط
          </Button>
        </DialogActions>
      </Dialog>

      {/* مودال الإحصائيات المتقدمة */}
      <Dialog
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <BarChart sx={{ mr: 1 }} />
            الإحصائيات المتقدمة
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    توزيع أنواع الأنماط
                  </Typography>
                  <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">
                      مخطط بياني قريباً...
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    اتجاهات الأداء
                  </Typography>
                  <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">
                      مخطط خطي قريباً...
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    أفضل الأنماط أداءً
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>النمط</TableCell>
                        <TableCell align="center">معدل النجاح</TableCell>
                        <TableCell align="center">عدد الاستخدامات</TableCell>
                        <TableCell align="center">ROI</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {patterns
                        .sort((a, b) => b.successRate - a.successRate)
                        .slice(0, 5)
                        .map((pattern) => (
                          <TableRow key={pattern.id}>
                            <TableCell>{pattern.description}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${(pattern.successRate * 100).toFixed(1)}%`}
                                color={getSuccessRateColor(pattern.successRate)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              {getPatternUsage(pattern.id)?.totalUsage || 0}
                            </TableCell>
                            <TableCell align="center">
                              {getPatternPerformance(pattern.id)?.roi ?
                                `${getPatternPerformance(pattern.id).roi.toFixed(1)}%` : 'N/A'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalyticsModalOpen(false)}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* مودال إنشاء نمط جديد */}
      <Dialog
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Add sx={{ mr: 1 }} />
            إنشاء نمط جديد
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            هذه الميزة قيد التطوير. حالياً يتم اكتشاف الأنماط تلقائياً من تحليل المحادثات.
          </Alert>

          <Typography variant="body2" color="text.secondary">
            يمكنك استخدام زر "تحليل جديد" لاكتشاف أنماط جديدة من المحادثات الحديثة.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsModalOpen(false)}>
            إغلاق
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setSettingsModalOpen(false);
              analyzeNewPatterns();
            }}
          >
            تحليل أنماط جديدة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatternManagement;
