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
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { useAuth } from '../hooks/useAuthSimple';
import axios from 'axios';

const CustomerPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      // بيانات وهمية للمدفوعات
      const mockPayments = [
        {
          id: 'pay-1',
          paymentNumber: 'PAY-202507-001',
          amount: 7500,
          method: 'WALLET_TRANSFER',
          status: 'COMPLETED',
          paidAt: '2025-07-15T10:30:00Z',
          invoice: {
            invoiceNumber: 'INV-202507-12345678'
          }
        },
        {
          id: 'pay-2',
          paymentNumber: 'PAY-202506-002',
          amount: 7500,
          method: 'WALLET_TRANSFER',
          status: 'COMPLETED',
          paidAt: '2025-06-15T14:20:00Z',
          invoice: {
            invoiceNumber: 'INV-202506-87654321'
          }
        },
        {
          id: 'pay-3',
          paymentNumber: 'PAY-202508-003',
          amount: 7500,
          method: 'WALLET_TRANSFER',
          status: 'PENDING',
          paidAt: null,
          invoice: {
            invoiceNumber: 'INV-202508-31819812'
          }
        }
      ];

      setPayments(mockPayments);
    } catch (error) {
      console.error('خطأ في جلب المدفوعات:', error);
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'مكتملة';
      case 'PENDING':
        return 'في الانتظار';
      case 'FAILED':
        return 'فشلت';
      default:
        return status;
    }
  };

  const getMethodText = (method) => {
    switch (method) {
      case 'WALLET_TRANSFER':
        return 'تحويل محفظة';
      case 'BANK_TRANSFER':
        return 'تحويل بنكي';
      case 'CREDIT_CARD':
        return 'بطاقة ائتمان';
      case 'CASH':
        return 'نقداً';
      default:
        return method;
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalAmount = payments.reduce((sum, payment) => 
    payment.status === 'COMPLETED' ? sum + payment.amount : sum, 0
  );

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
        💰 مدفوعاتي
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
                {payments.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                إجمالي المدفوعات
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {formatCurrency(totalAmount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                إجمالي المبلغ المدفوع
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {payments.filter(p => p.status === 'COMPLETED').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                مدفوعات مكتملة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {payments.filter(p => p.status === 'PENDING').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                في الانتظار
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* جدول المدفوعات */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            سجل المدفوعات
          </Typography>
          
          {payments.length === 0 ? (
            <Alert severity="info">
              لا توجد مدفوعات حالياً
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>رقم الدفع</TableCell>
                    <TableCell>رقم الفاتورة</TableCell>
                    <TableCell>المبلغ</TableCell>
                    <TableCell>طريقة الدفع</TableCell>
                    <TableCell>تاريخ الدفع</TableCell>
                    <TableCell>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {payment.paymentNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {payment.invoice?.invoiceNumber || 'غير محدد'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(payment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getMethodText(payment.method)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {payment.paidAt ? formatDate(payment.paidAt) : 'غير محدد'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(payment.status)}
                          color={getStatusColor(payment.status)}
                          size="small"
                        />
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

export default CustomerPayments;
