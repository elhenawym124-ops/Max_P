import React, { useState, useEffect } from 'react';
import { ShoppingCartIcon, ArrowPathIcon, PlusIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { getApiUrl } from '../config/environment'; // Import environment config

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description?: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

const OrderDemo: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('أحمد محمد');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // تحميل المنتجات
  const loadProducts = async () => {
    try {
      setLoading(true);
      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const response = await fetch(`${apiUrl}/products`);
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      // بيانات تجريبية في حالة فشل التحميل
      setProducts([
        { id: '1', name: 'لابتوب Dell', price: 15000, stock: 5, description: 'لابتوب عالي الأداء' },
        { id: '2', name: 'ماوس لاسلكي', price: 250, stock: 20, description: 'ماوس مريح للاستخدام' },
        { id: '3', name: 'كيبورد ميكانيكي', price: 800, stock: 10, description: 'كيبورد للألعاب' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // إضافة منتج للطلب
  const addProductToOrder = (product: Product) => {
    const existingItem = selectedProducts.find(item => item.productId === product.id);
    
    if (existingItem) {
      setSelectedProducts(prev => prev.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setSelectedProducts(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        total: product.price
      }]);
    }
  };

  // إزالة منتج من الطلب
  const removeProductFromOrder = (productId: string) => {
    setSelectedProducts(prev => prev.filter(item => item.productId !== productId));
  };

  // تحديث كمية المنتج
  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProductFromOrder(productId);
      return;
    }
    
    setSelectedProducts(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity, total: quantity * item.price }
        : item
    ));
  };

  // حساب إجمالي الطلب
  const calculateOrderTotal = () => {
    return selectedProducts.reduce((total, item) => total + item.total, 0);
  };

  // إنشاء طلب
  const createOrder = async () => {
    if (selectedProducts.length === 0) return;
    
    try {
      setCreatingOrder(true);
      
      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const orderData = {
        customerId: '1',
        conversationId: '1',
        products: selectedProducts,
        shippingAddress: shippingAddress.trim() || undefined,
        notes: orderNotes.trim() || undefined
      };
      
      const response = await fetch(`${apiUrl}/ai/create-order-from-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOrderSuccess(true);
        setSelectedProducts([]);
        setOrderNotes('');
        setShippingAddress('');
        
        setTimeout(() => {
          setOrderSuccess(false);
        }, 3000);
      } else {
        alert('فشل في إنشاء الطلب: ' + (data.error || 'خطأ غير معروف'));
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('فشل في إنشاء الطلب');
    } finally {
      setCreatingOrder(false);
    }
  };

  // تحميل المنتجات عند بدء التشغيل
  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingCartIcon className="h-8 w-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">نظام إدارة الطلبات - Demo</h1>
          </div>
          <p className="text-gray-600">
            هذا عرض توضيحي لنظام إنشاء الطلبات من المحادثات. العميل: <strong>{customerName}</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* قائمة المنتجات */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">المنتجات المتاحة</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">جاري تحميل المنتجات...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-lg font-semibold text-green-600">{product.price} جنيه</span>
                          <span className="text-sm text-gray-500">المخزون: {product.stock}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => addProductToOrder(product)}
                        disabled={product.stock === 0}
                        className="ml-4 p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* تفاصيل الطلب */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">تفاصيل الطلب</h2>
            
            {/* المنتجات المختارة */}
            <div className="space-y-3 mb-6">
              {selectedProducts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">لم يتم اختيار أي منتجات بعد</p>
              ) : (
                selectedProducts.map((item) => (
                  <div key={item.productId} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.productName}</h4>
                        <p className="text-sm text-gray-600">{item.price} جنيه × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateProductQuantity(item.productId, item.quantity - 1)}
                            className="w-6 h-6 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateProductQuantity(item.productId, item.quantity + 1)}
                            className="w-6 h-6 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-semibold text-green-600 w-20 text-right">{item.total} جنيه</span>
                        <button
                          onClick={() => removeProductFromOrder(item.productId)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* عنوان الشحن */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                عنوان الشحن (اختياري)
              </label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="أدخل عنوان الشحن..."
              />
            </div>

            {/* ملاحظات */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات إضافية (اختياري)
              </label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="أي ملاحظات خاصة بالطلب..."
              />
            </div>

            {/* الإجمالي */}
            {selectedProducts.length > 0 && (
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>الإجمالي:</span>
                  <span className="text-green-600">{calculateOrderTotal()} جنيه</span>
                </div>
              </div>
            )}

            {/* زر الإنشاء */}
            <div className="flex items-center justify-center">
              {orderSuccess ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>تم إنشاء الطلب بنجاح!</span>
                </div>
              ) : (
                <button
                  onClick={createOrder}
                  disabled={selectedProducts.length === 0 || creatingOrder}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {creatingOrder ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <ShoppingCartIcon className="h-4 w-4" />
                      إنشاء الطلب ({selectedProducts.length} منتج)
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDemo;
