import React from 'react';
import { XMarkIcon, ChatBubbleLeftRightIcon, StarIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';

interface EnhancedOrderModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

const EnhancedOrderModal: React.FC<EnhancedOrderModalProps> = ({ order, isOpen, onClose }) => {
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  if (!isOpen || !order) return null;

  const getCustomerDisplayName = () => {
    if (order.customer) {
      return `${order.customer.firstName} ${order.customer.lastName}`.trim();
    }
    
    if (order.customerName && !order.customerName.match(/^\d+/)) {
      return order.customerName;
    }
    
    if (order.customerName && order.customerName.match(/^\d+/)) {
      return `عميل فيسبوك (${order.customerName.substring(0, 8)}...)`;
    }
    
    return 'عميل غير محدد';
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return <InformationCircleIcon className="h-4 w-4" />;
    
    if (confidence >= 0.8) return <StarIcon className="h-4 w-4" />;
    return <ExclamationTriangleIcon className="h-4 w-4" />;
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'في الانتظار',
      'CONFIRMED': 'مؤكد',
      'PROCESSING': 'قيد المعالجة',
      'SHIPPED': 'تم الشحن',
      'DELIVERED': 'تم التسليم',
      'CANCELLED': 'ملغي'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            تفاصيل الطلب المحسن - {order.orderNumber}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* معلومات العميل */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
              <span>معلومات العميل</span>
              {order.customer?.facebookId && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  فيسبوك
                </span>
              )}
            </h4>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-500">الاسم:</span>
                <span className="text-sm text-gray-900 mr-2">{getCustomerDisplayName()}</span>
              </div>
              
              {order.customerPhone && (
                <div>
                  <span className="text-sm font-medium text-gray-500">الهاتف:</span>
                  <span className="text-sm text-gray-900 mr-2">{order.customerPhone}</span>
                </div>
              )}
              
              {order.customerEmail && (
                <div>
                  <span className="text-sm font-medium text-gray-500">الإيميل:</span>
                  <span className="text-sm text-gray-900 mr-2">{order.customerEmail}</span>
                </div>
              )}
              
              {order.city && (
                <div>
                  <span className="text-sm font-medium text-gray-500">المدينة:</span>
                  <span className="text-sm text-gray-900 mr-2">{order.city}</span>
                </div>
              )}
              
              {order.customerAddress && (
                <div>
                  <span className="text-sm font-medium text-gray-500">العنوان:</span>
                  <span className="text-sm text-gray-900 mr-2">{order.customerAddress}</span>
                </div>
              )}
              
              {order.customer?.facebookId && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Facebook ID:</span>
                  <span className="text-sm text-gray-900 mr-2">{order.customer.facebookId}</span>
                </div>
              )}
            </div>
          </div>

          {/* معلومات الطلب */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-3">معلومات الطلب</h4>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-500">الحالة:</span>
                <span className="text-sm text-gray-900 mr-2">{getStatusText(order.status)}</span>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-500">طريقة الدفع:</span>
                <span className="text-sm text-gray-900 mr-2">{order.paymentMethod}</span>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-500">حالة الدفع:</span>
                <span className="text-sm text-gray-900 mr-2">
                  {order.paymentStatus === 'PENDING' ? 'في الانتظار' :
                   order.paymentStatus === 'COMPLETED' ? 'مدفوع' : 'فشل'}
                </span>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-500">تاريخ الإنشاء:</span>
                <span className="text-sm text-gray-900 mr-2">{formatDate(order.createdAt)}</span>
              </div>
              
              {order.extractionTimestamp && (
                <div>
                  <span className="text-sm font-medium text-gray-500">تاريخ الاستخراج:</span>
                  <span className="text-sm text-gray-900 mr-2">{formatDate(order.extractionTimestamp)}</span>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-gray-500">معرف الطلب:</span>
                <span className="text-sm text-gray-900 mr-2 font-mono">{order.id}</span>
              </div>

              {order.customerId && (
                <div>
                  <span className="text-sm font-medium text-gray-500">معرف العميل:</span>
                  <span className="text-sm text-gray-900 mr-2 font-mono">{order.customerId}</span>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-gray-500">العملة:</span>
                <span className="text-sm text-gray-900 mr-2">{order.currency || 'EGP'}</span>
              </div>
            </div>
          </div>

          {/* معلومات جودة البيانات */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-3">جودة البيانات والاستخراج</h4>
            
            <div className="space-y-2">
              {order.confidence && (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500">مستوى الثقة:</span>
                  <div className={`flex items-center mr-2 ${getConfidenceColor(order.confidence)}`}>
                    {getConfidenceIcon(order.confidence)}
                    <span className="text-sm mr-1">{(order.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}
              
              {order.extractionMethod && (
                <div>
                  <span className="text-sm font-medium text-gray-500">طريقة الاستخراج:</span>
                  <span className="text-sm text-gray-900 mr-2">
                    {order.extractionMethod === 'ai_enhanced' ? 'ذكاء اصطناعي محسن' :
                     order.extractionMethod === 'ai_basic' ? 'ذكاء اصطناعي أساسي' :
                     order.extractionMethod === 'manual' ? 'يدوي' : order.extractionMethod}
                  </span>
                </div>
              )}
              
              {order.validationStatus && (
                <div>
                  <span className="text-sm font-medium text-gray-500">حالة التحقق:</span>
                  <span className="text-sm text-gray-900 mr-2">
                    {order.validationStatus === 'validated' ? 'تم التحقق' :
                     order.validationStatus === 'needs_review' ? 'يحتاج مراجعة' : 'في الانتظار'}
                  </span>
                </div>
              )}
              
              {order.sourceType && (
                <div>
                  <span className="text-sm font-medium text-gray-500">مصدر البيانات:</span>
                  <span className="text-sm text-gray-900 mr-2">
                    {order.sourceType === 'ai_conversation' ? 'محادثة ذكية' :
                     order.sourceType === 'manual' ? 'إدخال يدوي' : order.sourceType}
                  </span>
                </div>
              )}

              {order.dataQuality && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <div className="text-sm font-medium text-gray-700 mb-2">تقييم جودة البيانات:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {order.dataQuality.customerNameQuality && (
                      <div className="flex justify-between">
                        <span>جودة اسم العميل:</span>
                        <span className={`font-medium ${
                          order.dataQuality.customerNameQuality > 0.8 ? 'text-green-600' :
                          order.dataQuality.customerNameQuality > 0.6 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {(order.dataQuality.customerNameQuality * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    {order.dataQuality.productInfoQuality && (
                      <div className="flex justify-between">
                        <span>جودة معلومات المنتج:</span>
                        <span className={`font-medium ${
                          order.dataQuality.productInfoQuality > 0.8 ? 'text-green-600' :
                          order.dataQuality.productInfoQuality > 0.6 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {(order.dataQuality.productInfoQuality * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    {order.dataQuality.addressQuality && (
                      <div className="flex justify-between">
                        <span>جودة العنوان:</span>
                        <span className={`font-medium ${
                          order.dataQuality.addressQuality > 0.8 ? 'text-green-600' :
                          order.dataQuality.addressQuality > 0.6 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {(order.dataQuality.addressQuality * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    {order.dataQuality.overallScore && (
                      <div className="flex justify-between col-span-2 pt-2 border-t">
                        <span className="font-medium">النتيجة الإجمالية:</span>
                        <span className={`font-bold ${
                          order.dataQuality.overallScore > 0.8 ? 'text-green-600' :
                          order.dataQuality.overallScore > 0.6 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {(order.dataQuality.overallScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* رابط المحادثة */}
          {order.conversationId && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-3">المحادثة المرتبطة</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">معرف المحادثة:</div>
                  <div className="text-sm font-mono text-gray-900">{order.conversationId}</div>
                  {order.conversation && (
                    <div className="text-xs text-gray-500 mt-1">
                      القناة: {order.conversation.channel} | الحالة: {order.conversation.status}
                    </div>
                  )}
                </div>
                
                <a
                  href={`/conversations?highlight=${order.conversationId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  title="فتح المحادثة في تبويب جديد"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                  عرض المحادثة الأصلية
                </a>
              </div>
            </div>
          )}
        </div>

        {/* المنتجات */}
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">المنتجات</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التفاصيل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجمالي</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">جودة البيانات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.productColor && <div>اللون: {item.productColor}</div>}
                      {item.productSize && <div>المقاس: {item.productSize}</div>}
                      {item.extractionSource && (
                        <div className="text-xs text-gray-400">
                          المصدر: {item.extractionSource === 'ai' ? 'ذكاء اصطناعي' : item.extractionSource}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(item.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(item.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="space-y-1">
                        {item.confidence && (
                          <div className="flex items-center">
                            {getConfidenceIcon(item.confidence)}
                            <span className={`mr-1 ${getConfidenceColor(item.confidence)}`}>
                              {(item.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                        {item.extractionSource && (
                          <div className="text-xs text-gray-500">
                            مصدر: {item.extractionSource === 'ai' ? 'ذكاء اصطناعي' :
                                   item.extractionSource === 'manual' ? 'يدوي' :
                                   item.extractionSource === 'database' ? 'قاعدة البيانات' :
                                   item.extractionSource}
                          </div>
                        )}
                        {item.productId && item.productId !== 'ai-generated' && (
                          <div className="text-xs text-green-600">
                            ✓ مطابق لمنتج في المخزون
                          </div>
                        )}
                        {(!item.productId || item.productId === 'ai-generated') && (
                          <div className="text-xs text-orange-600">
                            ⚠ منتج مستخرج من المحادثة
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ملخص التكاليف */}
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-3">ملخص التكاليف</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">المجموع الفرعي:</span>
              <span className="text-sm text-gray-900">{formatPrice(order.subtotal)}</span>
            </div>
            
            {order.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">الضرائب:</span>
                <span className="text-sm text-gray-900">{formatPrice(order.tax)}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">الشحن:</span>
              <span className="text-sm text-gray-900">{formatPrice(order.shipping)}</span>
            </div>
            
            <div className="flex justify-between border-t pt-2">
              <span className="text-md font-medium text-gray-900">الإجمالي:</span>
              <span className="text-md font-medium text-gray-900">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* الملاحظات */}
        {order.notes && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">الملاحظات</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</pre>
            </div>
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            إغلاق
          </button>
          
          {order.conversationId && (
            <a
              href={`/conversations?highlight=${order.conversationId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              فتح المحادثة
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedOrderModal;
