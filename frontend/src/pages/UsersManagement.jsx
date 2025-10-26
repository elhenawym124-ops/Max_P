import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Switch,
  FormControlLabel,
  Alert,
  Tooltip,
  Pagination,
  CircularProgress,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuthSimple';
import { buildApiUrl } from '../utils/urlHelper';

/**
 * Users Management Page
 * 
 * Manages users within a company
 */

const UsersManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Plan limits state
  const [planLimits, setPlanLimits] = useState(null);
  const [limitsLoading, setLimitsLoading] = useState(true);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isActive: ''
  });
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Invitations state
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'AGENT',
    isActive: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Invitation form state
  const [inviteFormData, setInviteFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'AGENT'
  });
  const [inviteFormErrors, setInviteFormErrors] = useState({});
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  
  // Roles data
  const [roles, setRoles] = useState({});

  // Fetch users
  const fetchUsers = async () => {
    if (!user?.companyId) return;
    
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });

      const response = await fetch(buildApiUrl(`companies/${user.companyId}/users?${queryParams}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.total);
        setError(null);
      } else {
        setError(data.message || 'فشل في جلب المستخدمين');
      }
    } catch (err) {
      setError('فشل في جلب البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch roles
  const fetchRoles = async () => {
    if (!user?.companyId) return;

    try {
      const response = await fetch(buildApiUrl(`companies/${user.companyId}/roles`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  // Fetch plan limits
  const fetchPlanLimits = async () => {
    if (!user?.companyId) return;

    try {
      setLimitsLoading(true);
      const response = await fetch(buildApiUrl('company/limits'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setPlanLimits(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch plan limits:', err);
    } finally {
      setLimitsLoading(false);
    }
  };

  // Fetch invitations
  const fetchInvitations = async () => {
    if (!user?.companyId) return;

    try {
      setInvitationsLoading(true);
      const response = await fetch(buildApiUrl(`companies/${user.companyId}/invitations`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setInvitations(data.data.invitations);
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    } finally {
      setInvitationsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchPlanLimits();
    fetchInvitations();
  }, [page, limit, filters, user?.companyId]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filtering
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      role: 'AGENT',
      isActive: true
    });
    setFormErrors({});
  };

  // Reset invite form
  const resetInviteForm = () => {
    setInviteFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'AGENT'
    });
    setInviteFormErrors({});
  };

  // Check if can add new user
  const canAddUser = () => {
    if (!planLimits) return true;

    const userUsage = planLimits.usage.users;
    if (userUsage.limit === -1) return true; // Unlimited

    return userUsage.current < userUsage.limit;
  };

  // Open new user modal
  const handleAddUser = () => {
    if (!canAddUser()) {
      const userUsage = planLimits.usage.users;
      setError(`تم الوصول للحد الأقصى من المستخدمين (${userUsage.current}/${userUsage.limit}). يرجى ترقية خطتك لإضافة المزيد من المستخدمين.`);
      return;
    }

    resetForm();
    setModalOpen(true);
  };

  // Open invite user modal
  const handleInviteUser = () => {
    if (!canAddUser()) {
      const userUsage = planLimits.usage.users;
      setError(`تم الوصول للحد الأقصى من المستخدمين (${userUsage.current}/${userUsage.limit}). يرجى ترقية خطتك لإضافة المزيد من المستخدمين.`);
      return;
    }

    resetInviteForm();
    setInviteModalOpen(true);
  };

  // Open edit user modal
  const handleEditUser = (user) => {
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '', // Don't pre-fill password
      phone: user.phone || '',
      role: user.role || 'AGENT',
      isActive: user.isActive !== undefined ? user.isActive : true
    });
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'الاسم الأول مطلوب';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'الاسم الأخير مطلوب';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }
    
    if (!editModalOpen && !formData.password.trim()) {
      errors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form (create or update)
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const url = editModalOpen 
        ? buildApiUrl(`companies/${user.companyId}/users/${selectedUser.id}`)
        : buildApiUrl(`companies/${user.companyId}/users`);
      
      const method = editModalOpen ? 'PUT' : 'POST';
      
      // Don't send password if it's empty in edit mode
      const submitData = { ...formData };
      if (editModalOpen && !submitData.password) {
        delete submitData.password;
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh users list and limits
        await fetchUsers();
        await fetchPlanLimits();

        // Close modal and reset form
        setModalOpen(false);
        setEditModalOpen(false);
        resetForm();
        setSelectedUser(null);

        // Show success message
        setError(null);
      } else {
        // Handle limit exceeded error specially
        if (data.error === 'LIMIT_EXCEEDED') {
          setError(`${data.message}\n\nالحد الحالي: ${data.details.current}/${data.details.limit} مستخدم`);
        } else {
          setError(data.message || 'فشل في حفظ المستخدم');
        }
      }
    } catch (err) {
      setError('فشل في حفظ المستخدم: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userToDelete) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${userToDelete.firstName} ${userToDelete.lastName}"؟`)) {
      return;
    }
    
    try {
      const response = await fetch(buildApiUrl(`companies/${user.companyId}/users/${userToDelete.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchUsers();
        setError(null);
      } else {
        setError(data.message || 'فشل في حذف المستخدم');
      }
    } catch (err) {
      setError('فشل في حذف المستخدم: ' + err.message);
    }
  };

  // Send invitation
  const handleSendInvitation = async () => {
    // Validation
    const errors = {};
    if (!inviteFormData.firstName) errors.firstName = 'الاسم الأول مطلوب';
    if (!inviteFormData.lastName) errors.lastName = 'الاسم الأخير مطلوب';
    if (!inviteFormData.email) errors.email = 'البريد الإلكتروني مطلوب';
    if (!inviteFormData.role) errors.role = 'الدور مطلوب';

    if (Object.keys(errors).length > 0) {
      setInviteFormErrors(errors);
      return;
    }

    try {
      setInviteSubmitting(true);

      const response = await fetch(buildApiUrl(`companies/${user.companyId}/invitations`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inviteFormData)
      });

      const data = await response.json();

      if (data.success) {
        // Refresh invitations list
        await fetchInvitations();
        await fetchPlanLimits();

        // Close modal and reset form
        setInviteModalOpen(false);
        resetInviteForm();

        // Show success message with invitation link
        setError(null);
        alert(`تم إرسال الدعوة بنجاح!

رابط الدعوة:
${data.data.invitationLink}

${data.data.emailSent ? 'تم إرسال البريد الإلكتروني' : 'لم يتم إرسال البريد الإلكتروني'}`);
      } else {
        // Handle limit exceeded error specially
        if (data.error === 'LIMIT_EXCEEDED') {
          setError(`${data.message}\n\nالحد الحالي: ${data.details.current}/${data.details.limit} مستخدم`);
        } else {
          setError(data.message || 'فشل في إرسال الدعوة');
        }
      }
    } catch (err) {
      setError('فشل في إرسال الدعوة: ' + err.message);
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Copy invitation link
  const copyInvitationLink = (invitation) => {
    const link = `${window.location.origin}/auth/accept-invitation?token=${invitation.token}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('تم نسخ رابط الدعوة!');
    }).catch(() => {
      alert(`رابط الدعوة:\n${link}`);
    });
  };

  // Get role display name
  const getRoleDisplayName = (role) => {
    return roles[role]?.name || role;
  };

  // Get role color
  const getRoleColor = (role) => {
    switch (role) {
      case 'COMPANY_ADMIN': return 'error';
      case 'MANAGER': return 'warning';
      case 'AGENT': return 'primary';
      default: return 'default';
    }
  };

  if (loading && users.length === 0) {
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
          <Typography variant="h4" component="h1">
            إدارة المستخدمين
          </Typography>
          {planLimits && (
            <Typography variant="body2" color="text.secondary" mt={1}>
              {planLimits.usage.users.current} من {planLimits.usage.users.limit === -1 ? 'غير محدود' : planLimits.usage.users.limit} مستخدم
              {planLimits.usage.users.limit !== -1 && (
                <span style={{ marginLeft: 8 }}>
                  ({planLimits.usage.users.percentage}% مستخدم)
                </span>
              )}
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddUser}
            disabled={!canAddUser()}
          >
            إضافة مستخدم جديد
          </Button>
          <Button
            variant="outlined"
            startIcon={<PersonIcon />}
            onClick={handleInviteUser}
            disabled={!canAddUser()}
          >
            دعوة مستخدم
          </Button>
        </Box>
      </Box>

      {/* Plan Limits Warning */}
      {planLimits && planLimits.usage.users.percentage >= 80 && planLimits.usage.users.limit !== -1 && (
        <Alert
          severity={planLimits.usage.users.percentage >= 95 ? 'error' : 'warning'}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {planLimits.usage.users.percentage >= 95 ? 'تحذير: وصلت للحد الأقصى!' : 'تحذير: اقتراب من الحد الأقصى'}
          </Typography>
          <Typography variant="body2">
            لقد استخدمت {planLimits.usage.users.current} من {planLimits.usage.users.limit} مستخدم
            ({planLimits.usage.users.percentage}%).
            {planLimits.usage.users.percentage >= 95
              ? ' يرجى ترقية خطتك لإضافة المزيد من المستخدمين.'
              : ' فكر في ترقية خطتك قريباً.'
            }
          </Typography>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="البحث"
                placeholder="البحث بالاسم أو البريد الإلكتروني"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>الدور</InputLabel>
                <Select
                  value={filters.role}
                  label="الدور"
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(roles).map(([key, role]) => (
                    <MenuItem key={key} value={key}>{role.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={filters.isActive}
                  label="الحالة"
                  onChange={(e) => handleFilterChange('isActive', e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="true">نشط</MenuItem>
                  <MenuItem value="false">غير نشط</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>عدد النتائج</InputLabel>
                <Select
                  value={limit}
                  label="عدد النتائج"
                  onChange={(e) => setLimit(Number(e.target.value))}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              المستخدمين ({totalCount})
            </Typography>
            {loading && <CircularProgress size={20} />}
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>المستخدم</TableCell>
                  <TableCell>البريد الإلكتروني</TableCell>
                  <TableCell>الهاتف</TableCell>
                  <TableCell>الدور</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>آخر دخول</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {user.id.slice(-8)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {user.email}
                      </Typography>
                      {user.isEmailVerified && (
                        <Chip
                          label="مُتحقق"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {user.phone || '-'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={getRoleDisplayName(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={user.isActive ? 'نشط' : 'غير نشط'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString('ar-EG')
                          : 'لم يدخل بعد'
                        }
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title="تعديل">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.role === 'COMPANY_ADMIN' && users.filter(u => u.role === 'COMPANY_ADMIN' && u.isActive).length <= 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

                {users.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        لا توجد مستخدمين
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, newPage) => setPage(newPage)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit User Modal */}
      <Dialog
        open={modalOpen || editModalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditModalOpen(false);
          resetForm();
          setSelectedUser(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editModalOpen ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الاسم الأول *"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                error={!!formErrors.firstName}
                helperText={formErrors.firstName}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الاسم الأخير *"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                error={!!formErrors.lastName}
                helperText={formErrors.lastName}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني *"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!formErrors.email}
                helperText={formErrors.email}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={editModalOpen ? "كلمة المرور (اتركها فارغة للاحتفاظ بالحالية)" : "كلمة المرور *"}
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={!!formErrors.password}
                helperText={formErrors.password}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رقم الهاتف"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                error={!!formErrors.phone}
                helperText={formErrors.phone}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>الدور</InputLabel>
                <Select
                  value={formData.role}
                  label="الدور"
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  disabled={submitting}
                >
                  {Object.entries(roles).map(([key, role]) => (
                    <MenuItem key={key} value={key}>{role.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    disabled={submitting}
                  />
                }
                label="نشط"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setModalOpen(false);
              setEditModalOpen(false);
              resetForm();
              setSelectedUser(null);
            }}
            disabled={submitting}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? 'جاري الحفظ...' : (editModalOpen ? 'تحديث' : 'إنشاء')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite User Modal */}
      <Dialog open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>دعوة مستخدم جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="الاسم الأول"
                  value={inviteFormData.firstName}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  error={!!inviteFormErrors.firstName}
                  helperText={inviteFormErrors.firstName}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="الاسم الأخير"
                  value={inviteFormData.lastName}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  error={!!inviteFormErrors.lastName}
                  helperText={inviteFormErrors.lastName}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="البريد الإلكتروني"
                  type="email"
                  value={inviteFormData.email}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, email: e.target.value }))}
                  error={!!inviteFormErrors.email}
                  helperText={inviteFormErrors.email}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!inviteFormErrors.role}>
                  <InputLabel>الدور</InputLabel>
                  <Select
                    value={inviteFormData.role}
                    label="الدور"
                    onChange={(e) => setInviteFormData(prev => ({ ...prev, role: e.target.value }))}
                  >
                    {Object.entries(roles).map(([roleKey, roleData]) => (
                      <MenuItem key={roleKey} value={roleKey}>
                        {roleData.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {inviteFormErrors.role && <FormHelperText>{inviteFormErrors.role}</FormHelperText>}
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={handleSendInvitation}
            variant="contained"
            disabled={inviteSubmitting}
            startIcon={inviteSubmitting ? <CircularProgress size={20} /> : <PersonIcon />}
          >
            {inviteSubmitting ? 'جاري الإرسال...' : 'إرسال الدعوة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersManagement;
