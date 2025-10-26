import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuthSimple';
import axios from 'axios';

const CustomerInvoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      // بيانات وهمية للفواتير
      const mockInvoices = [
        {
          id: 'cme8q7mnr000kuf3wgftcsv3l',
          invoiceNumber: 'INV-202506-31819812',
          issueDate: '2025-08-01',
          dueDate: '2025-08-15',
          totalAmount: 7500,
          currency: 'EGP',
          status: 'PENDING'
        },
        {
          id: 'inv-2',
          invoiceNumber: 'INV-202507-12345678',
          issueDate: '2025-07-01',
          dueDate: '2025-07-15',
          totalAmount: 7500,
          currency: 'EGP',
          status: 'PAID'
        },
        {
          id: 'inv-3',
          invoiceNumber: 'INV-202506-87654321',
          issueDate: '2025-06-01',
          dueDate: '2025-06-15',
          totalAmount: 7500,
          currency: 'EGP',
          status: 'OVERDUE'
        }
      ];

      setInvoices(mockInvoices);
    } catch (error) {
      console.error('خطأ في جلب الفواتير:', error);
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'OVERDUE':
        return 'error';
      case 'DRAFT':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PAID':
        return 'مدفوعة';
      case 'PENDING':
        return 'في الانتظار';
      case 'OVERDUE':
        return 'متأخرة';
      case 'DRAFT':
        return 'مسودة';
      default:
        return status;
    }
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
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePayInvoice = (invoice) => {
    // فتح صفحة الدفع في تبويب جديد
    window.open(`/payment/${invoice.id}`, '_blank');
  };

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
        🧾 فواتيري
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* إحصائيات سريعة */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {invoices.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                إجمالي الفواتير
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {invoices.filter(inv => inv.status === 'PAID').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                فواتير مدفوعة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {invoices.filter(inv => inv.status === 'PENDING').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                في الانتظار
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                {invoices.filter(inv => inv.status === 'OVERDUE').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                فواتير متأخرة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* جدول الفواتير */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            قائمة الفواتير
          </Typography>
          
          {invoices.length === 0 ? (
            <Alert severity="info">
              لا توجد فواتير حالياً
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>رقم الفاتورة</TableCell>
                    <TableCell>تاريخ الإصدار</TableCell>
                    <TableCell>تاريخ الاستحقاق</TableCell>
                    <TableCell>المبلغ</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {invoice.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatDate(invoice.issueDate)}
                      </TableCell>
                      <TableCell>
                        {formatDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(invoice.totalAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(invoice.status)}
                          color={getStatusColor(invoice.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ViewIcon />}
                          >
                            عرض
                          </Button>
                          {(invoice.status === 'PENDING' || invoice.status === 'OVERDUE') && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<PaymentIcon />}
                              onClick={() => handlePayInvoice(invoice)}
                            >
                              دفع
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                          >
                            تحميل
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CustomerInvoices;
