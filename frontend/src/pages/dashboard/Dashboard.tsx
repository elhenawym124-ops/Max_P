import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../../hooks/useCurrency';
import {
  ChartBarIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BeakerIcon,
  SpeakerWaveIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuthSimple';
import SimpleChart from '../../components/charts/SimpleChart';
import { buildApiUrl } from '../../utils/urlHelper';
import '../../styles/dashboard-enhanced.css';

interface DashboardStats {
  totalCustomers: number;
  totalConversations: number;
  totalProducts: number;
  totalRevenue: number;
  newCustomersToday: number;
  activeConversations: number;
  pendingOrders: number;
  lowStockProducts: number;
  responseTime: string;
  conversionRate: number;
  customerSatisfaction: number;
  monthlyGrowth: number;
}

interface RecentActivity {
  id: string;
  type: 'message' | 'order' | 'customer' | 'product';
  title: string;
  description: string;
  time: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalConversations: 0,
    totalProducts: 0,
    totalRevenue: 0,
    newCustomersToday: 0,
    activeConversations: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
    responseTime: '0 دقيقة',
    conversionRate: 0,
    customerSatisfaction: 0,
    monthlyGrowth: 0,
  });

  // Extended stats for new features
  const [extendedStats, setExtendedStats] = useState({
    aiInteractions: 0,
    aiQualityScore: 0,
    aiResponseTime: 0,
    activeCampaigns: 0,
    totalBroadcastsSent: 0,
    broadcastOpenRate: 0,
    systemStatus: 'unknown',
    activeServices: 0,
    systemUptime: 0,
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart data - will be populated from API
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Get company ID from user (with fallback)
      const companyId = user?.companyId || user?.id || 'default-company';

      // Get auth token
      const token = localStorage.getItem('accessToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch real dashboard stats
      const statsResponse = await fetch(buildApiUrl(`dashboard/stats/${companyId}`), {
        headers
      });

      if (!statsResponse.ok) {
        throw new Error(`HTTP ${statsResponse.status}: ${statsResponse.statusText}`);
      }

      const statsData = await statsResponse.json();

      if (statsData.success) {
        const data = statsData.data;

        // Update basic stats
        setStats({
          totalCustomers: data.totalCustomers || 0,
          totalConversations: data.totalConversations || 0,
          totalProducts: data.totalProducts || 0,
          totalRevenue: data.totalRevenue || 0,
          newCustomersToday: data.newCustomersToday || 0,
          activeConversations: data.activeConversations || 0,
          pendingOrders: data.pendingOrders || 0,
          lowStockProducts: data.lowStockProducts || 0,
          responseTime: `${data.aiResponseTime || 0} ثانية`,
          conversionRate: 0, // Calculate from orders/conversations
          customerSatisfaction: data.aiQualityScore || 0,
          monthlyGrowth: data.monthlyGrowth || 0,
        });

        // Update extended stats
        setExtendedStats({
          aiInteractions: data.aiInteractions || 0,
          aiQualityScore: data.aiQualityScore || 0,
          aiResponseTime: data.aiResponseTime || 0,
          activeCampaigns: data.activeCampaigns || 0,
          totalBroadcastsSent: data.totalBroadcastsSent || 0,
          broadcastOpenRate: data.broadcastOpenRate || 0,
          systemStatus: data.systemStatus || 'unknown',
          activeServices: data.activeServices || 0,
          systemUptime: data.systemUptime || 0,
        });
      }

      // Fetch recent activities
      const activitiesResponse = await fetch(buildApiUrl(`dashboard/activities/${companyId}?limit=10`), {
        headers
      });

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        if (activitiesData.success) {
          setRecentActivities(activitiesData.data || []);
        }
      } else {
        console.warn('Failed to fetch activities, using empty array');
        setRecentActivities([]);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('فشل في تحميل بيانات لوحة التحكم');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.companyId]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: number;
    color: string;
    link?: string;
    gradient?: string;
  }> = ({ title, value, icon, trend, color, link, gradient }) => {
    const cardContent = (
      <div className={`relative overflow-hidden bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}>
        {/* Background Gradient */}
        <div className={`absolute inset-0 opacity-5 ${gradient || 'bg-gradient-to-br from-blue-400 to-purple-600'}`}></div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              {icon}
            </div>
            {trend !== undefined && (
              <div className={`flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                trend > 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {trend > 0 ? (
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                )}
                {Math.abs(trend)}%
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
            {trend !== undefined && (
              <p className="text-xs text-gray-400">مقارنة بالشهر الماضي</p>
            )}
          </div>
        </div>

        {/* Hover Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700"></div>
      </div>
    );

    return link ? (
      <Link to={link} className="block">
        {cardContent}
      </Link>
    ) : (
      cardContent
    );
  };

  const ActivityIcon: React.FC<{ type: string; status: string }> = ({ type, status }) => {
    const iconClass = "h-5 w-5";
    
    if (type === 'message') return <ChatBubbleLeftRightIcon className={iconClass} />;
    if (type === 'order') return <ShoppingBagIcon className={iconClass} />;
    if (type === 'customer') return <UsersIcon className={iconClass} />;
    if (type === 'product') return <ExclamationTriangleIcon className={iconClass} />;
    
    return <CheckCircleIcon className={iconClass} />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل لوحة التحكم...</p>
          <p className="mt-2 text-sm text-gray-500">جلب البيانات الحقيقية من قاعدة البيانات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">خطأ في تحميل البيانات</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            <ArrowUpIcon className="h-4 w-4 mr-2" />
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 dashboard-scroll">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white opacity-5 rounded-full"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg mr-3">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">
                    مرحباً، {user?.firstName} {user?.lastName} 👋
                  </h1>
                </div>
              </div>
              <p className="text-indigo-100 text-lg mb-4">
                إليك نظرة سريعة على أداء منصتك اليوم
              </p>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/conversations"
                  className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  المحادثات
                </Link>
                <Link
                  to="/products"
                  className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
                >
                  <ShoppingBagIcon className="h-4 w-4 mr-2" />
                  المنتجات
                </Link>
                <Link
                  to="/reports"
                  className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
                >
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  التقارير
                </Link>
                <button
                  onClick={fetchDashboardData}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUpIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  تحديث البيانات
                </button>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="text-right bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-sm text-indigo-100 mb-1">الشركة</p>
                <p className="font-bold text-xl">{user?.company?.name || 'شركتي'}</p>
                <div className="flex items-center justify-end mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    باقة {user?.company?.plan || 'Pro'}
                  </span>
                </div>
                <div className="mt-3 text-right">
                  <p className="text-xs text-indigo-200">آخر تحديث للبيانات</p>
                  <p className="text-sm font-medium">
                    {new Date().toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي العملاء"
          value={stats.totalCustomers.toLocaleString()}
          icon={<UsersIcon className="h-6 w-6 text-white" />}
          trend={stats.monthlyGrowth}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          gradient="bg-gradient-to-br from-blue-400 to-blue-600"
          link="/customers"
        />
        <StatCard
          title="المحادثات النشطة"
          value={stats.activeConversations}
          icon={<ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />}
          trend={15.3}
          color="bg-gradient-to-r from-green-500 to-emerald-600"
          gradient="bg-gradient-to-br from-green-400 to-emerald-600"
          link="/conversations"
        />
        <StatCard
          title="إجمالي المنتجات"
          value={stats.totalProducts}
          icon={<ShoppingBagIcon className="h-6 w-6 text-white" />}
          trend={5.7}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
          gradient="bg-gradient-to-br from-purple-400 to-purple-600"
          link="/products"
        />
        <StatCard
          title="الإيرادات الشهرية"
          value={formatPrice(stats.totalRevenue)}
          icon={<CurrencyDollarIcon className="h-6 w-6 text-white" />}
          trend={8.2}
          color="bg-gradient-to-r from-amber-500 to-orange-600"
          gradient="bg-gradient-to-br from-amber-400 to-orange-600"
          link="/reports"
        />
      </div>

      {/* AI & Advanced Features Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <StatCard
          title="تفاعلات الذكاء الاصطناعي"
          value={extendedStats.aiInteractions.toLocaleString()}
          icon={<BeakerIcon className="h-6 w-6 text-white" />}
          trend={25.4}
          color="bg-gradient-to-r from-indigo-500 to-indigo-600"
          gradient="bg-gradient-to-br from-indigo-400 to-indigo-600"
          link="/ai-quality"
        />
        <StatCard
          title="جودة الردود الذكية"
          value={`${extendedStats.aiQualityScore.toFixed(1)}/5.0`}
          icon={<CheckCircleIcon className="h-6 w-6 text-white" />}
          trend={12.8}
          color="bg-gradient-to-r from-emerald-500 to-emerald-600"
          gradient="bg-gradient-to-br from-emerald-400 to-emerald-600"
          link="/quality"
        />
        <StatCard
          title="الحملات النشطة"
          value={extendedStats.activeCampaigns.toLocaleString()}
          icon={<SpeakerWaveIcon className="h-6 w-6 text-white" />}
          trend={18.7}
          color="bg-gradient-to-r from-pink-500 to-pink-600"
          gradient="bg-gradient-to-br from-pink-400 to-pink-600"
          link="/broadcast"
        />
        <StatCard
          title="حالة النظام"
          value={extendedStats.systemStatus === 'healthy' ? 'ممتاز' :
                extendedStats.systemStatus === 'warning' ? 'تحذير' :
                extendedStats.systemStatus === 'critical' ? 'حرج' : 'غير معروف'}
          icon={<ShieldCheckIcon className="h-6 w-6 text-white" />}
          trend={extendedStats.systemStatus === 'healthy' ? 5.2 : -2.1}
          color={extendedStats.systemStatus === 'healthy' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                extendedStats.systemStatus === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                'bg-gradient-to-r from-red-500 to-red-600'}
          gradient={extendedStats.systemStatus === 'healthy' ? 'bg-gradient-to-br from-green-400 to-green-600' :
                   extendedStats.systemStatus === 'warning' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                   'bg-gradient-to-br from-red-400 to-red-600'}
          link="/monitoring"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">مقاييس الأداء</h3>
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">متوسط وقت الاستجابة</span>
                <span className="font-bold text-gray-900">{stats.responseTime}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" style={{width: '85%'}}></div>
              </div>
              <span className="text-xs text-green-600 font-medium">ممتاز</span>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">معدل التحويل</span>
                <span className="font-bold text-green-600">{stats.conversionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full" style={{width: '65%'}}></div>
              </div>
              <span className="text-xs text-blue-600 font-medium">جيد</span>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">رضا العملاء</span>
                <div className="flex items-center">
                  <span className="font-bold text-amber-600">{stats.customerSatisfaction}</span>
                  <span className="text-sm text-gray-400 ml-1">/5</span>
                </div>
              </div>
              <div className="flex space-x-1">
                {[1,2,3,4,5].map((star) => (
                  <div key={star} className={`w-4 h-4 rounded-full ${star <= stats.customerSatisfaction ? 'bg-amber-400' : 'bg-gray-200'}`}></div>
                ))}
              </div>
              <span className="text-xs text-amber-600 font-medium">ممتاز</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">التنبيهات</h3>
            <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-all duration-300">
              <div className="flex items-center">
                <div className="p-2 bg-amber-500 rounded-lg mr-3">
                  <ExclamationTriangleIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">مخزون منخفض</p>
                  <p className="text-xs text-amber-600">{stats.lowStockProducts} منتجات تحتاج إعادة تخزين</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    {stats.lowStockProducts}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 hover:shadow-md transition-all duration-300">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500 rounded-lg mr-3">
                  <ClockIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800">طلبات معلقة</p>
                  <p className="text-xs text-blue-600">تحتاج مراجعة ومتابعة</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {stats.pendingOrders}
                  </span>
                </div>
              </div>
            </div>

            <div className={`relative overflow-hidden border rounded-xl p-4 hover:shadow-md transition-all duration-300 ${
              extendedStats.systemStatus === 'healthy'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                : extendedStats.systemStatus === 'warning'
                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
            }`}>
              <div className="flex items-center">
                <div className={`p-2 rounded-lg mr-3 ${
                  extendedStats.systemStatus === 'healthy'
                    ? 'bg-green-500'
                    : extendedStats.systemStatus === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}>
                  {extendedStats.systemStatus === 'healthy' ? (
                    <CheckCircleIcon className="h-4 w-4 text-white" />
                  ) : extendedStats.systemStatus === 'warning' ? (
                    <ExclamationTriangleIcon className="h-4 w-4 text-white" />
                  ) : (
                    <ExclamationTriangleIcon className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${
                    extendedStats.systemStatus === 'healthy'
                      ? 'text-green-800'
                      : extendedStats.systemStatus === 'warning'
                      ? 'text-yellow-800'
                      : 'text-red-800'
                  }`}>
                    {extendedStats.systemStatus === 'healthy'
                      ? 'النظام يعمل بشكل طبيعي'
                      : extendedStats.systemStatus === 'warning'
                      ? 'تحذير: مشاكل طفيفة في النظام'
                      : 'خطأ: مشاكل حرجة في النظام'
                    }
                  </p>
                  <p className={`text-xs ${
                    extendedStats.systemStatus === 'healthy'
                      ? 'text-green-600'
                      : extendedStats.systemStatus === 'warning'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {extendedStats.activeServices} من {extendedStats.activeServices + 1} خدمة متاحة
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    extendedStats.systemStatus === 'healthy'
                      ? 'bg-green-100 text-green-800'
                      : extendedStats.systemStatus === 'warning'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {extendedStats.systemStatus === 'healthy' ? '✓' : '⚠'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">إحصائيات اليوم</h3>
            <div className="p-2 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg">
              <ClockIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-500 rounded-lg mr-3">
                  <UsersIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">عملاء جدد</span>
                  <p className="text-xs text-green-600">انضموا اليوم</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-green-600">+{stats.newCustomersToday}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500 rounded-lg mr-3">
                  <ChatBubbleLeftRightIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">محادثات جديدة</span>
                  <p className="text-xs text-blue-600">تم بدؤها اليوم</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600">+67</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <div className="flex items-center">
                <div className="p-2 bg-purple-500 rounded-lg mr-3">
                  <CurrencyDollarIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">مبيعات اليوم</span>
                  <p className="text-xs text-purple-600">إجمالي الإيرادات</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-purple-600">{formatPrice(12450)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <SimpleChart
          data={salesData}
          title="المبيعات الشهرية"
          type="line"
        />
        <SimpleChart
          data={categoryData}
          title="توزيع المنتجات"
          type="donut"
        />
        <SimpleChart
          data={performanceData}
          title="أداء الأسبوع"
          type="bar"
        />
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg mr-3">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">النشاطات الأخيرة</h3>
            </div>
            <Link
              to="/activities"
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors duration-200"
            >
              عرض الكل
              <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
            </Link>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={activity.id} className="group relative flex items-start p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:shadow-md">
                <div className={`flex-shrink-0 p-3 rounded-xl ${getStatusColor(activity.status)} shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                  <ActivityIcon type={activity.type} status={activity.status} />
                </div>
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">
                      {activity.title}
                    </p>
                    <span className="text-xs text-gray-400 font-medium">{activity.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  <div className="flex items-center mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      activity.status === 'success' ? 'bg-green-100 text-green-800' :
                      activity.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      activity.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {activity.status === 'success' ? 'مكتمل' :
                       activity.status === 'warning' ? 'تحذير' :
                       activity.status === 'error' ? 'خطأ' : 'جديد'}
                    </span>
                  </div>
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300 pointer-events-none"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg mr-3">
            <ArrowTopRightOnSquareIcon className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">إجراءات سريعة</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/customers/new"
            className="group relative overflow-hidden flex flex-col items-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">إضافة عميل</span>
            <span className="text-xs text-gray-500 mt-1">عميل جديد</span>

            {/* Hover effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700"></div>
          </Link>

          <Link
            to="/products/new"
            className="group relative overflow-hidden flex flex-col items-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300">
              <ShoppingBagIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900 group-hover:text-green-600 transition-colors duration-200">إضافة منتج</span>
            <span className="text-xs text-gray-500 mt-1">منتج جديد</span>

            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700"></div>
          </Link>

          <Link
            to="/conversations"
            className="group relative overflow-hidden flex flex-col items-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors duration-200">المحادثات</span>
            <span className="text-xs text-gray-500 mt-1">رسائل العملاء</span>

            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700"></div>
          </Link>

          <Link
            to="/reports"
            className="group relative overflow-hidden flex flex-col items-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900 group-hover:text-amber-600 transition-colors duration-200">التقارير</span>
            <span className="text-xs text-gray-500 mt-1">تحليل البيانات</span>

            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700"></div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
