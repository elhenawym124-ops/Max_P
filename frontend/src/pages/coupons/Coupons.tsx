import React, { useState, useEffect } from 'react';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useCurrency } from '../../hooks/useCurrency';
import {
  TicketIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';

interface Coupon {
  id: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  usageCount: number;
  userUsageLimit: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  customerSegments: string[];
  createdAt: string;
  createdBy: string;
}

const Coupons: React.FC = () => {
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    isActive: '',
    type: '',
    customerSegment: '',
  });

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'free_shipping',
    value: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 100,
    userUsageLimit: 1,
    validFrom: '',
    validTo: '',
    isActive: true,
    customerSegments: ['all'],
  });

  useEffect(() => {
    fetchCoupons();
  }, [filters]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (filters.isActive) queryParams.append('isActive', filters.isActive);
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.customerSegment) queryParams.append('customerSegment', filters.customerSegment);

      const response = await fetch(`https://www.mokhtarelhenawy.online/api/v1/coupons?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setCoupons(data.data);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCoupon = async () => {
    try {
      const response = await fetch('https://www.mokhtarelhenawy.online/api/v1/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCoupon),
      });

      const data = await response.json();
      if (data.success) {
        fetchCoupons();
        setShowCreateModal(false);
        setNewCoupon({
          code: '',
          name: '',
          description: '',
          type: 'percentage',
          value: 0,
          minOrderAmount: 0,
          maxDiscountAmount: 0,
          usageLimit: 100,
          userUsageLimit: 1,
          validFrom: '',
          validTo: '',
          isActive: true,
          customerSegments: ['all'],
        });
        alert('تم إنشاء الكوبون بنجاح');
      } else {
        alert(data.error || 'فشل في إنشاء الكوبون');
      }
    } catch (error) {
      console.error('Error creating coupon:', error);
      alert('فشل في إنشاء الكوبون');
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'نسبة مئوية';
      case 'fixed':
        return 'مبلغ ثابت';
      case 'free_shipping':
        return 'شحن مجاني';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'bg-blue-100 text-blue-800';
      case 'fixed':
        return 'bg-green-100 text-green-800';
      case 'free_shipping':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم نسخ الكود');
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <TicketIcon className="h-8 w-8 text-indigo-600 mr-3" />
              إدارة الكوبونات والخصومات
            </h1>
            <p className="mt-2 text-gray-600">إنشاء وإدارة أكواد الخصم والعروض الترويجية</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            كوبون جديد
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحالة
            </label>
            <select
              value={filters.isActive}
              onChange={(e) => setFilters({...filters, isActive: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع الحالات</option>
              <option value="true">نشط</option>
              <option value="false">غير نشط</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الخصم
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع الأنواع</option>
              <option value="percentage">نسبة مئوية</option>
              <option value="fixed">مبلغ ثابت</option>
              <option value="free_shipping">شحن مجاني</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              فئة العملاء
            </label>
            <select
              value={filters.customerSegment}
              onChange={(e) => setFilters({...filters, customerSegment: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع الفئات</option>
              <option value="all">جميع العملاء</option>
              <option value="new">عملاء جدد</option>
              <option value="VIP">عملاء VIP</option>
              <option value="regular">عملاء عاديين</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ isActive: '', type: '', customerSegment: '' })}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الكود
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الاسم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  النوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  القيمة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الاستخدام
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الصلاحية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                        {coupon.id}
                      </div>
                      <button
                        onClick={() => copyToClipboard(coupon.id)}
                        className="mr-2 text-gray-400 hover:text-gray-600"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {coupon.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatPrice(coupon.minOrderAmount || 0)}{coupon.description.substring(0, 50)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(coupon.type)}`}>
                      {getTypeText(coupon.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coupon.type === 'percentage' ? `${coupon.value}%` :
                     coupon.type === 'fixed' ? `${coupon.value} ريال` :
                     'شحن مجاني'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {coupon.usageCount} / {coupon.usageLimit}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${(coupon.usageCount / coupon.usageLimit) * 100}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>من: {formatDate(coupon.validFrom)}</div>
                    <div>إلى: {formatDate(coupon.validTo)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {coupon.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => {
                          setSelectedCoupon(coupon);
                          setShowCouponModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {coupons.length === 0 && (
          <div className="text-center py-12">
            <TicketIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد كوبونات</h3>
            <p className="mt-1 text-sm text-gray-500">لم يتم العثور على كوبونات تطابق المعايير المحددة.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Coupons;