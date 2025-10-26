import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  AttachMoney as PlansIcon,
  AccountBalanceWallet as WalletIcon,
  AutoAwesome as PromptIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuthSimple';

const drawerWidth = 280;

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/super-admin/login');
    handleProfileMenuClose();
  };

  const menuItems = [
    {
      text: 'لوحة التحكم',
      icon: <DashboardIcon />,
      path: '/super-admin/dashboard'
    },
    {
      text: 'إدارة الشركات',
      icon: <BusinessIcon />,
      path: '/super-admin/companies'
    },
    {
      text: 'التقارير والتحليلات',
      icon: <AssessmentIcon />,
      path: '/super-admin/reports'
    },
    {
      text: 'الخطط والأسعار',
      icon: <PlansIcon />,
      path: '/super-admin/plans'
    },
    {
      text: 'إدارة الاشتراكات',
      icon: <BusinessIcon />,
      path: '/super-admin/subscriptions'
    },
    {
      text: 'إدارة الفواتير',
      icon: <AssessmentIcon />,
      path: '/super-admin/invoices'
    },
    {
      text: 'إدارة المدفوعات',
      icon: <BusinessIcon />,
      path: '/super-admin/payments'
    },
    {
      text: 'إدارة المحافظ',
      icon: <WalletIcon />,
      path: '/super-admin/wallet-management'
    },
    {
      text: 'مكتبة البرومبتات',
      icon: <PromptIcon />,
      path: '/super-admin/prompt-library'
    },
    {
      text: 'إدارة أنظمة النظام',
      icon: <SettingsIcon />,
      path: '/super-admin/system-management'
    },
    {
      text: 'إعدادات النظام',
      icon: <SettingsIcon />,
      path: '/super-admin/settings'
    }
  ];

  const drawer = (
    <div>
      {/* Logo and Title */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: 'primary.main',
            mx: 'auto',
            mb: 1
          }}
        >
          <AdminIcon />
        </Avatar>
        <Typography variant="h6" noWrap component="div">
          مدير النظام
        </Typography>
        <Chip 
          label="SUPER ADMIN" 
          color="error" 
          size="small" 
          sx={{ mt: 1 }}
        />
      </Box>

      <Divider />

      {/* Navigation Menu */}
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path ? 'primary.main' : 'inherit'
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                sx={{
                  color: location.pathname === item.path ? 'primary.main' : 'inherit'
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ mt: 'auto' }} />

      {/* User Info */}
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          مرحباً، {user?.firstName} {user?.lastName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {user?.email}
        </Typography>
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: 'flex', direction: 'rtl' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mr: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            نظام إدارة الشركات
          </Typography>

          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="end"
            onClick={handleDrawerToggle}
            sx={{ ml: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Profile Menu */}
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="profile-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar
              sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
            >
              {user?.firstName?.charAt(0)}
            </Avatar>
          </IconButton>
          
          <Menu
            id="profile-menu"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              تسجيل الخروج
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          anchor="right"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          anchor="right"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          mr: { sm: 0 },
          ml: { sm: 0 }
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default SuperAdminLayout;
