import React, { useState, useEffect } from 'react';
import { XMarkIcon, PhoneIcon, EnvelopeIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  totalOrders: number;
  customerSince: Date;
  notes?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  createdAt: Date;
  items: {
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }[];
}

interface CustomerProfileProps {
  customerId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreateOrder?: () => void;
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({
  customerId,
  isOpen,
  onClose,
  onCreateOrder
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'notes'>('profile');

  const loadCustomerProfile = async () => {
    try {
      // استخدام apiService للحصول على بيانات العميل
      const [customerProfile, customerOrders] = await Promise.all([
        apiService.getCustomerProfile(customerId),
        apiService.getCustomerOrders(customerId)
      ]);
      
      setCustomer(customerProfile);
      setOrders(customerOrders);
    } catch (error) {
      console.error('Error loading customer profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusArabic = (status: string) => {
    const translations = {
      pending: 'قيد الانتظار',
      processing: 'قيد المعالجة',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي'
    };
    return translations[status as keyof typeof translations] || status;
  };

  useEffect(() => {
    if (customerId && isOpen) {
      loadCustomerProfile();
    }
  }, [customerId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">ملف العميل</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : !customer ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            لم يتم العثور على بيانات العميل
          </div>
        ) : (
          <>
            {/* Customer Info Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center space-x-4">
                <img
                  src={customer.avatar || '/default-avatar.png'}
                  alt={customer.name}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h3 className="text-lg font-semibold">{customer.name}</h3>
                  <p className="text-sm text-gray-600">ID: {customer.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center">
                    {/* إزالة قسم إجمالي الإنفاق نظرًا لعدم توفره حاليًا */}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b">
              <div className="flex">
                {[
                  { key: 'profile', label: 'الملف الشخصي' },
                  { key: 'orders', label: 'الطلبات' },
                  { key: 'notes', label: 'الملاحظات' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-4 py-2 font-medium ${
                      activeTab === tab.key
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'profile' && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        البريد الإلكتروني
                      </label>
                      <div className="flex items-center space-x-2">
                        <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                        <span>{customer.email || 'غير متوفر'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الهاتف
                      </label>
                      <div className="flex items-center space-x-2">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <span>{customer.phone || 'غير متوفر'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ الانضمام
                      </label>
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <p>{new Date(customer.customerSince).toLocaleDateString('ar-SA')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">الطلبات ({orders.length})</h3>
                    <button
                      onClick={onCreateOrder}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      إنشاء طلب جديد
                    </button>
                  </div>
                  
                  {orders.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">لا توجد طلبات</p>
                  ) : (
                    <div className="space-y-4">
                      {orders.map(order => (
                        <div key={order.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold">#{order.orderNumber}</h4>
                              <p className="text-sm text-gray-600">
                                {new Date(order.createdAt).toLocaleDateString('ar-SA')}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                              {getStatusArabic(order.status)}
                            </span>
                          </div>
                          
                          <p className="text-lg font-semibold text-blue-600">${order.total}</p>
                          
                          <div className="mt-2 space-y-1">
                            {order.items.slice(0, 2).map((item, index) => (
                              <div key={index} className="text-sm text-gray-600">
                                {item.name} × {item.quantity}
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <p className="text-sm text-gray-500">
                                و {order.items.length - 2} عناصر أخرى
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">ملاحظات العميل</h3>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[200px]"
                    placeholder="أضف ملاحظاتك هنا..."
                    defaultValue={customer.notes || ''}
                  />
                  <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    حفظ الملاحظات
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerProfile;
