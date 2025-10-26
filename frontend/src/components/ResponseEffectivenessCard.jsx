import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Rating,
  Divider,
  IconButton,
  Collapse,
  Grid,
  LinearProgress,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Schedule,
  TextFields,
  Mood,
  ShoppingCart,
  TrendingUp,
  Person,
  Message
} from '@mui/icons-material';

const ResponseEffectivenessCard = ({ response, showDetails = false }) => {
  const [expanded, setExpanded] = useState(false);

  const getEffectivenessColor = (score) => {
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    return 'error';
  };

  const getResponseTypeIcon = (type) => {
    switch (type) {
      case 'greeting': return '👋';
      case 'price_quote': return '💰';
      case 'product_info': return '📦';
      case 'shipping_info': return '🚚';
      case 'closing': return '✅';
      default: return '💬';
    }
  };

  const getResponseTypeName = (type) => {
    switch (type) {
      case 'greeting': return 'ترحيب';
      case 'price_quote': return 'عرض سعر';
      case 'product_info': return 'معلومات المنتج';
      case 'shipping_info': return 'معلومات الشحن';
      case 'closing': return 'إنهاء';
      default: return 'عام';
    }
  };

  const getSentimentColor = (score) => {
    if (score > 0.5) return 'success.main';
    if (score > 0) return 'warning.main';
    return 'error.main';
  };

  const getSentimentText = (score) => {
    if (score > 0.5) return 'إيجابي';
    if (score > 0) return 'محايد';
    return 'سلبي';
  };

  const formatResponseTime = (time) => {
    if (time < 1000) return `${time}ms`;
    if (time < 60000) return `${(time / 1000).toFixed(1)}s`;
    return `${(time / 60000).toFixed(1)}m`;
  };

  return (
    <Card 
      sx={{ 
        mb: 2,
        border: response.leadToPurchase ? '2px solid' : '1px solid',
        borderColor: response.leadToPurchase ? 'success.main' : 'divider',
        bgcolor: response.leadToPurchase ? 'success.light' : 'background.paper',
        transition: 'all 0.3s ease'
      }}
    >
      <CardContent>
        {/* الرأس */}
        <Box display="flex" justifyContent="between" alignItems="start" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              {getResponseTypeIcon(response.responseType)}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {getResponseTypeName(response.responseType)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(response.createdAt).toLocaleString('ar-EG')}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={`${response.effectivenessScore.toFixed(1)}/10`}
              color={getEffectivenessColor(response.effectivenessScore)}
              size="small"
              icon={<TrendingUp />}
            />
            {response.leadToPurchase && (
              <Chip
                label="أدى للشراء"
                color="success"
                size="small"
                icon={<ShoppingCart />}
              />
            )}
          </Box>
        </Box>

        {/* شريط الفعالية */}
        <Box mb={2}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              فعالية الرد
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {response.effectivenessScore.toFixed(1)}/10
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(response.effectivenessScore / 10) * 100}
            color={getEffectivenessColor(response.effectivenessScore)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* نص الرد */}
        <Box mb={2}>
          <Typography 
            variant="body1" 
            sx={{
              bgcolor: 'grey.50',
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200',
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'none' : 3,
              WebkitBoxOrient: 'vertical'
            }}
          >
            "{response.responseText}"
          </Typography>
          
          {response.responseText.length > 150 && (
            <Box display="flex" justifyContent="center" mt={1}>
              <IconButton 
                size="small" 
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
          )}
        </Box>

        {/* المعلومات الأساسية */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Schedule fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  وقت الرد
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatResponseTime(response.responseTime)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <TextFields fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  عدد الكلمات
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {response.wordCount}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Mood 
                fontSize="small" 
                sx={{ color: getSentimentColor(response.sentimentScore) }}
              />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  المشاعر
                </Typography>
                <Typography 
                  variant="body2" 
                  fontWeight="bold"
                  sx={{ color: getSentimentColor(response.sentimentScore) }}
                >
                  {getSentimentText(response.sentimentScore)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Person fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  رد فعل العميل
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {response.customerReaction === 'positive' ? 'إيجابي' :
                   response.customerReaction === 'negative' ? 'سلبي' : 'محايد'}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* التفاصيل الإضافية */}
        {showDetails && (
          <Collapse in={expanded}>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                تفاصيل إضافية:
              </Typography>
              
              <Grid container spacing={2}>
                {response.keywords && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      الكلمات المفتاحية:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                      {response.keywords.split(',').map((keyword, index) => (
                        <Chip
                          key={index}
                          label={keyword.trim()}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    معرف المحادثة:
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {response.conversationId.slice(-8)}...
                  </Typography>
                </Grid>
              </Grid>

              {response.metadata && (
                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    معلومات إضافية:
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                    {JSON.stringify(JSON.parse(response.metadata), null, 2)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        )}

        {/* تقييم سريع */}
        <Divider sx={{ my: 2 }} />
        <Box display="flex" justifyContent="between" alignItems="center">
          <Box>
            <Typography variant="caption" color="text.secondary">
              تقييم الفعالية:
            </Typography>
            <Rating
              value={response.effectivenessScore / 2}
              precision={0.1}
              size="small"
              readOnly
            />
          </Box>

          <Tooltip title="عرض تفاصيل أكثر">
            <IconButton 
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              <Message />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ResponseEffectivenessCard;
