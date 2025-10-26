import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { config } from '../../config';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';

// Helper function to safely parse JSON
const safeJsonParse = (jsonString: string | null, defaultValue: any = null) => {
  if (!jsonString || jsonString === 'null') {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', jsonString, error);

    // If it's a simple string (like tags), try to split by comma
    if (typeof jsonString === 'string' && Array.isArray(defaultValue)) {
      return jsonString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    return defaultValue;
  }
};

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  sku: string;
  category: string;
  images: string[];
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get auth token
        const token = authService.getAccessToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${config.apiUrl}/products`, {
          headers
        });
        const data = await response.json();

        if (data.success && data.data) {
          // Transform API data to match frontend interface
          const transformedProducts = data.data.map((product: any) => ({
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.price,
            comparePrice: product.comparePrice,
            cost: product.cost,
            sku: product.sku,
            category: product.category?.name || 'غير محدد',
            images: product.images ? safeJsonParse(product.images, []) : [],
            stock: product.stock,
            lowStockThreshold: product.lowStockThreshold || 5,
            isActive: product.isActive,
            createdAt: new Date(product.createdAt),
            updatedAt: new Date(product.updatedAt),
            tags: product.tags ? safeJsonParse(product.tags, []) : [],
            weight: product.weight,
            dimensions: product.dimensions ? safeJsonParse(product.dimensions, undefined) : undefined,
          }));

          setProducts(transformedProducts);
        } else {
          setError('فشل في تحميل المنتجات');
        }
      } catch (err) {
        console.error('Error loading products:', err);
        setError('حدث خطأ أثناء تحميل المنتجات');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const categories = Array.from(new Set(products.map(p => p.category)));

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return 'out-of-stock';
    if (product.stock <= product.lowStockThreshold) return 'low-stock';
    return 'in-stock';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'bg-green-100 text-green-800';
      case 'low-stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out-of-stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'متوفر';
      case 'low-stock':
        return 'مخزون منخفض';
      case 'out-of-stock':
        return 'نفد المخزون';
      default:
        return 'غير محدد';
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && product.isActive) ||
                         (statusFilter === 'inactive' && !product.isActive);
    
    const stockStatus = getStockStatus(product);
    const matchesStock = stockFilter === 'all' || stockStatus === stockFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesStock;
  });

  const handleExport = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('تم تصدير المنتجات بنجاح!');
    }, 2000);
  };

  const handleView = (productId: string) => {
    // Navigate to product details page
    window.location.href = `/products/${productId}`;
  };

  const handleEdit = (productId: string) => {
    // Navigate to product edit page
    window.location.href = `/products/${productId}/edit`;
  };

  const handleToggleStatus = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const token = authService.getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${config.apiUrl}/products/${productId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          isActive: !product.isActive
        })
      });

      if (response.ok) {
        // Update local state
        setProducts(prev =>
          prev.map(p =>
            p.id === productId
              ? { ...p, isActive: !p.isActive, updatedAt: new Date() }
              : p
          )
        );
      } else {
        alert('فشل في تحديث حالة المنتج');
      }
    } catch (error) {
      console.error('Error toggling product status:', error);
      alert('حدث خطأ أثناء تحديث حالة المنتج');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      return;
    }

    try {
      const token = authService.getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${config.apiUrl}/products/${productId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        // Update local state
        setProducts(prev => prev.filter(product => product.id !== productId));
        alert('تم حذف المنتج بنجاح');
      } else {
        alert('فشل في حذف المنتج');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('حدث خطأ أثناء حذف المنتج');
    }
  };

  const totalValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
  const lowStockCount = products.filter(p => getStockStatus(p) === 'low-stock').length;
  const outOfStockCount = products.filter(p => getStockStatus(p) === 'out-of-stock').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المنتجات</h1>
          <p className="text-gray-600 mt-1">إدارة وتتبع جميع منتجاتك ومخزونك</p>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={handleExport}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4 ml-2" />
            {isLoading ? 'جاري التصدير...' : 'تصدير'}
          </button>
          <Link
            to="/products/import-easy-orders"
            className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50"
          >
            <ShoppingBagIcon className="h-4 w-4 ml-2" />
            Easy Orders
          </Link>
          <Link
            to="/products/import-woocommerce"
            className="inline-flex items-center px-4 py-2 border border-purple-600 rounded-md shadow-sm text-sm font-medium text-purple-600 bg-white hover:bg-purple-50"
          >
            <ShoppingBagIcon className="h-4 w-4 ml-2" />
            WooCommerce
          </Link>
          <Link
            to="/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 ml-2" />
            إضافة منتج
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PhotoIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي المنتجات</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">منتجات نشطة</p>
              <p className="text-2xl font-bold text-gray-900">
                {products.filter(p => p.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">مخزون منخفض</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PhotoIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">قيمة المخزون</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="البحث عن منتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">جميع الفئات</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">جميع المخزون</option>
            <option value="in-stock">متوفر</option>
            <option value="low-stock">مخزون منخفض</option>
            <option value="out-of-stock">نفد المخزون</option>
          </select>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <FunnelIcon className="h-4 w-4 ml-2" />
            فلاتر متقدمة
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المنتجات...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="mr-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          {/* Header with Actions */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">المنتجات</h1>
              <p className="text-gray-600 mt-1">إدارة منتجات المتجر</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/products/import-easy-orders"
                className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50"
              >
                <ShoppingBagIcon className="h-4 w-4 ml-2" />
                Easy Orders
              </Link>
              <Link
                to="/products/import-woocommerce"
                className="inline-flex items-center px-4 py-2 border border-purple-600 rounded-md shadow-sm text-sm font-medium text-purple-600 bg-white hover:bg-purple-50"
              >
                <ShoppingBagIcon className="h-4 w-4 ml-2" />
                WooCommerce
              </Link>
              <Link
                to="/products/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 ml-2" />
                إضافة منتج جديد
              </Link>
            </div>
          </div>
          <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد منتجات</h3>
          <p className="text-gray-600 mb-6">ابدأ بإضافة منتجك الأول</p>
          <Link
            to="/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 ml-2" />
            إضافة منتج جديد
          </Link>
        </div>
      )}

      {/* Products Table */}
      {!loading && !error && products.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المنتج
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    السعر
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المخزون
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
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
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                              <PhotoIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                            <div className="text-sm text-gray-500">{product.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatPrice(product.price)}</div>
                        {product.comparePrice && (
                          <div className="text-sm text-gray-500 line-through">
                            {formatPrice(product.comparePrice)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.stock} قطعة</div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(stockStatus)}`}>
                          {getStockStatusText(stockStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {product.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(product.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleView(product.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="عرض المنتج"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(product.id)}
                            className="text-green-600 hover:text-green-900"
                            title="تعديل المنتج"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(product.id)}
                            className={`${product.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                            title={product.isActive ? 'إلغاء تفعيل المنتج' : 'تفعيل المنتج'}
                          >
                            {product.isActive ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900"
                            title="حذف المنتج"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex-1 flex justify-between sm:hidden">
          <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            السابق
          </button>
          <button className="mr-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            التالي
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              عرض <span className="font-medium">1</span> إلى <span className="font-medium">{filteredProducts.length}</span> من{' '}
              <span className="font-medium">{products.length}</span> منتج
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                السابق
              </button>
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                1
              </button>
              <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                التالي
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
