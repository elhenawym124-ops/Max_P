import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Chat as ChatIcon,
  Message as MessageIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuthSimple';
import { buildApiUrl } from '../utils/urlHelper';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl('admin/statistics'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setStatistics(data.data);
      } else {
        setError(data.message || 'فشل في جلب الإحصائيات');
      }
    } catch (err) {
      setError('فشل في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="text.secondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={`${color}.main`}>
              {value?.toLocaleString() || 0}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" mt={1}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const PlanCard = ({ plan, count, total }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    const planNames = {
      BASIC: 'أساسي',
      PRO: 'احترافي',
      ENTERPRISE: 'مؤسسي'
    };
    const planColors = {
      BASIC: 'info',
      PRO: 'warning',
      ENTERPRISE: 'success'
    };

    return (
      <Box mb={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip 
              label={planNames[plan] || plan} 
              color={planColors[plan] || 'default'}
              size="small"
            />
            <Typography variant="body2">
              {count} شركة
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {percentage}%
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={percentage} 
          color={planColors[plan] || 'primary'}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>
    );
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
      <Alert severity="error" sx={{ m: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          لوحة تحكم مدير النظام
        </Typography>
        <Typography variant="body1" color="text.secondary">
          مرحباً {user?.firstName} {user?.lastName}، إليك نظرة عامة على النظام
        </Typography>
      </Box>

      {/* Overview Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي الشركات"
            value={statistics?.overview?.totalCompanies}
            icon={<BusinessIcon />}
            color="primary"
            subtitle={`نشطة: ${statistics?.overview?.activeCompanies}`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي المستخدمين"
            value={statistics?.overview?.totalUsers}
            icon={<PeopleIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي العملاء"
            value={statistics?.overview?.totalCustomers}
            icon={<PeopleIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي المحادثات"
            value={statistics?.overview?.totalConversations}
            icon={<ChatIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Detailed Statistics */}
      <Grid container spacing={3}>
        {/* Plan Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <AssessmentIcon />
                توزيع الخطط
              </Typography>
              <Box mt={2}>
                {Object.entries(statistics?.planDistribution || {}).map(([plan, count]) => (
                  <PlanCard
                    key={plan}
                    plan={plan}
                    count={count}
                    total={statistics?.overview?.totalCompanies}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon />
                النشاط الأخير (30 يوم)
              </Typography>
              <Box mt={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="body2">شركات جديدة</Typography>
                  <Chip 
                    label={statistics?.recentActivity?.newCompaniesLast30Days || 0}
                    color="primary"
                    size="small"
                  />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="body2">مستخدمين جدد</Typography>
                  <Chip 
                    label={statistics?.recentActivity?.newUsersLast30Days || 0}
                    color="success"
                    size="small"
                  />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">عملاء جدد</Typography>
                  <Chip 
                    label={statistics?.recentActivity?.newCustomersLast30Days || 0}
                    color="info"
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SuperAdminDashboard;
