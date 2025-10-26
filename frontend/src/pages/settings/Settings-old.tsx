import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import { config } from '../../config';
import CompanySettings from './CompanySettings';
import {
  Cog6ToothIcon,
  UserIcon,
  BuildingOfficeIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  KeyIcon,
  CreditCardIcon,
  DocumentTextIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface SettingsTab {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs: SettingsTab[] = [
    {
      id: 'profile',
      name: 'الملف الشخصي',
      icon: UserIcon,
      component: ProfileSettings,
    },
    {
      id: 'company',
      name: 'إعدادات الشركة',
      icon: BuildingOfficeIcon,
      component: CompanySettings,
    },
    {
      id: 'notifications',
      name: 'الإشعارات',
      icon: BellIcon,
      component: NotificationSettings,
    },
    {
      id: 'security',
      name: 'الأمان',
      icon: ShieldCheckIcon,
      component: SecuritySettings,
    },
    {
      id: 'appearance',
      name: 'المظهر',
      icon: PaintBrushIcon,
      component: AppearanceSettings,
    },
    {
      id: 'integrations',
      name: 'التكاملات',
      icon: GlobeAltIcon,
      component: IntegrationSettings,
    },
    // 🗑️ تم حذف قسم Gemini AI
    {
      id: 'billing',
      name: 'الفواتير',
      icon: CreditCardIcon,
      component: BillingSettings,
    },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ProfileSettings;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Cog6ToothIcon className="h-8 w-8 text-indigo-600 mr-3" />
          الإعدادات
        </h1>
        <p className="mt-2 text-gray-600">إدارة إعدادات الحساب والنظام</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <nav className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">الإعدادات</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full px-4 py-3 text-right hover:bg-gray-50 focus:outline-none focus:bg-gray-50 flex items-center ${
                      activeTab === tab.id ? 'bg-indigo-50 border-r-4 border-indigo-500 text-indigo-700' : 'text-gray-700'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mr-3 ${activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white shadow rounded-lg">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Settings Component
const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    bio: '',
    timezone: 'Asia/Riyadh',
    language: 'ar',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('تم حفظ الإعدادات بنجاح!');
  };

  return (
    <div className="px-6 py-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">الملف الشخصي</h2>
        <p className="text-sm text-gray-600 mt-1">إدارة معلوماتك الشخصية</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الاسم الأول
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الاسم الأخير
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            رقم الهاتف
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="+966501234567"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المنطقة الزمنية
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({...formData, timezone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Asia/Riyadh">الرياض (GMT+3)</option>
              <option value="Asia/Dubai">دبي (GMT+4)</option>
              <option value="Africa/Cairo">القاهرة (GMT+2)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اللغة
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({...formData, language: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            حفظ التغييرات
          </button>
        </div>
      </form>
    </div>
  );
};

// Notification Settings Component
const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    newMessages: true,
    newOrders: true,
    lowStock: true,
    systemAlerts: true,
  });

  return (
    <div className="px-6 py-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">إعدادات الإشعارات</h2>
        <p className="text-sm text-gray-600 mt-1">تخصيص تفضيلات الإشعارات</p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">قنوات الإشعارات</h3>
          <div className="space-y-4">
            {[
              { key: 'emailNotifications', label: 'إشعارات البريد الإلكتروني' },
              { key: 'pushNotifications', label: 'الإشعارات الفورية' },
              { key: 'smsNotifications', label: 'الرسائل النصية' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[item.key as keyof typeof settings] as boolean}
                    onChange={(e) => setSettings({...settings, [item.key]: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">أنواع الإشعارات</h3>
          <div className="space-y-4">
            {[
              { key: 'newMessages', label: 'رسائل جديدة' },
              { key: 'newOrders', label: 'طلبات جديدة' },
              { key: 'lowStock', label: 'تنبيهات المخزون' },
              { key: 'systemAlerts', label: 'تنبيهات النظام' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[item.key as keyof typeof settings] as boolean}
                    onChange={(e) => setSettings({...settings, [item.key]: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Security Settings Component
const SecuritySettings: React.FC = () => {
  return (
    <div className="px-6 py-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">إعدادات الأمان</h2>
        <p className="text-sm text-gray-600 mt-1">إدارة كلمة المرور والأمان</p>
      </div>

      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <ShieldCheckIcon className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">تحديث كلمة المرور</h3>
              <p className="text-sm text-yellow-700 mt-1">
                يُنصح بتحديث كلمة المرور بانتظام لضمان أمان حسابك
              </p>
            </div>
          </div>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور الحالية
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور الجديدة
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تأكيد كلمة المرور الجديدة
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            تحديث كلمة المرور
          </button>
        </form>
      </div>
    </div>
  );
};

// Appearance Settings Component
const AppearanceSettings: React.FC = () => {
  const [theme, setTheme] = useState('light');

  return (
    <div className="px-6 py-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">إعدادات المظهر</h2>
        <p className="text-sm text-gray-600 mt-1">تخصيص مظهر المنصة</p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">المظهر</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'light', label: 'فاتح', preview: 'bg-white border-2' },
              { value: 'dark', label: 'داكن', preview: 'bg-gray-900 border-2' },
              { value: 'auto', label: 'تلقائي', preview: 'bg-gradient-to-r from-white to-gray-900 border-2' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`p-4 rounded-lg border-2 ${
                  theme === option.value ? 'border-indigo-500' : 'border-gray-200'
                }`}
              >
                <div className={`h-16 rounded ${option.preview} mb-2`}></div>
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Integration Settings Component
const IntegrationSettings: React.FC = () => {
  const [geminiSettings, setGeminiSettings] = useState({
    apiKey: '',
    isEnabled: false,
    autoReplyEnabled: false,
    confidenceThreshold: 0.8,
    maxResponseDelay: 30,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Load Gemini settings on component mount
  useEffect(() => {
    loadGeminiSettings();
  }, []);

  const loadGeminiSettings = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/ai/settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        // Extract API key from the new structure
        const modelSettings = data.data.modelSettings || {};
        const escalationRules = data.data.escalationRules || {};

        // Get API key from modelSettings first, then fallback to escalationRules
        let apiKey = '';
        if (modelSettings.apiKeys && Array.isArray(modelSettings.apiKeys) && modelSettings.apiKeys.length > 0) {
          apiKey = modelSettings.apiKeys[0].key;
        } else if (escalationRules.apiKey) {
          apiKey = escalationRules.apiKey;
        }

        setGeminiSettings(prev => ({
          ...prev,
          apiKey: apiKey,
          isEnabled: data.data.isEnabled || !!apiKey,
          autoReplyEnabled: data.data.autoReplyEnabled || false,
          confidenceThreshold: data.data.confidenceThreshold || 0.8,
          maxResponseDelay: modelSettings.maxResponseDelay || escalationRules.maxResponseDelay || 30
        }));
      }
    } catch (error) {
      console.error('Error loading Gemini settings:', error);
    }
  };

  const saveGeminiSettings = async () => {
    try {
      setIsLoading(true);

      // Create compatible structure with GeminiSettings.tsx
      const modelSettings = {
        primaryModel: 'gemini-2.5-flash', // Updated to latest
        fallbackModels: ['gemini-2.0-flash', 'gemini-1.5-flash'], // Updated fallbacks
        maxResponseDelay: geminiSettings.maxResponseDelay || 30,
        enableUsageTracking: true,
        enableCostOptimization: true,
        apiKeys: geminiSettings.apiKey ? [{
          key: geminiSettings.apiKey,
          name: 'Primary Key (from Settings)',
          models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'], // Updated models
          priority: 1,
          dailyLimit: 1000,
          monthlyLimit: 30000
        }] : []
      };

      const escalationRules = {
        apiKey: geminiSettings.apiKey || '',
        maxResponseDelay: geminiSettings.maxResponseDelay || 30
      };

      const response = await fetch(`${config.apiUrl}/ai/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          autoReplyEnabled: geminiSettings.autoReplyEnabled || false,
          confidenceThreshold: geminiSettings.confidenceThreshold || 0.8,
          modelSettings: JSON.stringify(modelSettings),
          escalationRules: JSON.stringify(escalationRules)
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('تم حفظ إعدادات Gemini AI بنجاح!');
      } else {
        alert(`خطأ في حفظ الإعدادات: ${data.message}`);
      }
    } catch (error) {
      console.error('Error saving Gemini settings:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  const testGeminiConnection = async () => {
    try {
      setIsLoading(true);
      setTestResult(null);

      const response = await fetch(`${config.apiUrl}/ai/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: 'مرحباً، هذا اختبار للتأكد من عمل Gemini AI'
        })
      });

      const data = await response.json();
      if (data.success) {
        setTestResult('✅ تم الاتصال بـ Gemini AI بنجاح!');
      } else {
        setTestResult(`❌ فشل الاتصال: ${data.message}`);
      }
    } catch (error) {
      console.error('Error testing Gemini:', error);
      setTestResult('❌ حدث خطأ أثناء اختبار الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-6 py-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">التكاملات</h2>
        <p className="text-sm text-gray-600 mt-1">إدارة التكاملات مع الخدمات الخارجية</p>
      </div>

      {/* Gemini AI Settings */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white text-lg">🤖</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Google Gemini AI</h3>
            <p className="text-sm text-gray-600">إعدادات الذكاء الاصطناعي والردود التلقائية</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مفتاح API الخاص بـ Gemini
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiSettings.apiKey}
                onChange={(e) => setGeminiSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="أدخل مفتاح API الخاص بـ Google Gemini"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={testGeminiConnection}
                disabled={!geminiSettings.apiKey || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'جاري الاختبار...' : 'اختبار'}
              </button>
            </div>
            {testResult && (
              <p className={`text-sm mt-2 ${testResult.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {testResult}
              </p>
            )}
          </div>

          {/* Enable AI Features */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">تفعيل ميزات الذكاء الاصطناعي</h4>
              <p className="text-sm text-gray-500">تفعيل جميع ميزات الذكاء الاصطناعي في النظام</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={geminiSettings.isEnabled}
                onChange={(e) => setGeminiSettings(prev => ({ ...prev, isEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Auto Reply Settings */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">الردود التلقائية</h4>
              <p className="text-sm text-gray-500">تفعيل الردود التلقائية على رسائل العملاء</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={geminiSettings.autoReplyEnabled}
                onChange={(e) => setGeminiSettings(prev => ({ ...prev, autoReplyEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Confidence Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مستوى الثقة المطلوب ({Math.round(geminiSettings.confidenceThreshold * 100)}%)
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.1"
              value={geminiSettings.confidenceThreshold}
              onChange={(e) => setGeminiSettings(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>منخفض (50%)</span>
              <span>عالي (100%)</span>
            </div>
          </div>

          {/* Max Response Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              أقصى تأخير للرد (بالثواني)
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={geminiSettings.maxResponseDelay}
              onChange={(e) => setGeminiSettings(prev => ({ ...prev, maxResponseDelay: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={saveGeminiSettings}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جاري الحفظ...' : 'حفظ إعدادات Gemini AI'}
            </button>
          </div>
        </div>
      </div>

      {/* Other Integrations */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">التكاملات الأخرى</h3>
        {[
          { name: 'Facebook Messenger', status: 'متصل', color: 'green', link: '/settings/facebook' },
          { name: 'WhatsApp Business', status: 'غير متصل', color: 'red', link: '#' },
          { name: 'Google Analytics', status: 'متصل', color: 'green', link: '#' },
          { name: 'Stripe Payments', status: 'غير متصل', color: 'red', link: '#' },
        ].map((integration) => (
          <div key={integration.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">{integration.name}</h4>
              <p className={`text-sm ${integration.color === 'green' ? 'text-green-600' : 'text-red-600'}`}>
                {integration.status}
              </p>
            </div>
            <a
              href={integration.link}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 inline-block"
            >
              {integration.status === 'متصل' ? 'إعدادات' : 'ربط'}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

// Billing Settings Component
const BillingSettings: React.FC = () => {
  return (
    <div className="px-6 py-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">الفواتير والدفع</h2>
        <p className="text-sm text-gray-600 mt-1">إدارة الفواتير وطرق الدفع</p>
      </div>

      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CreditCardIcon className="h-5 w-5 text-green-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-green-800">الاشتراك النشط</h3>
              <p className="text-sm text-green-700 mt-1">
                باقة متقدم - 299 ريال/شهر - تجديد في 15 فبراير 2024
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">الفواتير الأخيرة</h3>
          <div className="space-y-2">
            {[
              { date: '2024-01-15', amount: '299 ريال', status: 'مدفوع' },
              { date: '2023-12-15', amount: '299 ريال', status: 'مدفوع' },
              { date: '2023-11-15', amount: '299 ريال', status: 'مدفوع' },
            ].map((invoice, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                <div>
                  <span className="font-medium">{invoice.date}</span>
                  <span className="text-gray-600 mr-4">{invoice.amount}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 text-sm mr-4">{invoice.status}</span>
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm">
                    تحميل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Gemini AI Settings Component
const GeminiAISettings: React.FC = () => {
  const [settings, setSettings] = useState({
    apiKey: '',
    isEnabled: false,
    autoReplyEnabled: false,
    confidenceThreshold: 0.7,
    model: 'gemini-2.5-flash' // Updated to latest model
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/ai/settings`);
      const data = await response.json();
      if (data.success) {
        // Extract API key from the new structure
        const modelSettings = data.data.modelSettings || {};
        const escalationRules = data.data.escalationRules || {};

        // Get API key from modelSettings first, then fallback to escalationRules
        let apiKey = '';
        if (modelSettings.apiKeys && Array.isArray(modelSettings.apiKeys) && modelSettings.apiKeys.length > 0) {
          apiKey = modelSettings.apiKeys[0].key;
        } else if (escalationRules.apiKey) {
          apiKey = escalationRules.apiKey;
        }

        setSettings({
          apiKey: apiKey,
          isEnabled: data.data.isEnabled || !!apiKey,
          autoReplyEnabled: data.data.autoReplyEnabled || false,
          confidenceThreshold: data.data.confidenceThreshold || 0.7,
          model: modelSettings.primaryModel || 'gemini-2.5-flash' // Updated default
        });
      }
    } catch (error) {
      console.error('Error loading Gemini settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Create compatible structure with GeminiSettings.tsx
      const modelSettings = {
        primaryModel: settings.model || 'gemini-2.5-flash', // Updated default
        fallbackModels: ['gemini-2.0-flash', 'gemini-1.5-flash'], // Updated fallbacks
        maxResponseDelay: 30,
        enableUsageTracking: true,
        enableCostOptimization: true,
        apiKeys: settings.apiKey ? [{
          key: settings.apiKey,
          name: 'Primary Key (from Gemini Tab)',
          models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'], // Updated models
          priority: 1,
          dailyLimit: 1000,
          monthlyLimit: 30000
        }] : []
      };

      const escalationRules = {
        apiKey: settings.apiKey || '',
        maxResponseDelay: 30
      };

      const response = await fetch(`${config.apiUrl}/ai/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          autoReplyEnabled: settings.autoReplyEnabled || false,
          confidenceThreshold: settings.confidenceThreshold || 0.7,
          modelSettings: JSON.stringify(modelSettings),
          escalationRules: JSON.stringify(escalationRules)
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'تم حفظ إعدادات Gemini AI بنجاح!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'فشل في حفظ الإعدادات' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ الإعدادات' });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setMessage(null);

    try {
      const response = await fetch(`${config.apiUrl}/ai/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'مرحباً، هذا اختبار للاتصال بـ Gemini AI'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'تم الاتصال بـ Gemini AI بنجاح!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'فشل الاتصال بـ Gemini AI' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء اختبار الاتصال' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <SparklesIcon className="h-6 w-6 text-purple-600 mr-2" />
          إعدادات Gemini AI
        </h2>
        <p className="text-sm text-gray-600 mt-1">إدارة إعدادات الذكاء الاصطناعي والردود التلقائية</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            مفتاح Gemini API
          </label>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="أدخل مفتاح Gemini API"
          />
          <p className="text-xs text-gray-500 mt-1">
            يمكنك الحصول على مفتاح API من Google AI Studio
          </p>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            نموذج Gemini
          </label>
          <select
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <optgroup label="🚀 الجيل الأحدث (2.5) - موصى به">
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (الأفضل للاستخدام العام)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (للمهام المعقدة)</option>
              <option value="gemini-2.5-flash-lite-preview-06-17">Gemini 2.5 Flash-Lite (اقتصادي)</option>
            </optgroup>
            <optgroup label="⚡ الجيل الثاني (2.0)">
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (متقدم)</option>
              <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite (سريع)</option>
            </optgroup>
            <optgroup label="💼 الجيل الأول (1.5) - قديم">
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (قديم)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (قديم)</option>
              <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B (قديم)</option>
            </optgroup>
            <optgroup label="📚 النماذج القديمة">
              <option value="gemini-pro">Gemini Pro (مهجور)</option>
            </optgroup>
          </select>
        </div>

        {/* Enable AI */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableAI"
            checked={settings.isEnabled}
            onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
          />
          <label htmlFor="enableAI" className="mr-2 block text-sm text-gray-900">
            تفعيل Gemini AI
          </label>
        </div>

        {/* Auto Reply */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoReply"
            checked={settings.autoReplyEnabled}
            onChange={(e) => setSettings({ ...settings, autoReplyEnabled: e.target.checked })}
            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
          />
          <label htmlFor="autoReply" className="mr-2 block text-sm text-gray-900">
            تفعيل الردود التلقائية
          </label>
        </div>

        {/* Confidence Threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            حد الثقة ({(settings.confidenceThreshold * 100).toFixed(0)}%)
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={settings.confidenceThreshold}
            onChange={(e) => setSettings({ ...settings, confidenceThreshold: parseFloat(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            الحد الأدنى للثقة المطلوب لإرسال رد تلقائي
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 space-x-reverse">
          <button
            onClick={saveSettings}
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>

          <button
            onClick={testConnection}
            disabled={testing || !settings.apiKey}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            {testing ? 'جاري الاختبار...' : 'اختبار الاتصال'}
          </button>

          <a
            href="/gemini-settings"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 inline-block text-center"
          >
            الإعدادات المتقدمة
          </a>
        </div>
      </div>
    </div>
  );
};

export default Settings;
