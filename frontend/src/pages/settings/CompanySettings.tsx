import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import {
  BuildingOfficeIcon,
  CreditCardIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, formatCurrency, getCurrencyByCode } from '../../utils/currency';

import { useDateFormat } from '../../hooks/useDateFormat';
import { DateFormatType, DATE_FORMAT_LABELS } from '../../utils/dateFormat';

interface SubscriptionPlan {
  name: string;
  price: number;
  currency: string;
  limits: Record<string, number>;
  features: Record<string, boolean>;
}

interface UsageStat {
  usage: number;
  limit: number;
  percentage: number;
  unlimited: boolean;
  warning: boolean;
  exceeded: boolean;
}

const CompanySettings: React.FC = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [plans, setPlans] = useState<Record<string, SubscriptionPlan>>({});
  const [usage, setUsage] = useState<Record<string, UsageStat>>({});
  const [loading, setLoading] = useState(true);
  
  const [selectedCurrency, setSelectedCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [savingCurrency, setSavingCurrency] = useState(false);
  
  // Date format hook
  const { dateFormat, setDateFormat, isLoading: dateFormatLoading, error: dateFormatError, formatDate } = useDateFormat();

  useEffect(() => {
    fetchCompanyData();
    fetchPlans();
    fetchUsage();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const response = await fetch(`https://www.mokhtarelhenawy.online/api/v1/companies/${user?.companyId}`);
      const data = await response.json();
      if (data.success) {
        setCompany(data.data);
        // Set currency from company data or use default
        setSelectedCurrency(data.data?.currency || DEFAULT_CURRENCY);
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('https://www.mokhtarelhenawy.online/api/v1/companies/plans');
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchUsage = async () => {
    try {
      const response = await fetch(`https://www.mokhtarelhenawy.online/api/v1/companies/${user?.companyId}/usage`);
      const data = await response.json();
      if (data.success) {
        setUsage(data.data);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planName: string) => {
    try {
      const response = await fetch(`https://www.mokhtarelhenawy.online/api/v1/companies/${user?.companyId}/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: planName }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert('تم تحديث الاشتراك بنجاح!');
        fetchCompanyData();
        fetchUsage();
      } else {
        alert(data.error || 'فشل في تحديث الاشتراك');
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('حدث خطأ أثناء تحديث الاشتراك');
    }
  };

  const handleCurrencyChange = async (currencyCode: string) => {
    try {
      setSavingCurrency(true);
      const response = await fetch(`https://www.mokhtarelhenawy.online/api/v1/companies/${user?.companyId}/currency`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currency: currencyCode }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSelectedCurrency(currencyCode);
        setCompany((prev: any) => ({ ...prev, currency: currencyCode }));
        alert('تم تحديث العملة بنجاح!');
      } else {
        alert(data.error || 'فشل في تحديث العملة');
      }
    } catch (error) {
      console.error('Error updating currency:', error);
      alert('حدث خطأ أثناء تحديث العملة');
    } finally {
      setSavingCurrency(false);
    }
  };

  const getUsageColor = (stat: UsageStat) => {
    if (stat.exceeded) return 'text-red-600 bg-red-100';
    if (stat.warning) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getUsageBarColor = (stat: UsageStat) => {
    if (stat.exceeded) return 'bg-red-500';
    if (stat.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'غير محدود';
    if (limit >= 1000000) return `${(limit / 1000000).toFixed(1)}م`;
    if (limit >= 1000) return `${(limit / 1000).toFixed(1)}ك`;
    return limit.toString();
  };

  const resourceNames: Record<string, string> = {
    users: 'المستخدمين',
    customers: 'العملاء',
    conversations: 'المحادثات',
    products: 'المنتجات',
    orders: 'الطلبات',
    storage: 'التخزين (MB)',
    aiRequests: 'طلبات الذكاء الاصطناعي',
    emailNotifications: 'إشعارات البريد الإلكتروني',
    smsNotifications: 'الرسائل النصية',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <BuildingOfficeIcon className="h-8 w-8 text-indigo-600 mr-3" />
          إعدادات الشركة
        </h1>
        <p className="mt-2 text-gray-600">إدارة معلومات الشركة والاشتراك والاستخدام</p>
      </div>

      {/* Company Info */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">معلومات الشركة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">اسم الشركة</label>
            <p className="mt-1 text-lg text-gray-900">{company?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">الباقة الحالية</label>
            <div className="mt-1 flex items-center">
              <span className="text-lg font-semibold text-indigo-600">
                {plans[company?.subscription?.plan]?.name}
              </span>
              <span className="mr-2 text-sm text-gray-500">
                ({formatCurrency(plans[company?.subscription?.plan]?.price || 0, selectedCurrency)}/شهر)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Currency Settings */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <CurrencyDollarIcon className="h-6 w-6 text-green-600 mr-2" />
          إعدادات العملة
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              العملة الافتراضية للموقع
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              disabled={savingCurrency}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.nameAr} ({currency.symbol}) - {currency.code}
                </option>
              ))}
            </select>
            {savingCurrency && (
              <p className="mt-2 text-sm text-blue-600 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                جاري حفظ التغييرات...
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              معاينة العملة
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-sm text-gray-600 mb-1">مثال على عرض السعر:</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(1250, selectedCurrency)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                العملة المختارة: {getCurrencyByCode(selectedCurrency)?.nameAr}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Format Settings */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <CurrencyDollarIcon className="h-6 w-6 text-indigo-600 mr-2" />
          إعدادات التاريخ
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تنسيق التاريخ
            </label>
            <div className="space-y-2">
              {Object.entries(DATE_FORMAT_LABELS).map(([format, label]) => (
                <label key={format} className="flex items-center">
                  <input
                    type="radio"
                    name="dateFormat"
                    value={format}
                    checked={dateFormat === format}
                    onChange={(e) => setDateFormat(e.target.value as DateFormatType)}
                    disabled={dateFormatLoading}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="mr-2 text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            {dateFormatError && (
              <p className="text-xs text-red-600 mt-1">{dateFormatError}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              التنسيق المختار: {DATE_FORMAT_LABELS[dateFormat]}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              معاينة التاريخ
            </label>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-2">التاريخ الحالي:</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatDate(new Date())}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <ChartBarIcon className="h-6 w-6 text-indigo-600 mr-2" />
          إحصائيات الاستخدام
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(usage).map(([resource, stat]) => (
            <div key={resource} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">
                  {resourceNames[resource] || resource}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(stat)}`}>
                  {stat.unlimited ? 'غير محدود' : `${stat.percentage}%`}
                </span>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{stat.usage.toLocaleString()}</span>
                  <span>{formatLimit(stat.limit)}</span>
                </div>
                {!stat.unlimited && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full ${getUsageBarColor(stat)}`}
                      style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {stat.exceeded && (
                <div className="flex items-center text-red-600 text-xs">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  تم تجاوز الحد المسموح
                </div>
              )}
              {stat.warning && !stat.exceeded && (
                <div className="flex items-center text-yellow-600 text-xs">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  قريب من الحد المسموح
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <CreditCardIcon className="h-6 w-6 text-indigo-600 mr-2" />
          باقات الاشتراك
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(plans).map(([planKey, plan]) => {
            const isCurrentPlan = company?.subscription?.plan === planKey;
            const isUpgrade = ['BASIC', 'PREMIUM', 'ENTERPRISE'].indexOf(planKey) > 
                             ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'].indexOf(company?.subscription?.plan);
            
            return (
              <div
                key={planKey}
                className={`border rounded-lg p-6 ${
                  isCurrentPlan ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}
              >
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 mr-1">{plan.currency}/شهر</span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <h4 className="font-medium text-gray-900">الحدود:</h4>
                  {Object.entries(plan.limits).slice(0, 4).map(([resource, limit]) => (
                    <div key={resource} className="flex justify-between text-sm">
                      <span className="text-gray-600">{resourceNames[resource]}</span>
                      <span className="font-medium">{formatLimit(limit)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mb-6">
                  <h4 className="font-medium text-gray-900">الميزات:</h4>
                  {Object.entries(plan.features).slice(0, 3).map(([feature, enabled]) => (
                    <div key={feature} className="flex items-center text-sm">
                      <CheckCircleIcon 
                        className={`h-4 w-4 mr-2 ${enabled ? 'text-green-500' : 'text-gray-300'}`} 
                      />
                      <span className={enabled ? 'text-gray-900' : 'text-gray-400'}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {isCurrentPlan ? (
                  <div className="text-center">
                    <span className="inline-flex items-center px-4 py-2 border border-indigo-300 rounded-md text-sm font-medium text-indigo-700 bg-indigo-100">
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      الباقة الحالية
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(planKey)}
                    className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium ${
                      isUpgrade
                        ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                        : 'text-indigo-600 bg-indigo-100 hover:bg-indigo-200'
                    }`}
                  >
                    {isUpgrade && <ArrowUpIcon className="h-4 w-4 mr-2" />}
                    {isUpgrade ? 'ترقية' : 'تغيير'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;
