import React, { useState, useEffect } from 'react';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useCurrency } from '../../hooks/useCurrency';
import {
  CubeIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  EyeIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
  warehouses: Record<string, {
    quantity: number;
    reserved: number;
    available: number;
    minStock: number;
    maxStock: number;
    reorderPoint: number;
    reorderQuantity: number;
  }>;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  averageCost: number;
  lastUpdated: string;
}

interface StockAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock';
  priority: 'critical' | 'high' | 'medium' | 'low';
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  message: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity?: number;
  createdAt: string;
  isRead: boolean;
}

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showStockUpdateModal, setShowStockUpdateModal] = useState(false);
  const [filters, setFilters] = useState({
    warehouseId: '',
    lowStock: false,
    outOfStock: false,
  });
          const token = localStorage.getItem('accessToken');

  const [stockUpdate, setStockUpdate] = useState({
    productId: '',
    warehouseId: 'WH001',
    quantity: 0,
    type: 'in' as 'in' | 'out' | 'adjustment',
    reason: 'purchase' as 'purchase' | 'sale' | 'adjustment' | 'damage' | 'transfer',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    fetchInventory();
    fetchAlerts();
  }, [filters]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.warehouseId) queryParams.append('warehouseId', filters.warehouseId);
      if (filters.lowStock) queryParams.append('lowStock', 'true');
      if (filters.outOfStock) queryParams.append('outOfStock', 'true');

      const response = await fetch(`https://www.mokhtarelhenawy.online/api/v1/inventory?${queryParams}`, {
        headers : {
          Authorization : `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setInventory(data.data);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('https://www.mokhtarelhenawy.online/api/v1/inventory/alerts', {
        headers : {
          Authorization : `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const updateStock = async () => {
    try {
      const response = await fetch('https://www.mokhtarelhenawy.online/api/v1/inventory/update-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization : `Bearer ${token}`
        },
        body: JSON.stringify(stockUpdate),
      });

      const data = await response.json();
      if (data.success) {
        fetchInventory();
        fetchAlerts();
        setShowStockUpdateModal(false);
        setStockUpdate({
          productId: '',
          warehouseId: 'WH001',
          quantity: 0,
          type: 'in',
          reason: 'purchase',
          reference: '',
          notes: '',
        });
        alert('تم تحديث المخزون بنجاح');
      } else {
        alert(data.error || 'فشل في تحديث المخزون');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('فشل في تحديث المخزون');
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.totalAvailable === 0) {
      return { status: 'نفد المخزون', color: 'text-red-600 bg-red-100' };
    }
    
    const hasLowStock = Object.values(item.warehouses).some(
      warehouse => warehouse.available <= warehouse.reorderPoint
    );
    
    if (hasLowStock) {
      return { status: 'مخزون منخفض', color: 'text-yellow-600 bg-yellow-100' };
    }
    
    return { status: 'متوفر', color: 'text-green-600 bg-green-100' };
  };

  const getAlertPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
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
              <CubeIcon className="h-8 w-8 text-indigo-600 mr-3" />
              إدارة المخزون
            </h1>
            <p className="mt-2 text-gray-600">متابعة وإدارة مستويات المخزون والتنبيهات</p>
          </div>
          <button
            onClick={() => setShowStockUpdateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            تحديث المخزون
          </button>
        </div>
      </div>

      {/* Stock Alerts */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2" />
            تنبيهات المخزون ({alerts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${getAlertPriorityColor(alert.priority)}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{alert.productName}</h3>
                    <p className="text-sm mt-1">{alert.message}</p>
                    <p className="text-xs mt-2">
                      المخزون الحالي: {alert.currentStock} | نقطة الطلب: {alert.reorderPoint}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded">
                    {alert.priority === 'critical' ? 'حرج' :
                     alert.priority === 'high' ? 'عالي' :
                     alert.priority === 'medium' ? 'متوسط' : 'منخفض'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المستودع
            </label>
            <select
              value={filters.warehouseId}
              onChange={(e) => setFilters({...filters, warehouseId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع المستودعات</option>
              <option value="WH001">المستودع الرئيسي</option>
              <option value="WH002">مستودع جدة</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.lowStock}
                onChange={(e) => setFilters({...filters, lowStock: e.target.checked})}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="mr-2 text-sm text-gray-700">مخزون منخفض فقط</span>
            </label>
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.outOfStock}
                onChange={(e) => setFilters({...filters, outOfStock: e.target.checked})}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="mr-2 text-sm text-gray-700">نفد المخزون فقط</span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ warehouseId: '', lowStock: false, outOfStock: false })}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المنتج
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المخزون الإجمالي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المتاح
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  محجوز
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  متوسط التكلفة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  آخر تحديث
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item) => {
                const stockStatus = getStockStatus(item);
                return (
                  <tr key={item.productId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.productName}
                      </div>
                      <div className="text-sm text-gray-500">
                        SKU: {item.sku}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalAvailable}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalReserved}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(item.averageCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(item.lastUpdated)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowItemModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setStockUpdate({...stockUpdate, productId: item.productId});
                            setShowStockUpdateModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          <PlusIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setStockUpdate({...stockUpdate, productId: item.productId, type: 'out'});
                            setShowStockUpdateModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <MinusIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {inventory.length === 0 && (
          <div className="text-center py-12">
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد منتجات في المخزون</h3>
            <p className="mt-1 text-sm text-gray-500">لم يتم العثور على منتجات تطابق المعايير المحددة.</p>
          </div>
        )}
      </div>

      {/* Item Details Modal */}
      {showItemModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  تفاصيل المخزون - {selectedItem.productName}
                </h3>
                <button
                  onClick={() => setShowItemModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">معلومات المنتج</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p><strong>اسم المنتج:</strong> {selectedItem.productName}</p>
                    <p><strong>SKU:</strong> {selectedItem.sku}</p>
                    <p><strong>متوسط التكلفة:</strong> {formatPrice(selectedItem.averageCost)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">ملخص المخزون</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{selectedItem.totalQuantity}</p>
                        <p className="text-sm text-gray-600">إجمالي المخزون</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{selectedItem.totalAvailable}</p>
                        <p className="text-sm text-gray-600">متاح</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">{selectedItem.totalReserved}</p>
                        <p className="text-sm text-gray-600">محجوز</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">تفاصيل المستودعات</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    {Object.entries(selectedItem.warehouses).map(([warehouseId, warehouse]) => (
                      <div key={warehouseId} className="border-b border-gray-200 last:border-b-0 py-3">
                        <h5 className="font-medium text-gray-800 mb-2">
                          {warehouseId === 'WH001' ? 'المستودع الرئيسي' : 'مستودع جدة'}
                        </h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>الكمية:</strong> {warehouse.quantity}</p>
                            <p><strong>متاح:</strong> {warehouse.available}</p>
                            <p><strong>محجوز:</strong> {warehouse.reserved}</p>
                          </div>
                          <div>
                            <p><strong>الحد الأدنى:</strong> {warehouse.minStock}</p>
                            <p><strong>نقطة الطلب:</strong> {warehouse.reorderPoint}</p>
                            <p><strong>كمية الطلب:</strong> {warehouse.reorderQuantity}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockUpdateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  تحديث المخزون
                </h3>
                <button
                  onClick={() => setShowStockUpdateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المنتج
                  </label>
                  <select
                    value={stockUpdate.productId}
                    onChange={(e) => setStockUpdate({...stockUpdate, productId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر المنتج</option>
                    {inventory.map((item) => (
                      <option key={item.productId} value={item.productId}>
                        {item.productName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المستودع
                    </label>
                    <select
                      value={stockUpdate.warehouseId}
                      onChange={(e) => setStockUpdate({...stockUpdate, warehouseId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="WH001">المستودع الرئيسي</option>
                      <option value="WH002">مستودع جدة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نوع الحركة
                    </label>
                    <select
                      value={stockUpdate.type}
                      onChange={(e) => setStockUpdate({...stockUpdate, type: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="in">إدخال</option>
                      <option value="out">إخراج</option>
                      <option value="adjustment">تعديل</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الكمية
                    </label>
                    <input
                      type="number"
                      value={stockUpdate.quantity}
                      onChange={(e) => setStockUpdate({...stockUpdate, quantity: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      السبب
                    </label>
                    <select
                      value={stockUpdate.reason}
                      onChange={(e) => setStockUpdate({...stockUpdate, reason: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="purchase">شراء</option>
                      <option value="sale">بيع</option>
                      <option value="adjustment">تعديل</option>
                      <option value="damage">تلف</option>
                      <option value="transfer">نقل</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المرجع
                  </label>
                  <input
                    type="text"
                    value={stockUpdate.reference}
                    onChange={(e) => setStockUpdate({...stockUpdate, reference: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="رقم الطلب أو المرجع"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات
                  </label>
                  <textarea
                    value={stockUpdate.notes}
                    onChange={(e) => setStockUpdate({...stockUpdate, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="ملاحظات إضافية..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 space-x-reverse mt-6">
                <button
                  onClick={() => setShowStockUpdateModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  إلغاء
                </button>
                <button
                  onClick={updateStock}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  تحديث المخزون
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
