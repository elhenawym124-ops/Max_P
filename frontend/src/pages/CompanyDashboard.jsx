import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../utils/urlHelper';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Person as CustomersIcon,
  Chat as ChatIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuthSimple';

/**
 * Company Dashboard Page
 * 
 * Main dashboard for company users showing overview, usage, and limits
 */

const CompanyDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl('company/dashboard'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
        setError(null);
      } else {
        setError(data.message || 'فشل في جلب بيانات لوحة التحكم');
      }
    } catch (err) {
      setError('فشل في جلب البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Get plan display name
  const getPlanDisplayName = (plan) => {
    const plans = {
      BASIC: 'أساسي',
      PRO: 'احترافي',
      ENTERPRISE: 'مؤسسي'
    };
    return plans[plan] || plan;
  };

  // Get plan color
  const getPlanColor = (plan) => {
    const colors = {
      BASIC: 'primary',
      PRO: 'warning',
      ENTERPRISE: 'error'
    };
    return colors[plan] || 'default';
  };

  // Get usage color based on percentage
  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  // Format number with commas
  const formatNumber = (num) => {
    if (num === -1) return 'غير محدود';
    return num.toLocaleString('ar-EG');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">لا توجد بيانات متاحة</Alert>
      </Box>
    );
  }

  const { company, counts, usage, limits, recentActivity } = dashboardData;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          لوحة تحكم {company.name}
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip 
            label={getPlanDisplayName(company.plan)}
            color={getPlanColor(company.plan)}
            icon={<BusinessIcon />}
          />
          <Chip 
            label={company.isActive ? 'نشط' : 'غير نشط'}
            color={company.isActive ? 'success' : 'default'}
            icon={company.isActive ? <CheckCircleIcon /> : <WarningIcon />}
          />
        </Box>
      </Box>

      {/* Usage Overview Cards */}
      <Grid container spacing={3} mb={4}>
        {/* Users Usage */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">المستخدمين</Typography>
              </Box>
              
              <Typography variant="h4" color="primary" gutterBottom>
                {formatNumber(usage.users.current)}
                {usage.users.limit !== -1 && (
                  <Typography component="span" variant="body2" color="text.secondary">
                    / {formatNumber(usage.users.limit)}
                  </Typography>
                )}
              </Typography>

              {usage.users.limit !== -1 && (
                <>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(usage.users.percentage, 100)}
                    color={getUsageColor(usage.users.percentage)}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {usage.users.percentage}% مستخدم
                  </Typography>
                </>
              )}

              {recentActivity.newUsers > 0 && (
                <Box display="flex" alignItems="center" mt={1}>
                  <TrendingUpIcon fontSize="small" color="success" />
                  <Typography variant="caption" color="success.main" sx={{ ml: 0.5 }}>
                    +{recentActivity.newUsers} هذا الأسبوع
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Customers Usage */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CustomersIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">العملاء</Typography>
              </Box>
              
              <Typography variant="h4" color="secondary" gutterBottom>
                {formatNumber(usage.customers.current)}
                {usage.customers.limit !== -1 && (
                  <Typography component="span" variant="body2" color="text.secondary">
                    / {formatNumber(usage.customers.limit)}
                  </Typography>
                )}
              </Typography>

              {usage.customers.limit !== -1 && (
                <>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(usage.customers.percentage, 100)}
                    color={getUsageColor(usage.customers.percentage)}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {usage.customers.percentage}% مستخدم
                  </Typography>
                </>
              )}

              {recentActivity.newCustomers > 0 && (
                <Box display="flex" alignItems="center" mt={1}>
                  <TrendingUpIcon fontSize="small" color="success" />
                  <Typography variant="caption" color="success.main" sx={{ ml: 0.5 }}>
                    +{recentActivity.newCustomers} هذا الأسبوع
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Conversations Usage */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ChatIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">المحادثات</Typography>
              </Box>
              
              <Typography variant="h4" color="info.main" gutterBottom>
                {formatNumber(usage.conversations.current)}
                {usage.conversations.limit !== -1 && (
                  <Typography component="span" variant="body2" color="text.secondary">
                    / {formatNumber(usage.conversations.limit)}
                  </Typography>
                )}
              </Typography>

              {usage.conversations.limit !== -1 && (
                <>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(usage.conversations.percentage, 100)}
                    color={getUsageColor(usage.conversations.percentage)}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {usage.conversations.percentage}% مستخدم
                  </Typography>
                </>
              )}

              {recentActivity.newConversations > 0 && (
                <Box display="flex" alignItems="center" mt={1}>
                  <TrendingUpIcon fontSize="small" color="success" />
                  <Typography variant="caption" color="success.main" sx={{ ml: 0.5 }}>
                    +{recentActivity.newConversations} هذا الأسبوع
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Usage Warnings */}
      {(usage.users.percentage >= 80 || usage.customers.percentage >= 80 || usage.conversations.percentage >= 80) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            تحذير: اقتراب من حدود الاستخدام
          </Typography>
          <Typography variant="body2">
            أنت تقترب من حدود خطتك الحالية. فكر في ترقية خطتك لتجنب انقطاع الخدمة.
          </Typography>
        </Alert>
      )}

      {/* Additional Stats */}
      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                إحصائيات سريعة
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" color="primary">
                      {counts.products || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      المنتجات
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" color="secondary">
                      {counts.orders || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      الطلبات
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" color="info.main">
                      {counts.conversations || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      المحادثات
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" color="success.main">
                      {counts.users || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      المستخدمين
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                النشاط الأخير (7 أيام)
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <PeopleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${recentActivity.newUsers} مستخدم جديد`}
                    secondary="تم إضافتهم هذا الأسبوع"
                  />
                </ListItem>
                
                <Divider />
                
                <ListItem>
                  <ListItemIcon>
                    <CustomersIcon color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${recentActivity.newCustomers} عميل جديد`}
                    secondary="تم تسجيلهم هذا الأسبوع"
                  />
                </ListItem>
                
                <Divider />
                
                <ListItem>
                  <ListItemIcon>
                    <ChatIcon color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${recentActivity.newConversations} محادثة جديدة`}
                    secondary="تم بدؤها هذا الأسبوع"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CompanyDashboard;
