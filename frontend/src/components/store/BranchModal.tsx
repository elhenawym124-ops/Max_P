import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Branch } from '../../services/storeSettingsService';

interface BranchModalProps {
  branch: Partial<Branch>;
  isEditing: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (branch: Partial<Branch>) => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({
  branch,
  isEditing,
  onClose,
  onSave,
  onChange,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'تعديل الفرع' : 'إضافة فرع جديد'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم الفرع <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={branch.name || ''}
                onChange={(e) => onChange({ ...branch, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="الفرع الرئيسي"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العنوان <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={branch.address || ''}
                onChange={(e) => onChange({ ...branch, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="شارع التحرير، وسط البلد"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المدينة <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={branch.city || ''}
                onChange={(e) => onChange({ ...branch, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="القاهرة"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهاتف <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={branch.phone || ''}
                  onChange={(e) => onChange({ ...branch, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={branch.email || ''}
                  onChange={(e) => onChange({ ...branch, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="branch@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ساعات العمل
              </label>
              <input
                type="text"
                value={branch.workingHours || ''}
                onChange={(e) => onChange({ ...branch, workingHours: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="من 9 صباحاً إلى 9 مساءً"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="branchActive"
                checked={branch.isActive !== false}
                onChange={(e) => onChange({ ...branch, isActive: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="branchActive" className="mr-2 text-sm text-gray-700">
                الفرع نشط
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              إلغاء
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {isEditing ? 'حفظ التغييرات' : 'إضافة الفرع'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
