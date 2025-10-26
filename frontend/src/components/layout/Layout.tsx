import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuthSimple';
import NotificationDropdown from '../notifications/NotificationDropdown';
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftIcon,
  Cog6ToothIcon,
  BellIcon,
  ChevronDownIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CogIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CheckCircleIcon,
  SpeakerWaveIcon,
  TagIcon,
  ArchiveBoxIcon,
  TicketIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  CreditCardIcon,
  PresentationChartLineIcon,
  WrenchScrewdriverIcon,
  BellAlertIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  KeyIcon,
  MapPinIcon,
  DocumentCheckIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  // Helper function for navigation links
  const NavLink: React.FC<{
    to: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  }> = ({ to, icon, children, variant = 'default' }) => {
    const isActive = location.pathname === to;

    const getVariantClasses = () => {
      if (isActive) {
        return 'bg-blue-50 text-blue-600 border-r-2 border-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
      }

      switch (variant) {
        case 'primary':
          return 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800';
        case 'success':
          return 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-200 dark:border-green-800';
        case 'warning':
          return 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-200 dark:border-amber-800';
        case 'danger':
          return 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800';
        default:
          return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
      }
    };

    return (
      <Link
        to={to}
        className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${getVariantClasses()}`}
      >
        <span className="mr-3">{icon}</span>
        {children}
      </Link>
    );
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 h-full bg-white dark:bg-gray-800 shadow-lg flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                منصة التواصل
              </h1>
            </div>
          </div>
          <nav className="flex-1 py-4 overflow-y-auto sidebar-scroll">
            <div className="px-4 space-y-1">
              {/* القسم الرئيسي */}
              <div className="mb-6">
                <h3 className="px-4 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الرئيسية
                </h3>
                <div className="space-y-1">
                  <NavLink to="/dashboard" icon={<ChartBarIcon className="h-5 w-5" />}>
                    لوحة التحكم
                  </NavLink>
                </div>
              </div>

              {/* قسم التواصل */}
              <div className="mb-6">
                <h3 className="px-4 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  التواصل
                </h3>
                <div className="space-y-1">
                  <NavLink to="/conversations-improved" icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />} variant="primary">
                    المحادثات
                  </NavLink>
                  <NavLink to="/unified-comments" icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />} variant="success">
                    المنشورات والتعليقات
                  </NavLink>
                  <NavLink to="/customers" icon={<UsersIcon className="h-5 w-5" />}>
                    العملاء
                  </NavLink>
                  <NavLink to="/broadcast" icon={<SpeakerWaveIcon className="h-5 w-5" />} variant="primary">
                    البرودكاست
                  </NavLink>
                </div>
              </div>

              {/* قسم التجارة الإلكترونية */}
              <div className="mb-6">
                <h3 className="px-4 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  التجارة الإلكترونية
                </h3>
                <div className="space-y-1">
                  <NavLink to="/products" icon={<ShoppingBagIcon className="h-5 w-5" />}>
                    المنتجات
                  </NavLink>
                  <NavLink to="/categories" icon={<TagIcon className="h-5 w-5" />}>
                    الفئات
                  </NavLink>
                  <NavLink to="/orders" icon={<ArchiveBoxIcon className="h-5 w-5" />}>
                    الطلبات
                  </NavLink>
                  <NavLink to="/inventory" icon={<ClipboardDocumentListIcon className="h-5 w-5" />}>
                    المخزون
                  </NavLink>
                  <NavLink to="/coupons" icon={<TicketIcon className="h-5 w-5" />}>
                    الكوبونات
                  </NavLink>
                  <NavLink to="/store-settings" icon={<MapPinIcon className="h-5 w-5" />} variant="primary">
                    إعدادات المتجر
                  </NavLink>
                </div>
              </div>

              {/* قسم الأعمال */}
              <div className="mb-6">
                <h3 className="px-4 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الأعمال
                </h3>
                <div className="space-y-1">
                  <NavLink to="/appointments" icon={<CalendarIcon className="h-5 w-5" />}>
                    المواعيد
                  </NavLink>
                  <NavLink to="/tasks" icon={<CheckCircleIcon className="h-5 w-5" />}>
                    المهام
                  </NavLink>
                </div>
              </div>

              {/* قسم الذكاء الاصطناعي */}
              <div className="mb-6">
                <h3 className="px-4 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الذكاء الاصطناعي
                </h3>
                <div className="space-y-1">
                  <NavLink to="/ai-management" icon={<BeakerIcon className="h-5 w-5" />} variant="primary">
                    إدارة AI
                  </NavLink>
                  <NavLink to="/quality-advanced" icon={<PresentationChartLineIcon className="h-5 w-5" />} variant="primary">
                    جودة الردود
                  </NavLink>
                  <NavLink to="/ai-quality" icon={<BeakerIcon className="h-5 w-5" />}>
                    التقييم الذكي
                  </NavLink>
                  <NavLink to="/learning/settings" icon={<CogIcon className="h-5 w-5" />}>
                    إعدادات التعلم
                  </NavLink>
                  <NavLink to="/success-analytics" icon={<PresentationChartLineIcon className="h-5 w-5" />} variant="success">
                    أنماط النجاح
                  </NavLink>
                  <NavLink to="/pattern-management" icon={<WrenchScrewdriverIcon className="h-5 w-5" />}>
                    إدارة الأنماط
                  </NavLink>
                </div>
              </div>

              {/* قسم التحليلات */}
              <div className="mb-6">
                <h3 className="px-4 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  التحليلات
                </h3>
                <div className="space-y-1">
                  <NavLink to="/reports" icon={<ChartBarIcon className="h-5 w-5" />}>
                    التقارير
                  </NavLink>
                  <NavLink to="/analytics" icon={<PresentationChartLineIcon className="h-5 w-5" />}>
                    التحليلات المتقدمة
                  </NavLink>
                </div>
              </div>

              {/* قسم المدفوعات */}
              <div className="mb-6">
                <h3 className="px-4 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المدفوعات
                </h3>
                <div className="space-y-1">
                  <NavLink to="/subscription" icon={<CreditCardIcon className="h-5 w-5" />} variant="primary">
                    اشتراكي
                  </NavLink>
                  <NavLink to="/invoices" icon={<DocumentTextIcon className="h-5 w-5" />}>
                    الفواتير
                  </NavLink>
                  <NavLink to="/payments" icon={<BanknotesIcon className="h-5 w-5" />}>
                    المدفوعات
                  </NavLink>
                </div>
              </div>

              {/* قسم الإشعارات */}
              <div className="mb-6">
                <h3 className="px-4 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الإشعارات
                </h3>
                <div className="space-y-1">
                  <NavLink to="/notifications" icon={<BellIcon className="h-5 w-5" />}>
                    الإشعارات
                  </NavLink>
                  <NavLink to="/reminders" icon={<BellAlertIcon className="h-5 w-5" />}>
                    التذكيرات
                  </NavLink>
                  <NavLink to="/notification-settings" icon={<CogIcon className="h-5 w-5" />}>
                    إعدادات الإشعارات
                  </NavLink>
                </div>
              </div>

              {/* قسم الإدارة - للمديرين فقط */}
              {(user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN') && (
                <div className="mb-6">
                  <h3 className="px-4 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الإدارة
                  </h3>
                  <div className="space-y-1">
                    {user?.role === 'SUPER_ADMIN' && (
                      <NavLink to="/companies" icon={<BuildingOfficeIcon className="h-5 w-5" />} variant="warning">
                        إدارة الشركات
                      </NavLink>
                    )}
                    <NavLink to="/users" icon={<UserGroupIcon className="h-5 w-5" />}>
                      المستخدمين
                    </NavLink>
                    <NavLink to="/roles" icon={<KeyIcon className="h-5 w-5" />}>
                      الأدوار والصلاحيات
                    </NavLink>
                    <NavLink to="/admin/dashboard" icon={<WrenchScrewdriverIcon className="h-5 w-5" />} variant="danger">
                      لوحة التحكم الإدارية
                    </NavLink>
                    <NavLink to="/monitoring" icon={<ChartBarIcon className="h-5 w-5" />} variant="success">
                      مراقبة النظام
                    </NavLink>
                    <NavLink to="/alert-settings" icon={<ExclamationTriangleIcon className="h-5 w-5" />} variant="warning">
                      إعدادات التنبيهات
                    </NavLink>
                  </div>
                </div>
              )}

              {/* قسم الإعدادات */}
              <div className="mb-6">
                <h3 className="px-4 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الإعدادات
                </h3>
                <div className="space-y-1">
                  <NavLink to="/settings" icon={<CogIcon className="h-5 w-5" />}>
                    الإعدادات العامة
                  </NavLink>
                  <NavLink to="/terms" icon={<DocumentCheckIcon className="h-5 w-5" />}>
                    الشروط والأحكام
                  </NavLink>
                  <NavLink to="/privacy" icon={<ShieldExclamationIcon className="h-5 w-5" />}>
                    سياسة الخصوصية
                  </NavLink>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                {/* تنبيه دخول المدير العام */}
                {(user as any)?.loginType === 'super_admin_impersonation' && (
                  <div className="flex items-center bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mr-4">
                    <svg className="h-5 w-5 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm font-medium text-orange-700 ml-2">
                      تم تسجيل الدخول بواسطة مدير النظام 🔑
                    </span>
                    <button
                      onClick={() => window.location.href = '/super-admin/companies'}
                      className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded text-sm mr-3 transition-colors"
                    >
                      العودة لإدارة الشركات
                    </button>
                  </div>
                )}
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  مرحباً بك
                </h2>
                <div className="flex items-center space-x-4 space-x-reverse">
                  {/* Notifications */}
                  <NotificationDropdown />

                  {/* Profile Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center space-x-2 space-x-reverse text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 p-2"
                    >
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-700">
                          {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div className="hidden md:block text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user?.firstName} {user?.lastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</div>
                      </div>
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileMenuOpen && (
                      <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                            <div className="font-medium">{user?.firstName} {user?.lastName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</div>
                            <div className="text-xs text-indigo-600 dark:text-indigo-400">{user?.company?.name}</div>
                          </div>

                          <Link
                            to="/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            <UserCircleIcon className="h-4 w-4 ml-2" />
                            الملف الشخصي
                          </Link>

                          <Link
                            to="/settings"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            <Cog6ToothIcon className="h-4 w-4 ml-2" />
                            الإعدادات
                          </Link>

                          {/* زر العودة لمدير النظام */}
                          {(user as any)?.loginType === 'super_admin_impersonation' && (
                            <Link
                              to="/super-admin/companies"
                              className="flex items-center px-4 py-2 text-sm text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-t border-gray-100 dark:border-gray-700"
                              onClick={() => setIsProfileMenuOpen(false)}
                            >
                              <ArrowLeftIcon className="h-4 w-4 ml-2" />
                              العودة لإدارة الشركات
                            </Link>
                          )}

                          <div className="border-t border-gray-100 dark:border-gray-700">
                            <button
                              onClick={handleLogout}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <ArrowRightOnRectangleIcon className="h-4 w-4 ml-2" />
                              تسجيل الخروج
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Overlay for dropdown */}
          {isProfileMenuOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsProfileMenuOpen(false)}
            />
          )}

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
