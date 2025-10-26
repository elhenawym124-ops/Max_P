import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Grid,
  Badge,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const WalletManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [walletNumbers, setWalletNumbers] = useState([]);
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editingWallet, setEditingWallet] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    icon: '',
    color: '#000000'
  });

  // Add axios interceptor to handle authentication errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // Clear local storage and redirect to login
          localStorage.removeItem('accessToken');
          navigate('/super-admin/login');
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate]);

  useEffect(() => {
    fetchWalletNumbers();
    fetchPendingReceipts();
  }, []);

  const fetchWalletNumbers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Check if token exists
      if (!token) {
        // Redirect to login if no token
        navigate('/super-admin/login');
        return;
      }

      const response = await axios.get('/api/v1/wallet-payment/admin/wallet-numbers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setWalletNumbers(response.data.data);
      }
    } catch (error) {
      console.error('خطأ في جلب أرقام المحافظ:', error);
      // Handle authentication errors
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        // Clear local storage and redirect to login
        localStorage.removeItem('accessToken');
        navigate('/super-admin/login');
      }
    }
  };

  const fetchPendingReceipts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Check if token exists
      if (!token) {
        // Redirect to login if no token
        navigate('/super-admin/login');
        return;
      }

      const response = await axios.get('/api/v1/wallet-payment/admin/pending-receipts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setPendingReceipts(response.data.data);
      }
    } catch (error) {
      console.error('خطأ في جلب الإيصالات:', error);
      // Handle authentication errors
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        // Clear local storage and redirect to login
        localStorage.removeItem('accessToken');
        navigate('/super-admin/login');
      }
    }
  };

  const handleSaveWallet = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Check if token exists
      if (!token) {
        // Redirect to login if no token
        navigate('/super-admin/login');
        return;
      }

      setLoading(true);
      if (editingWallet) {
        await axios.put(`/api/v1/wallet-payment/admin/wallet-numbers/${editingWallet.id}`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        await axios.post('/api/v1/wallet-payment/admin/wallet-numbers', formData, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
      
      setDialogOpen(false);
      setEditingWallet(null);
      setFormData({ name: '', number: '', icon: '', color: '#000000' });
      fetchWalletNumbers();
    } catch (error) {
      console.error('خطأ في حفظ المحفظة:', error);
      // Handle authentication errors
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        // Clear local storage and redirect to login
        localStorage.removeItem('accessToken');
        navigate('/super-admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Check if token exists
      if (!token) {
        // Redirect to login if no token
        navigate('/super-admin/login');
        return;
      }

      const wallet = walletNumbers.find(w => w.id === id);
      await axios.put(`/api/v1/wallet-payment/admin/wallet-numbers/${id}`, {
        ...wallet,
        isActive: !isActive
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchWalletNumbers();
    } catch (error) {
      console.error('خطأ في تحديث حالة المحفظة:', error);
      // Handle authentication errors
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        // Clear local storage and redirect to login
        localStorage.removeItem('accessToken');
        navigate('/super-admin/login');
      }
    }
  };

  const handleDeleteWallet = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المحفظة؟')) {
      try {
        const token = localStorage.getItem('accessToken');
        
        // Check if token exists
        if (!token) {
          // Redirect to login if no token
          navigate('/super-admin/login');
          return;
        }

        await axios.delete(`/api/v1/wallet-payment/admin/wallet-numbers/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        fetchWalletNumbers();
      } catch (error) {
        console.error('خطأ في حذف المحفظة:', error);
        // Handle authentication errors
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // Clear local storage and redirect to login
          localStorage.removeItem('accessToken');
          navigate('/super-admin/login');
        }
      }
    }
  };

  const handleReviewReceipt = async (receiptId, action, notes = '') => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Check if token exists
      if (!token) {
        // Redirect to login if no token
        navigate('/super-admin/login');
        return;
      }

      await axios.post(`/api/v1/wallet-payment/admin/review-receipt/${receiptId}`, {
        action,
        notes
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setReceiptDialogOpen(false);
      setSelectedReceipt(null);
      fetchPendingReceipts();
    } catch (error) {
      console.error('خطأ في مراجعة الإيصال:', error);
      // Handle authentication errors
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        // Clear local storage and redirect to login
        localStorage.removeItem('accessToken');
        navigate('/super-admin/login');
      }
    }
  };

  const openEditDialog = (wallet = null) => {
    if (wallet) {
      setEditingWallet(wallet);
      setFormData({
        name: wallet.name,
        number: wallet.number,
        icon: wallet.icon,
        color: wallet.color
      });
    } else {
      setEditingWallet(null);
      setFormData({ name: '', number: '', icon: '', color: '#000000' });
    }
    setDialogOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        💳 إدارة المحافظ والمدفوعات
      </Typography>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="أرقام المحافظ" />
        <Tab 
          label={
            <Badge badgeContent={pendingReceipts.length} color="error">
              الإيصالات المعلقة
            </Badge>
          } 
        />
      </Tabs>

      {/* تبويب أرقام المحافظ */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">أرقام المحافظ</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openEditDialog()}
              >
                إضافة محفظة جديدة
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>المحفظة</TableCell>
                    <TableCell>الرقم</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>تاريخ الإضافة</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {walletNumbers.map((wallet) => (
                    <TableRow key={wallet.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <span style={{ marginRight: 8 }}>{wallet.icon}</span>
                          <Typography variant="body2" fontWeight="bold">
                            {wallet.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>
                        {wallet.number}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={wallet.isActive ? 'نشط' : 'غير نشط'}
                          color={wallet.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {formatDate(wallet.createdAt)}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => openEditDialog(wallet)}>
                          <EditIcon />
                        </IconButton>
                        <Switch
                          checked={wallet.isActive}
                          onChange={(e) => handleToggleActive(wallet.id, e.target.checked)}
                          color="primary"
                        />
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteWallet(wallet.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* تبويب الإيصالات المعلقة */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              الإيصالات المعلقة
            </Typography>
            
            {pendingReceipts.length === 0 ? (
              <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                لا توجد إيصالات معلقة
              </Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>الشركة</TableCell>
                      <TableCell>الفاتورة</TableCell>
                      <TableCell>المبلغ</TableCell>
                      <TableCell>المحفظة</TableCell>
                      <TableCell>تاريخ الإرسال</TableCell>
                      <TableCell>الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingReceipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {receipt.invoice.company.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {receipt.invoice.company.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {receipt.invoice.invoiceNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="primary">
                            {formatCurrency(receipt.invoice.totalAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {receipt.walletNumber.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {receipt.walletNumber.number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {formatDate(receipt.submittedAt)}
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => {
                              setSelectedReceipt(receipt);
                              setReceiptDialogOpen(true);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog for adding/editing wallet */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingWallet ? 'تعديل المحفظة' : 'إضافة محفظة جديدة'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم المحفظة"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="رقم المحفظة"
                value={formData.number}
                onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="رمز المحفظة (رمز تعبيري)"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اللون"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleSaveWallet} variant="contained" disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for reviewing receipt */}
      <Dialog open={receiptDialogOpen} onClose={() => setReceiptDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>مراجعة الإيصال</DialogTitle>
        <DialogContent>
          {selectedReceipt && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">الشركة</Typography>
                <Typography variant="body1">{selectedReceipt.invoice.company.name}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {selectedReceipt.invoice.company.email}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">الفاتورة</Typography>
                <Typography variant="body1">{selectedReceipt.invoice.invoiceNumber}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">المبلغ</Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(selectedReceipt.invoice.totalAmount)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">المحفظة</Typography>
                <Typography variant="body1">{selectedReceipt.walletNumber.name}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {selectedReceipt.walletNumber.number}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">تاريخ الإرسال</Typography>
                <Typography variant="body1">{formatDate(selectedReceipt.submittedAt)}</Typography>
              </Grid>
              {selectedReceipt.receiptImage && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">صورة الإيصال</Typography>
                  <img 
                    src={selectedReceipt.receiptImage} 
                    alt="إيصال الدفع" 
                    style={{ maxWidth: '100%', height: 'auto', marginTop: 8 }}
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptDialogOpen(false)}>إلغاء</Button>
          <Button 
            onClick={() => handleReviewReceipt(selectedReceipt?.id, 'reject')} 
            variant="outlined" 
            color="error"
          >
            رفض
          </Button>
          <Button 
            onClick={() => handleReviewReceipt(selectedReceipt?.id, 'approve')} 
            variant="contained" 
            color="primary"
          >
            موافقة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WalletManagement;