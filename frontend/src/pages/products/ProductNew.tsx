import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../hooks/useCurrency';
import { getCurrencyByCode } from '../../utils/currency';
import { authService } from '../../services/authService';
import { apiClient } from '../../services/apiClient';
import { config } from '../../config';
import { productApi, uploadFiles, deleteFile } from '../../utils/apiHelpers';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  comparePrice?: number | undefined;
  cost?: number | undefined;
  sku: string;
  category: string;
  stock: number;
  trackInventory: boolean;
  lowStockThreshold: number;
  isActive: boolean;
  tags: string[];
  weight?: number | undefined;
  dimensions?: { length?: number; width?: number; height?: number; } | undefined;
}

interface Category {
  id: string;
  name: string;
}

interface ProductVariant {
  id?: string;
  name: string;
  type: string;
  sku: string;
  price?: number;
  comparePrice?: number;
  cost?: number;
  images: string[];
  stock: number;
  trackInventory: boolean;
  isActive: boolean;
  sortOrder: number;
  metadata?: any;
}

const ProductNew: React.FC = () => {
  const navigate = useNavigate();
  const { currency } = useCurrency();

  // Get currency symbol for display
  const currencyInfo = getCurrencyByCode(currency || 'EGP');
  const displayCurrency = currencyInfo?.symbol || 'ج.م';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    comparePrice: undefined,
    cost: undefined,
    sku: '',
    category: '',
    stock: 0,
    trackInventory: true,
    lowStockThreshold: 5,
    isActive: true,
    tags: [],
    weight: undefined,
    dimensions: undefined,
  });

  const [newTag, setNewTag] = useState('');
  const [showDimensions, setShowDimensions] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/products/categories');
        const data = response.data;
        
        if (data.success && data.data) {
          setCategories(data.data);
        } else if (Array.isArray(data)) {
          // Handle direct array response
          setCategories(data);
        } else {
          setError('فشل في تحميل الفئات');
        }
      } catch (err) {
        console.error('Error loading categories:', err);
        setError('حدث خطأ أثناء الاتصال بالخادم');
      }
    };
    fetchCategories();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDimensionChange = (dimension: 'length' | 'width' | 'height', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setFormData(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [dimension]: numValue,
      },
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  // Variant management functions
  const addVariant = () => {
    const baseVariant: any = {
      name: '',
      type: 'color',
      sku: '',
      images: [],
      stock: 0,
      trackInventory: formData.trackInventory,
      isActive: true,
      sortOrder: variants.length,
      metadata: null
    };
    
    // Only add optional properties if they have values
    if (formData.price && formData.price > 0) {
      baseVariant.price = formData.price;
    }
    if (formData.comparePrice && formData.comparePrice > 0) {
      baseVariant.comparePrice = formData.comparePrice;
    }
    if (formData.cost && formData.cost > 0) {
      baseVariant.cost = formData.cost;
    }
    
    setVariants(prev => [...prev, baseVariant as ProductVariant]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants(prev => prev.map((variant, i) =>
      i === index ? { ...variant, [field]: value } : variant
    ));
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const addVariantImage = (variantIndex: number, imageUrl: string) => {
    if (imageUrl.trim()) {
      setVariants(prev => prev.map((variant, i) =>
        i === variantIndex
          ? { ...variant, images: [...variant.images, imageUrl.trim()] }
          : variant
      ));
    }
  };

  const removeVariantImage = (variantIndex: number, imageIndex: number) => {
    setVariants(prev => prev.map((variant, i) =>
      i === variantIndex
        ? { ...variant, images: variant.images.filter((_, imgI) => imgI !== imageIndex) }
        : variant
    ));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages(selectedFiles);
      // Auto upload images when selected
      uploadImages(selectedFiles);
    }
  };

  const uploadImages = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) return;

    setUploading(true);
    try {
      const data = await uploadFiles(filesToUpload);

      if (data.success) {
        const imageUrls = data.data.map((file: any) => file.fullUrl);
        setUploadedImages(prev => [...prev, ...imageUrls]);
        console.log('Images uploaded successfully:', imageUrls);
      } else {
        console.error('Upload failed:', data.error);
        alert('فشل في رفع الصور: ' + data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('حدث خطأ أثناء رفع الصور');
    } finally {
      setUploading(false);
    }
  };

  const removeUploadedImage = async (imageUrl: string, index: number) => {
    try {
      // Extract filename from URL
      const filename = imageUrl.split('/').pop();
      if (filename) {
        await deleteFile(filename);
      }

      setUploadedImages(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'اسم المنتج مطلوب';
    if (!formData.sku.trim()) return 'رمز المنتج (SKU) مطلوب';
    if (!formData.category) return 'فئة المنتج مطلوبة';
    if (formData.price <= 0) return 'سعر المنتج يجب أن يكون أكبر من صفر';
    if (formData.trackInventory && formData.stock < 0) return 'كمية المخزون لا يمكن أن تكون سالبة';
    if (formData.comparePrice && formData.comparePrice <= formData.price) {
      return 'سعر المقارنة يجب أن يكون أكبر من السعر الأساسي';
    }

    // Validate variants
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      if (!variant) continue;
      if (!variant.name.trim()) return `اسم المتغير ${i + 1} مطلوب`;
      if (!variant.sku.trim()) return `رمز المتغير ${i + 1} مطلوب`;
      if (variant.trackInventory && variant.stock < 0) return `كمية مخزون المتغير ${i + 1} لا يمكن أن تكون سالبة`;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Prepare JSON data
      const productData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        comparePrice: formData.comparePrice,
        cost: formData.cost,
        sku: formData.sku,
        category: formData.category,
        stock: formData.trackInventory ? formData.stock : 0,
        trackInventory: formData.trackInventory,
        lowStockThreshold: formData.lowStockThreshold,
        isActive: formData.isActive,
        tags: formData.tags,
        weight: formData.weight,
        dimensions: formData.dimensions,
        images: uploadedImages, // Add uploaded images
      };

      const token = authService.getAccessToken();
      if (!token) {
        setError('توكن المصادقة غير موجود. يرجى تسجيل الدخول.');
        setLoading(false);
        return;
      }

      const response = await productApi.create(productData);
      const result = await response.json();

      if (result.success) {
        const productId = result.data?.id;

        // Create variants if any exist
        if (variants.length > 0 && productId) {
          try {
            for (const variant of variants) {
              const variantResponse = await productApi.createVariant(productId, variant);

              if (!variantResponse.ok) {
                console.error('Failed to create variant:', variant.name);
              }
            }
          } catch (variantError) {
            console.error('Error creating variants:', variantError);
            // Don't fail the whole process if variants fail
          }
        }

        setSuccess(true);
        setTimeout(() => navigate('/products'), 2000);
      } else {
        setError(result.message || 'فشل في إنشاء المنتج.');
      }
    } catch (err) {
      console.error('Error creating product:', err);
      setError('فشل في إنشاء المنتج. الرجاء المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">تم إنشاء المنتج بنجاح!</h3>
          <p className="mt-1 text-sm text-gray-500">سيتم توجيهك إلى صفحة المنتجات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/products')}
                className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">إضافة منتج جديد</h1>
                <p className="mt-1 text-sm text-gray-500">
                  أدخل معلومات المنتج الجديد
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info Section */}
          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                اسم المنتج *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="أدخل اسم المنتج"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                الوصف
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="وصف تفصيلي للمنتج"
              />
            </div>
          </div>

          {/* Organization Section */}
          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                  رمز المنتج (SKU) *
                </label>
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="مثال: PROD-001"
                  required
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  الفئة *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">اختر فئة</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">التسعير</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    السعر ({displayCurrency}) *
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="comparePrice" className="block text-sm font-medium text-gray-700">
                    سعر المقارنة ({displayCurrency})
                  </label>
                  <input
                    type="number"
                    id="comparePrice"
                    name="comparePrice"
                    value={formData.comparePrice || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
                    التكلفة ({displayCurrency})
                  </label>
                  <input
                    type="number"
                    id="cost"
                    name="cost"
                    value={formData.cost || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">المخزون</h3>
            </div>
            <div className="p-6 space-y-6">
              {/* Track Inventory Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="trackInventory" className="text-sm font-medium text-gray-700">
                    تتبع المخزون
                  </label>
                  <p className="text-sm text-gray-500">
                    فعل هذا الخيار إذا كنت تريد تتبع كمية المخزون لهذا المنتج
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="trackInventory"
                    name="trackInventory"
                    checked={formData.trackInventory}
                    onChange={(e) => setFormData(prev => ({ ...prev, trackInventory: e.target.checked }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Stock Fields - Only show when tracking inventory */}
              {formData.trackInventory && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                      الكمية المتاحة
                    </label>
                    <input
                      type="number"
                      id="stock"
                      name="stock"
                      value={formData.stock || ''}
                      onChange={handleInputChange}
                      min="0"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700">
                      حد التنبيه للمخزون المنخفض
                    </label>
                    <input
                      type="number"
                      id="lowStockThreshold"
                      name="lowStockThreshold"
                      value={formData.lowStockThreshold || ''}
                      onChange={handleInputChange}
                      min="0"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="5"
                    />
                  </div>
                </div>
              )}

              {/* Info message when not tracking inventory */}
              {!formData.trackInventory && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="mr-3">
                      <p className="text-sm text-blue-700">
                        لن يتم تتبع المخزون لهذا المنتج. سيظهر كمتوفر دائماً للعملاء.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Media Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <label htmlFor="images" className="block text-sm font-medium text-gray-700">
              صور المنتج
            </label>
            <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="images" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span>ارفع ملفات</span>
                    <input id="images" name="images" type="file" className="sr-only" multiple onChange={handleImageChange} accept="image/png, image/jpeg, image/gif" />
                  </label>
                  <p className="pr-1">أو اسحبها وأفلتها هنا</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
            {uploading && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-indigo-500">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري رفع الصور...
                </div>
              </div>
            )}

            {uploadedImages.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">الصور المرفوعة:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {uploadedImages.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`صورة ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeUploadedImage(imageUrl, index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {images.length > 0 && !uploading && (
              <div className="mt-4 text-sm text-gray-500">
                {images.length} صور تم تحديدها للرفع
              </div>
            )}
          </div>

          {/* Additional Info Section */}
          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العلامات
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center pl-3 pr-2 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="mr-1 flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none focus:bg-indigo-500 focus:text-white"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); }}}
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="أضف علامة جديدة واضغط Enter"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
                الوزن (كيلوجرام)
              </label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight || ''}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full md:w-1/3 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  الأبعاد (سم)
                </label>
                <button
                  type="button"
                  onClick={() => setShowDimensions(!showDimensions)}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  {showDimensions ? 'إخفاء' : 'إظهار'} الأبعاد
                </button>
              </div>
              {showDimensions && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">الطول</label>
                    <input
                      type="number"
                      value={formData.dimensions?.length || ''}
                      onChange={(e) => handleDimensionChange('length', e.target.value)}
                      min="0"
                      step="0.1"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">العرض</label>
                    <input
                      type="number"
                      value={formData.dimensions?.width || ''}
                      onChange={(e) => handleDimensionChange('width', e.target.value)}
                      min="0"
                      step="0.1"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">الارتفاع</label>
                    <input
                      type="number"
                      value={formData.dimensions?.height || ''}
                      onChange={(e) => handleDimensionChange('height', e.target.value)}
                      min="0"
                      step="0.1"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="mr-2 block text-sm text-gray-900">
                المنتج نشط ومتاح للبيع
              </label>
            </div>
          </div>

          {/* Product Variants Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">متغيرات المنتج</h3>
              <button
                type="button"
                onClick={() => setShowVariants(!showVariants)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                {showVariants ? 'إخفاء' : 'إظهار'} المتغيرات
              </button>
            </div>

            {showVariants && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  أضف متغيرات للمنتج مثل الألوان أو الأحجام. كل متغير له صور وسعر ومخزون منفصل.
                </div>

                {variants.map((variant, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-800">متغير {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          اسم المتغير *
                        </label>
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          placeholder="مثل: أبيض، أسود، كبير، صغير"
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          نوع المتغير
                        </label>
                        <select
                          value={variant.type}
                          onChange={(e) => updateVariant(index, 'type', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="color">لون</option>
                          <option value="size">حجم</option>
                          <option value="material">مادة</option>
                          <option value="style">نمط</option>
                          <option value="other">أخرى</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          رمز المنتج (SKU) *
                        </label>
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                          placeholder="مثل: SHOE-WHITE-001"
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          السعر ({displayCurrency}) (اختياري)
                        </label>
                        <input
                          type="number"
                          value={variant.price || ''}
                          onChange={(e) => updateVariant(index, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                          min="0"
                          step="0.01"
                          placeholder="اتركه فارغ لاستخدام سعر المنتج الأساسي"
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      {/* Track Inventory for Variant */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            تتبع المخزون
                          </label>
                          <p className="text-xs text-gray-500">
                            فعل لتتبع مخزون هذا المتغير
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={variant.trackInventory}
                          onChange={(e) => updateVariant(index, 'trackInventory', e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>

                      {/* Stock Field - Only show when tracking inventory */}
                      {variant.trackInventory && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            المخزون *
                          </label>
                          <input
                            type="number"
                            value={variant.stock}
                            onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value) || 0)}
                            min="0"
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {/* Info when not tracking inventory */}
                      {!variant.trackInventory && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <p className="text-xs text-blue-700">
                            لن يتم تتبع المخزون لهذا المتغير
                          </p>
                        </div>
                      )}

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={variant.isActive}
                          onChange={(e) => updateVariant(index, 'isActive', e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label className="mr-2 block text-sm text-gray-900">
                          متغير نشط
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addVariant}
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 border-dashed rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  إضافة متغير جديد
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XMarkIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="mr-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 space-x-reverse pt-5">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ المنتج'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductNew;
