import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Edit as EditIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  Star as StarIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';

import { buildApiUrl } from '../utils/urlHelper';

const SuperAdminPlans = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [plans, setPlans] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    fetchPlans();
    fetchComparison();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('admin/plans/plans'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('فشل في جلب بيانات الخطط');
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('admin/plans/plans/comparison'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setComparison(data.data);
      }
    } catch (err) {
      console.error('Error fetching comparison:', err);
    }
  };

  const handleEditPlan = (plan) => {
    setSelectedPlan(plan);
    setEditDialog(true);
  };

  const handleSavePlan = async (planData) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`admin/plans/plans/${selectedPlan.planType}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(planData)
      });

      const data = await response.json();
      if (data.success) {
        setEditDialog(false);
        fetchPlans();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('فشل في تحديث الخطة');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(price);
  };

  const formatFeatureValue = (value) => {
    if (value === -1) return 'غير محدود';
    if (value === true) return <CheckIcon color="success" />;
    if (value === false) return <CloseIcon color="error" />;
    return value;
  };

  const getPlanColor = (planType) => {
    switch (planType) {
      case 'BASIC': return 'primary';
      case 'PRO': return 'secondary';
      case 'ENTERPRISE': return 'warning';
      default: return 'default';
    }
  };

  // Plans Overview Tab
  const PlansOverviewTab = () => (
    <Grid container spacing={3}>
      {plans.map((plan) => (
        <Grid item xs={12} md={4} key={plan.planType}>
          <Card sx={{ height: '100%', position: 'relative' }}>
            {plan.planType === 'PRO' && (
              <Chip
                label="الأكثر شعبية"
                color="secondary"
                size="small"
                sx={{ position: 'absolute', top: 16, right: 16 }}
              />
            )}
            <CardContent>
              <Box textAlign="center" mb={2}>
                <Typography variant="h5" gutterBottom>
                  {plan.name}
                </Typography>
                <Typography variant="h3" color="primary" gutterBottom>
                  {formatPrice(plan.price)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  شهرياً
                </Typography>
              </Box>

              <Box mb={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {plan.description}
                </Typography>
              </Box>

              {/* Key Features */}
              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  الميزات الرئيسية:
                </Typography>
                <Typography variant="body2" gutterBottom>
                  • المستخدمين: {formatFeatureValue(plan.features.maxUsers)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  • العملاء: {formatFeatureValue(plan.features.maxCustomers)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  • الردود الذكية: {formatFeatureValue(plan.features.aiResponses)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  • التقارير المتقدمة: {formatFeatureValue(plan.features.advancedReports)}
                </Typography>
              </Box>

              {/* Stats */}
              <Box mb={2}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="primary">
                        {plan.stats.activeCompanies}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        شركة نشطة
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="success.main">
                        {formatPrice(plan.stats.monthlyRevenue)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        إيراد شهري
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleEditPlan(plan)}
                  fullWidth
                >
                  تعديل
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ViewIcon />}
                  fullWidth
                >
                  عرض
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // Features Comparison Tab
  const FeaturesComparisonTab = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          مقارنة الميزات بين الخطط
        </Typography>
        
        {comparison && (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>الميزة</TableCell>
                  {comparison.plans.map((plan) => (
                    <TableCell key={plan.planType} align="center">
                      <Box>
                        <Typography variant="subtitle2">{plan.name}</Typography>
                        <Typography variant="caption" color="primary">
                          {formatPrice(plan.price)}
                        </Typography>
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {comparison.features.map((feature) => (
                  <TableRow key={feature.key}>
                    <TableCell component="th" scope="row">
                      <Typography variant="body2">{feature.name}</Typography>
                    </TableCell>
                    {comparison.plans.map((plan) => (
                      <TableCell key={plan.planType} align="center">
                        {formatFeatureValue(feature.plans[plan.planType])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  // Plan Statistics Tab
  const PlanStatisticsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <BusinessIcon color="primary" />
              <Box>
                <Typography variant="h4">
                  {plans.reduce((sum, plan) => sum + plan.stats.activeCompanies, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  إجمالي الشركات النشطة
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <MoneyIcon color="success" />
              <Box>
                <Typography variant="h4" color="success.main">
                  {formatPrice(plans.reduce((sum, plan) => sum + plan.stats.monthlyRevenue, 0))}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  إجمالي الإيرادات الشهرية
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <TrendingUpIcon color="warning" />
              <Box>
                <Typography variant="h4" color="warning.main">
                  {plans.find(p => p.planType === 'PRO')?.stats.marketShare || 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  حصة الخطة الاحترافية
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Market Share Chart */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              توزيع الحصص السوقية
            </Typography>
            <Grid container spacing={2}>
              {plans.map((plan) => (
                <Grid item xs={12} sm={4} key={plan.planType}>
                  <Box p={2} textAlign="center">
                    <Typography variant="h6" color={`${getPlanColor(plan.planType)}.main`}>
                      {plan.stats.marketShare}%
                    </Typography>
                    <Typography variant="body2">{plan.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {plan.stats.activeCompanies} شركة
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            إدارة الخطط والأسعار
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إدارة خطط الاشتراك والأسعار والميزات
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEditDialog(true)}
        >
          خطة جديدة
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<StarIcon />} label="نظرة عامة" />
          <Tab icon={<ViewIcon />} label="مقارنة الميزات" />
          <Tab icon={<TrendingUpIcon />} label="الإحصائيات" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && <PlansOverviewTab />}
      {activeTab === 1 && <FeaturesComparisonTab />}
      {activeTab === 2 && <PlanStatisticsTab />}

      {/* Edit Plan Dialog */}
      <EditPlanDialog
        open={editDialog}
        plan={selectedPlan}
        onClose={() => setEditDialog(false)}
        onSave={handleSavePlan}
      />
    </Box>
  );
};

// Edit Plan Dialog Component
const EditPlanDialog = ({ open, plan, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    price: '',
    currency: 'EGP',
    billingCycle: 'monthly',
    description: '',
    descriptionEn: ''
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        price: plan.price || '',
        currency: plan.currency || 'EGP',
        billingCycle: plan.billingCycle || 'monthly',
        description: plan.description || '',
        descriptionEn: plan.descriptionEn || ''
      });
    }
  }, [plan]);

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        تعديل خطة {plan?.name}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="السعر"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>العملة</InputLabel>
              <Select
                value={formData.currency}
                label="العملة"
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <MenuItem value="EGP">جنيه مصري</MenuItem>
                <MenuItem value="USD">دولار أمريكي</MenuItem>
                <MenuItem value="SAR">ريال سعودي</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="الوصف بالعربية"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="الوصف بالإنجليزية"
              multiline
              rows={2}
              value={formData.descriptionEn}
              onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button onClick={handleSubmit} variant="contained">
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuperAdminPlans;
