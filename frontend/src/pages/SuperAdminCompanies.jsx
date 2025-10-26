import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon,
  Facebook as FacebookIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import { buildApiUrl } from '../utils/apiHelpers';

const SuperAdminCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingCompanyId, setEditingCompanyId] = useState(null); // New state to store company ID for edit operations
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create'); // create, edit, view
  const [submitting, setSubmitting] = useState(false);
  const [facebookPagesModalOpen, setFacebookPagesModalOpen] = useState(false);
  const [selectedCompanyPages, setSelectedCompanyPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    plan: 'BASIC',
    currency: 'EGP',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: ''
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('غير مخول بالدخول - الرجاء تسجيل الدخول أولاً');
        setLoading(false);
        return;
      }
      
      const response = await fetch(buildApiUrl('admin/companies'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`خطأ في الاتصال بالخادم: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setCompanies(data.data.companies);
      } else {
        setError(data.message || 'فشل في جلب الشركات');
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(`فشل في الاتصال بالخادم: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, company) => {
    console.log('Opening menu for company:', company); // Debug log
    if (!company || !company.id) {
      console.error('Invalid company data:', company);
      setError('بيانات الشركة غير صحيحة');
      return;
    }
    setAnchorEl(event.currentTarget);
    setSelectedCompany(company);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCompany(null);
  };

  const handleCreateCompany = () => {
    setModalType('create');
    setEditingCompanyId(null); // Reset editing company ID
    setFormData({
      name: '',
      email: '',
      phone: '',
      website: '',
      plan: 'BASIC',
      currency: 'EGP',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: ''
    });
    setModalOpen(true);
    handleMenuClose();
  };

  const handleEditCompany = () => {
    console.log('Editing company, selectedCompany:', selectedCompany); // Debug log
    
    if (!selectedCompany) {
      setError('لم يتم تحديد شركة للتعديل');
      handleMenuClose();
      return;
    }
    
    // Validate that the selected company has required properties
    if (!selectedCompany.id || !selectedCompany.name) {
      setError('بيانات الشركة غير مكتملة');
      handleMenuClose();
      return;
    }
    
    setModalType('edit');
    setEditingCompanyId(selectedCompany.id); // Store the company ID for edit operations
    setFormData({
      name: selectedCompany.name,
      email: selectedCompany.email,
      phone: selectedCompany.phone || '',
      website: selectedCompany.website || '',
      plan: selectedCompany.plan,
      currency: selectedCompany.currency,
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: ''
    });
    setModalOpen(true);
    handleMenuClose();
  };

  const handleViewCompany = () => {
    setModalType('view');
    setEditingCompanyId(null); // Reset editing company ID
    setModalOpen(true);
    handleMenuClose();
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) {
      setError('لم يتم تحديد شركة للحذف');
      handleMenuClose();
      return;
    }

    // Confirm deletion
    if (!window.confirm(`هل أنت متأكد من حذف شركة "${selectedCompany.name}"؟`)) {
      handleMenuClose();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('غير مخول بالدخول - الرجاء تسجيل الدخول أولاً');
        setLoading(false);
        handleMenuClose();
        return;
      }
      
      // Delete company
      const response = await fetch(buildApiUrl(`admin/companies/${selectedCompany.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`خطأ في الاتصال بالخادم: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Refresh companies list
        await fetchCompanies();
        setError(null);
      } else {
        setError(data.message || 'فشل في حذف الشركة');
      }
    } catch (err) {
      console.error('Error deleting company:', err);
      setError(`فشل في الاتصال بالخادم: ${err.message}`);
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('غير مخول بالدخول - الرجاء تسجيل الدخول أولاً');
        setSubmitting(false);
        return;
      }
      
      // Validate that we have a selected company for edit operations
      if (modalType === 'edit') {
        if (!editingCompanyId) {
          console.error('No company ID for edit operation');
          setError('لم يتم تحديد شركة للتعديل');
          setSubmitting(false);
          return;
        }
      }
      
      console.log('Submitting company data:', { modalType, selectedCompany, editingCompanyId, formData }); // Debug log
      
      const url = modalType === 'create' 
        ? buildApiUrl('admin/companies')
        : buildApiUrl(`admin/companies/${editingCompanyId}`);
      
      const method = modalType === 'create' ? 'POST' : 'PUT';
      
      const body = modalType === 'create' ? formData : {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        plan: formData.plan,
        currency: formData.currency
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`خطأ في الاتصال بالخادم: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchCompanies();
        setModalOpen(false);
        setEditingCompanyId(null); // Reset editing company ID on successful submission
        setError(null);
      } else {
        setError(data.message || 'فشل في حفظ الشركة');
      }
    } catch (err) {
      console.error('Error submitting company:', err);
      setError(`فشل في الاتصال بالخادم: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewFacebookPages = async (company) => {
    console.log('Viewing Facebook pages for company:', company); // Debug log
    
    // Validate company parameter
    if (!company || !company.id) {
      setError('بيانات الشركة غير صحيحة');
      return;
    }
    
    try {
      setLoadingPages(true);
      setError(null);
      setSelectedCompany(company);
      setFacebookPagesModalOpen(true);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('غير مخول بالدخول - الرجاء تسجيل الدخول أولاً');
        setLoadingPages(false);
        return;
      }
      
      // جلب صفحات الفيسبوك للشركة المحددة
      console.log(`Fetching Facebook pages for company ID: ${company.id}`);
      const response = await fetch(buildApiUrl(`admin/companies/${company.id}/facebook-pages`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response body: ${errorText}`);
        throw new Error(`خطأ في الاتصال بالخادم: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Facebook pages data:', data);
      if (data.success) {
        setSelectedCompanyPages(data.data || []);
      } else {
        setSelectedCompanyPages([]);
        setError(data.message || 'فشل في جلب صفحات الفيسبوك');
      }
    } catch (err) {
      console.error('Error fetching Facebook pages:', err);
      setSelectedCompanyPages([]);
      setError(`فشل في الاتصال بالخادم: ${err.message}`);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleLoginAsCompanyAdmin = async (company) => {
    // Use the company parameter passed to the function instead of selectedCompany
    if (!company) {
      setError('لم يتم تحديد شركة');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('غير مخول بالدخول - الرجاء تسجيل الدخول أولاً');
        setLoading(false);
        return;
      }
      
      // طلب تسجيل الدخول كأدمن الشركة
      const response = await fetch(buildApiUrl(`admin/companies/${company.id}/login-as-admin`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`خطأ في الاتصال بالخادم: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // حفظ بيانات تسجيل الدخول الجديدة
        localStorage.setItem('accessToken', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        // إعادة توجيه إلى لوحة تحكم الشركة
        window.location.href = '/dashboard';
      } else {
        setError(data.message || 'فشل في تسجيل الدخول كأدمن الشركة');
      }
    } catch (err) {
      console.error('Error logging in as company admin:', err);
      setError(`فشل في الاتصال بالخادم: ${err.message}`);
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'BASIC': return 'info';
      case 'PRO': return 'warning';
      case 'ENTERPRISE': return 'success';
      default: return 'default';
    }
  };

  const getPlanName = (plan) => {
    switch (plan) {
      case 'BASIC': return 'أساسي';
      case 'PRO': return 'احترافي';
      case 'ENTERPRISE': return 'مؤسسي';
      default: return plan;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>جاري تحميل الشركات...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            إدارة الشركات
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إدارة جميع الشركات في النظام
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateCompany}
        >
          إضافة شركة جديدة
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Companies Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>اسم الشركة</TableCell>
                  <TableCell>البريد الإلكتروني</TableCell>
                  <TableCell>الخطة</TableCell>
                  <TableCell>المستخدمين</TableCell>
                  <TableCell>العملاء</TableCell>
                  <TableCell>صفحات الفيسبوك</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <BusinessIcon color="action" />
                        {company.name}
                      </Box>
                    </TableCell>
                    <TableCell>{company.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getPlanName(company.plan)} 
                        color={getPlanColor(company.plan)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{company._count.users}</TableCell>
                    <TableCell>{company._count.customers}</TableCell>
                    <TableCell>
                      <Chip 
                        label={company._count.facebookPages || 0}
                        color={company._count.facebookPages > 0 ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleViewFacebookPages(company)}
                        sx={{ cursor: 'pointer' }}
                        variant={company._count.facebookPages > 0 ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={company.isActive ? 'نشط' : 'غير نشط'}
                        color={company.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        onClick={(e) => {
                          console.log('Opening menu for company:', company); // Debug log
                          handleMenuOpen(e, company);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleViewCompany();
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          عرض التفاصيل
        </MenuItem>
        <MenuItem onClick={() => {
          handleEditCompany();
        }}>
          <EditIcon sx={{ mr: 1 }} />
          تعديل
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (selectedCompany) {
              const company = selectedCompany; // Capture the company before closing menu
              handleMenuClose(); // Close menu first
              handleLoginAsCompanyAdmin(company); // Then proceed with login
            } else {
              setError('لم يتم تحديد شركة');
              handleMenuClose();
            }
          }}
          sx={{ color: 'primary.main' }}
          disabled={!selectedCompany}
        >
          <LoginIcon sx={{ mr: 1 }} />
          دخول كأدمن الشركة
        </MenuItem>
        <MenuItem 
          onClick={() => {
            handleDeleteCompany();
          }} 
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          حذف
        </MenuItem>
      </Menu>

      {/* Company Modal */}
      <Dialog open={modalOpen} onClose={() => {
        setModalOpen(false);
        setEditingCompanyId(null); // Reset editing company ID when modal is closed
      }} maxWidth="md" fullWidth>
        <DialogTitle>
          {modalType === 'create' && 'إضافة شركة جديدة'}
          {modalType === 'edit' && 'تعديل الشركة'}
          {modalType === 'view' && 'تفاصيل الشركة'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="اسم الشركة"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={modalType === 'view'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="البريد الإلكتروني"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={modalType === 'view'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>الخطة</InputLabel>
                  <Select
                    value={formData.plan}
                    label="الخطة"
                    onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
                    disabled={modalType === 'view'}
                  >
                    <MenuItem value="BASIC">أساسي</MenuItem>
                    <MenuItem value="PRO">احترافي</MenuItem>
                    <MenuItem value="ENTERPRISE">مؤسسي</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>العملة</InputLabel>
                  <Select
                    value={formData.currency}
                    label="العملة"
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    disabled={modalType === 'view'}
                  >
                    <MenuItem value="EGP">جنيه مصري</MenuItem>
                    <MenuItem value="USD">دولار أمريكي</MenuItem>
                    <MenuItem value="EUR">يورو</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {modalType === 'create' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                      بيانات مدير الشركة
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="الاسم الأول للمدير"
                      value={formData.adminFirstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, adminFirstName: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="الاسم الأخير للمدير"
                      value={formData.adminLastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, adminLastName: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="بريد المدير الإلكتروني"
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="كلمة مرور المدير"
                      type="password"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>
            إلغاء
          </Button>
          {modalType !== 'view' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting}
            >
              {submitting ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Facebook Pages Modal */}
      <Dialog 
        open={facebookPagesModalOpen} 
        onClose={() => setFacebookPagesModalOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <FacebookIcon color="primary" />
            صفحات الفيسبوك - {selectedCompany?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingPages ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>جاري تحميل صفحات الفيسبوك...</Typography>
            </Box>
          ) : (
            <Box sx={{ pt: 2 }}>
              {selectedCompanyPages.length === 0 ? (
                <Typography variant="body1" color="text.secondary" textAlign="center">
                  لا توجد صفحات فيسبوك مربوطة بهذه الشركة
                </Typography>
              ) : (
                <List>
                  {selectedCompanyPages.map((page, index) => (
                    <React.Fragment key={page.id}>
                      <ListItem>
                        <ListItemIcon>
                          {page.status === 'connected' || page.status === 'active' ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <ErrorIcon color="error" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="h6">{page.pageName}</Typography>
                              <Chip 
                                label={page.status === 'connected' || page.status === 'active' ? 'متصل' : 'غير متصل'}
                                color={page.status === 'connected' || page.status === 'active' ? 'success' : 'error'}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                <strong>معرف الصفحة:</strong> {page.pageId}
                              </Typography>
                              {page.connectedAt && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>تاريخ الربط:</strong> {new Date(page.connectedAt).toLocaleDateString('ar-EG')}
                                </Typography>
                              )}
                              {page.updatedAt && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>آخر نشاط:</strong> {new Date(page.updatedAt).toLocaleDateString('ar-EG')}
                                </Typography>
                              )}
                              {page.messageCount !== undefined && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>عدد الرسائل:</strong> {page.messageCount}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < selectedCompanyPages.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFacebookPagesModalOpen(false)}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminCompanies;