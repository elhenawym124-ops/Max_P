/**
 * صفحة إدارة الاكتشاف التلقائي للأنماط
 * Auto Pattern Detection Management Page
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Settings,
  Timeline,
  CheckCircle,
  Error,
  Schedule
} from '@mui/icons-material';

const AutoPatternManagement = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [intervalDialog, setIntervalDialog] = useState(false);
  const [newInterval, setNewInterval] = useState(120);
  const [detecting, setDetecting] = useState(false);

  // جلب حالة الخدمة
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/auto-patterns/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('فشل في جلب حالة الخدمة');
      console.error('Error fetching status:', err);
    } finally {
      setLoading(false);
    }
  };

  // بدء الخدمة
  const startService = async () => {
    try {
      const response = await fetch('/api/v1/auto-patterns/start', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchStatus();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('فشل في بدء الخدمة');
    }
  };

  // إيقاف الخدمة
  const stopService = async () => {
    try {
      const response = await fetch('/api/v1/auto-patterns/stop', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchStatus();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('فشل في إيقاف الخدمة');
    }
  };

  // تشغيل اكتشاف فوري
  const runImmediateDetection = async () => {
    try {
      setDetecting(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/auto-patterns/detect-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchStatus();
        alert(`تم الاكتشاف بنجاح! تم العثور على ${data.data.newPatterns || 0} نمط جديد`);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('فشل في تشغيل الاكتشاف الفوري');
    } finally {
      setDetecting(false);
    }
  };

  // تغيير فترة الاكتشاف
  const changeInterval = async () => {
    try {
      const response = await fetch('/api/v1/auto-patterns/interval', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          minutes: newInterval
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setIntervalDialog(false);
        await fetchStatus();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('فشل في تغيير فترة الاكتشاف');
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // تحديث الحالة كل 30 ثانية
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        🤖 إدارة الاكتشاف التلقائي للأنماط
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* حالة الخدمة */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 حالة الخدمة
              </Typography>
              
              <Box display="flex" alignItems="center" mb={2}>
                {status?.isRunning ? (
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                ) : (
                  <Error color="error" sx={{ mr: 1 }} />
                )}
                <Typography variant="body1">
                  {status?.isRunning ? 'تعمل' : 'متوقفة'}
                </Typography>
              </Box>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                فترة الاكتشاف: {status?.intervalMinutes} دقيقة
              </Typography>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                الشركات المراقبة: {status?.companies?.length || 0}
              </Typography>

              {status?.lastDetection && (
                <Typography variant="body2" color="textSecondary">
                  آخر اكتشاف: منذ {status.lastDetectionAgo} دقيقة
                </Typography>
              )}

              <Box mt={2}>
                <Button
                  variant="contained"
                  color={status?.isRunning ? "error" : "primary"}
                  startIcon={status?.isRunning ? <Stop /> : <PlayArrow />}
                  onClick={status?.isRunning ? stopService : startService}
                  sx={{ mr: 1 }}
                >
                  {status?.isRunning ? 'إيقاف' : 'بدء'}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchStatus}
                >
                  تحديث
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* الإعدادات */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚙️ الإعدادات
              </Typography>

              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => {
                  setNewInterval(status?.intervalMinutes || 120);
                  setIntervalDialog(true);
                }}
                fullWidth
                sx={{ mb: 2 }}
              >
                تغيير فترة الاكتشاف
              </Button>

              <Button
                variant="contained"
                color="secondary"
                startIcon={detecting ? <CircularProgress size={20} /> : <Timeline />}
                onClick={runImmediateDetection}
                disabled={detecting}
                fullWidth
              >
                {detecting ? 'جاري الاكتشاف...' : 'اكتشاف فوري'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* آخر نتائج */}
        {status?.lastDetection && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📈 آخر نتائج الاكتشاف
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">
                      التاريخ
                    </Typography>
                    <Typography variant="body1">
                      {new Date(status.lastDetection.timestamp).toLocaleString('ar-EG')}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">
                      المدة
                    </Typography>
                    <Typography variant="body1">
                      {Math.round(status.lastDetection.duration / 1000)} ثانية
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">
                      الأنماط الجديدة
                    </Typography>
                    <Typography variant="body1">
                      {status.lastDetection.totalNewPatterns || 0}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">
                      الاكتشاف التالي
                    </Typography>
                    <Typography variant="body1">
                      {status.nextDetection ? 
                        new Date(status.nextDetection).toLocaleString('ar-EG') : 
                        'غير محدد'
                      }
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* حوار تغيير الفترة */}
      <Dialog open={intervalDialog} onClose={() => setIntervalDialog(false)}>
        <DialogTitle>تغيير فترة الاكتشاف</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="الفترة بالدقائق"
            type="number"
            fullWidth
            variant="outlined"
            value={newInterval}
            onChange={(e) => setNewInterval(parseInt(e.target.value))}
            inputProps={{ min: 5, max: 1440 }}
            helperText="بين 5 دقائق و 24 ساعة (1440 دقيقة)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIntervalDialog(false)}>
            إلغاء
          </Button>
          <Button onClick={changeInterval} variant="contained">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutoPatternManagement;
