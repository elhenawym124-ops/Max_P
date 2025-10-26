import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Close,
  TrendingUp,
  Psychology,
  Schedule,
  TextFields,
  Mood,
  CheckCircle,
  Cancel,
  Info
} from '@mui/icons-material';

const PatternDetailsModal = ({ open, onClose, pattern, onApprove, onReject }) => {
  const [loading, setLoading] = useState(false);

  if (!pattern) return null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(pattern.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(pattern.id);
    } finally {
      setLoading(false);
    }
  };

  const getPatternTypeIcon = (type) => {
    switch (type) {
      case 'word_usage': return <TextFields />;
      case 'timing': return <Schedule />;
      case 'response_style': return <Psychology />;
      case 'emotional_tone': return <Mood />;
      default: return <Info />;
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

  const renderPatternDetails = () => {
    try {
      const patternData = typeof pattern.pattern === 'string' 
        ? JSON.parse(pattern.pattern) 
        : pattern.pattern;

      switch (pattern.patternType) {
        case 'word_usage':
          return (
            <Box>
              <Typography variant="h6" gutterBottom>الكلمات المؤثرة:</Typography>
              {patternData.successWords && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="success.main" gutterBottom>
                    كلمات النجاح:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {patternData.successWords.map((word, index) => (
                      <Chip
                        key={index}
                        label={`${word.word} (${(word.frequency * 100).toFixed(1)}%)`}
                        color="success"
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}
              
              {patternData.avoidWords && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="error.main" gutterBottom>
                    كلمات يجب تجنبها:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {patternData.avoidWords.map((word, index) => (
                      <Chip
                        key={index}
                        label={`${word.word} (${(word.frequency * 100).toFixed(1)}%)`}
                        color="error"
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          );

        case 'timing':
          return (
            <Box>
              <Typography variant="h6" gutterBottom>تحليل التوقيت:</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="success.main">
                        الوقت الأمثل للرد
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {patternData.optimalResponseTime} دقيقة
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        الفرق في الأداء
                      </Typography>
                      <Typography variant="h4" color="primary.main">
                        +{patternData.timeDifference} دقيقة
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          );

        case 'response_style':
          return (
            <Box>
              <Typography variant="h6" gutterBottom>تحليل الأسلوب:</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="success.main">
                        عدد الكلمات الأمثل
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {patternData.optimalWordCount} كلمة
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        الأسلوب المفضل
                      </Typography>
                      <Typography variant="h6" color="primary.main">
                        {patternData.stylePreference === 'concise' ? 'مختصر' : 'مفصل'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          );

        case 'emotional_tone':
          return (
            <Box>
              <Typography variant="h6" gutterBottom>تحليل النبرة:</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="success.main">
                        النبرة المثلى
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {(patternData.optimalSentiment * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="caption">إيجابية</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        التفضيل
                      </Typography>
                      <Typography variant="h6" color="primary.main">
                        {patternData.tonePreference === 'positive' ? 'إيجابي' : 'محايد'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          );

        default:
          return (
            <Alert severity="info">
              تفاصيل النمط غير متوفرة للعرض
            </Alert>
          );
      }
    } catch (error) {
      return (
        <Alert severity="error">
          خطأ في عرض تفاصيل النمط: {error.message}
        </Alert>
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="between" alignItems="center">
          <Box display="flex" alignItems="center">
            {getPatternTypeIcon(pattern.patternType)}
            <Typography variant="h6" sx={{ ml: 1 }}>
              تفاصيل النمط: {getPatternTypeName(pattern.patternType)}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* معلومات أساسية */}
        <Box mb={3}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h4" color="success.main">
                  {(pattern.successRate * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2" sx={{ ml: 1 }}>معدل النجاح</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={pattern.successRate * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip 
                  label={`عينة: ${pattern.sampleSize}`}
                  color="primary"
                  size="small"
                />
                <Chip 
                  label={`ثقة: ${(pattern.confidenceLevel * 100).toFixed(0)}%`}
                  color="secondary"
                  size="small"
                />
                <Chip 
                  label={pattern.isApproved ? 'معتمد' : 'غير معتمد'}
                  color={pattern.isApproved ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* وصف النمط */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>الوصف:</Typography>
          <Alert severity="info" icon={<Info />}>
            {pattern.description}
          </Alert>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* تفاصيل النمط */}
        {renderPatternDetails()}

        {/* معلومات إضافية */}
        <Divider sx={{ my: 2 }} />
        <Box>
          <Typography variant="h6" gutterBottom>معلومات إضافية:</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <Schedule />
              </ListItemIcon>
              <ListItemText 
                primary="تاريخ الاكتشاف"
                secondary={new Date(pattern.createdAt).toLocaleString('ar-EG')}
              />
            </ListItem>
            
            {pattern.approvedBy && (
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText 
                  primary="معتمد بواسطة"
                  secondary={`${pattern.approvedBy} في ${new Date(pattern.approvedAt).toLocaleString('ar-EG')}`}
                />
              </ListItem>
            )}
            
            <ListItem>
              <ListItemIcon>
                <Info />
              </ListItemIcon>
              <ListItemText 
                primary="الحالة"
                secondary={pattern.isActive ? 'نشط' : 'غير نشط'}
              />
            </ListItem>
          </List>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          إغلاق
        </Button>
        
        {!pattern.isApproved && (
          <>
            <Button 
              onClick={handleReject}
              color="error"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <Cancel />}
            >
              رفض
            </Button>
            <Button 
              onClick={handleApprove}
              color="success"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
            >
              اعتماد
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PatternDetailsModal;
