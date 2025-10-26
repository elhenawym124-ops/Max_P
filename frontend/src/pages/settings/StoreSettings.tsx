import React, { useState, useEffect } from 'react';
import {
  BuildingStorefrontIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { storeSettingsService, Branch, ShippingZone } from '../../services/storeSettingsService';
import { BranchesSection } from '../../components/store/BranchesSection';
import { ShippingSection } from '../../components/store/ShippingSection';
import { BranchModal } from '../../components/store/BranchModal';
import { ShippingModal } from '../../components/store/ShippingModal';

const StoreSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'branches' | 'shipping'>('branches');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingShipping, setEditingShipping] = useState<ShippingZone | null>(null);

  // Branch form state
  const [branchForm, setBranchForm] = useState<Partial<Branch>>({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    workingHours: '',
    isActive: true,
  });

  // Shipping form state
  const [shippingForm, setShippingForm] = useState<Partial<ShippingZone>>({
    governorates: [],
    price: 0,
    deliveryTime: '',
    isActive: true,
  });
  const [governorateInput, setGovernorateInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [branchesRes, shippingRes] = await Promise.all([
        storeSettingsService.getBranches(),
        storeSettingsService.getShippingZones(),
      ]);
      setBranches(branchesRes.data.data || []);
      setShippingZones(shippingRes.data.data || []);
    } catch (error) {
      toast.error('فشل تحميل البيانات');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Branch operations
  const handleAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      name: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      workingHours: '',
      isActive: true,
    });
    setShowBranchModal(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm(branch);
    setShowBranchModal(true);
  };

  const handleSaveBranch = async () => {
    try {
      if (!branchForm.name || !branchForm.address || !branchForm.city || !branchForm.phone) {
        toast.error('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      if (editingBranch) {
        await storeSettingsService.updateBranch(editingBranch.id, branchForm);
        toast.success('تم تحديث الفرع بنجاح');
      } else {
        await storeSettingsService.createBranch(branchForm);
        toast.success('تم إضافة الفرع بنجاح');
      }

      setShowBranchModal(false);
      loadData();
    } catch (error) {
      toast.error('فشل حفظ الفرع');
      console.error('Error saving branch:', error);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفرع؟')) return;

    try {
      await storeSettingsService.deleteBranch(id);
      toast.success('تم حذف الفرع بنجاح');
      loadData();
    } catch (error) {
      toast.error('فشل حذف الفرع');
      console.error('Error deleting branch:', error);
    }
  };

  // Shipping operations
  const handleAddShipping = () => {
    setEditingShipping(null);
    setShippingForm({
      governorates: [],
      price: 0,
      deliveryTime: '',
      isActive: true,
    });
    setGovernorateInput('');
    setShowShippingModal(true);
  };

  const handleEditShipping = (zone: ShippingZone) => {
    setEditingShipping(zone);
    setShippingForm(zone);
    setGovernorateInput('');
    setShowShippingModal(true);
  };

  const handleAddGovernorate = () => {
    if (!governorateInput.trim()) return;

    const variations = storeSettingsService.generateGovernorateVariations(governorateInput.trim());
    setShippingForm(prev => ({
      ...prev,
      governorates: [...(prev.governorates || []), ...variations],
    }));
    setGovernorateInput('');
  };

  const handleRemoveGovernorate = (index: number) => {
    setShippingForm(prev => ({
      ...prev,
      governorates: (prev.governorates || []).filter((_, i) => i !== index),
    }));
  };

  const handleSaveShipping = async () => {
    try {
      if (!shippingForm.governorates?.length || !shippingForm.price || !shippingForm.deliveryTime) {
        toast.error('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      if (editingShipping) {
        await storeSettingsService.updateShippingZone(editingShipping.id, shippingForm);
        toast.success('تم تحديث منطقة الشحن بنجاح');
      } else {
        await storeSettingsService.createShippingZone(shippingForm);
        toast.success('تم إضافة منطقة الشحن بنجاح');
      }

      setShowShippingModal(false);
      loadData();
    } catch (error) {
      toast.error('فشل حفظ منطقة الشحن');
      console.error('Error saving shipping zone:', error);
    }
  };

  const handleDeleteShipping = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المنطقة؟')) return;

    try {
      await storeSettingsService.deleteShippingZone(id);
      toast.success('تم حذف منطقة الشحن بنجاح');
      loadData();
    } catch (error) {
      toast.error('فشل حذف منطقة الشحن');
      console.error('Error deleting shipping zone:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <BuildingStorefrontIcon className="h-8 w-8 text-indigo-600 ml-3" />
          إعدادات المتجر
        </h1>
        <p className="mt-2 text-gray-600">إدارة الفروع وإعدادات الشحن</p>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('branches')}
              className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center ${
                activeTab === 'branches'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BuildingStorefrontIcon className="h-5 w-5 ml-2" />
              الفروع
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center ${
                activeTab === 'shipping'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TruckIcon className="h-5 w-5 ml-2" />
              الشحن
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'branches' ? (
            <BranchesSection
              branches={branches}
              onAdd={handleAddBranch}
              onEdit={handleEditBranch}
              onDelete={handleDeleteBranch}
            />
          ) : (
            <ShippingSection
              zones={shippingZones}
              onAdd={handleAddShipping}
              onEdit={handleEditShipping}
              onDelete={handleDeleteShipping}
            />
          )}
        </div>
      </div>

      {/* Branch Modal */}
      {showBranchModal && (
        <BranchModal
          branch={branchForm}
          isEditing={!!editingBranch}
          onClose={() => setShowBranchModal(false)}
          onSave={handleSaveBranch}
          onChange={setBranchForm}
        />
      )}

      {/* Shipping Modal */}
      {showShippingModal && (
        <ShippingModal
          zone={shippingForm}
          isEditing={!!editingShipping}
          onClose={() => setShowShippingModal(false)}
          onSave={handleSaveShipping}
          onChange={setShippingForm}
          governorateInput={governorateInput}
          onGovernorateInputChange={setGovernorateInput}
          onAddGovernorate={handleAddGovernorate}
          onRemoveGovernorate={handleRemoveGovernorate}
        />
      )}
    </div>
  );
};

export default StoreSettings;
