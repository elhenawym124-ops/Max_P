import React from 'react';
import {
  TruckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { ShippingZone } from '../../services/storeSettingsService';

interface ShippingSectionProps {
  zones: ShippingZone[];
  onAdd: () => void;
  onEdit: (zone: ShippingZone) => void;
  onDelete: (id: string) => void;
}

export const ShippingSection: React.FC<ShippingSectionProps> = ({
  zones,
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">مناطق الشحن</h2>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 ml-2" />
          إضافة منطقة
        </button>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>ملاحظة:</strong> سيتم استخدام هذه المناطق بواسطة الذكاء الصناعي لحساب تكلفة الشحن تلقائياً بناءً على محافظة العميل.
        </p>
      </div>

      {zones.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <TruckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">لا توجد مناطق شحن مضافة</p>
          <button
            onClick={onAdd}
            className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            إضافة منطقة جديدة
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => {
            // Get unique governorates (remove duplicates for display)
            const uniqueGovs = Array.from(new Set(zone.governorates));
            const mainGov = uniqueGovs[0] || 'منطقة غير محددة';
            const variations = uniqueGovs.slice(1);

            return (
              <div
                key={zone.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {mainGov}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          zone.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {zone.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                    {variations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {variations.map((gov, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {gov}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-left mr-4">
                    <div className="flex items-center text-lg font-bold text-indigo-600">
                      <CurrencyDollarIcon className="h-5 w-5 ml-1" />
                      {zone.price} ج.م
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <ClockIcon className="h-4 w-4 ml-1" />
                      {zone.deliveryTime}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(zone)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-center"
                  >
                    <PencilIcon className="h-4 w-4 ml-1" />
                    تعديل
                  </button>
                  <button
                    onClick={() => onDelete(zone.id)}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 flex items-center justify-center"
                  >
                    <TrashIcon className="h-4 w-4 ml-1" />
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
