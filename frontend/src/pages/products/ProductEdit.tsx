import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { apiClient } from '../../services/apiClient';
import { config } from '../../config';
import { productApi, uploadFiles, deleteFile } from '../../utils/apiHelpers';
import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  sku: string;
  category: string;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  tags?: string[];
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
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
  images?: string;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  metadata?: any;
}

const ProductEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVariants, setShowVariants] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    cost: '',
    sku: '',
    category: '',
    stock: '',
    lowStockThreshold: '',
    isActive: true,
    tags: [] as string[],
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: ''
    }
  });

  useEffect(() => {
    if (id) {
      loadProduct(id);
      loadCategories();
    }
  }, [id]);

  // Add effect to reload data when page becomes visible (user returns from view page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && id) {
        console.log('Page became visible, reloading product data...');
        loadProduct(id);
        loadCategories();
      }
    };

    const handleFocus = () => {
      if (id) {
        console.log('Window focused, reloading product data...');
        loadProduct(id);
        loadCategories();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [id]);

  const loadProduct = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);

      const token = authService.getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`${config.apiUrl}/products/${productId}?_t=${timestamp}`, {
        headers,
        cache: 'no-cache'
      });

      const data = await response.json();

      if (data.success && data.data) {
        const productData = data.data;
        setProduct(productData);
        
        // Fill form with product data
        setFormData({
          name: productData.name || '',
          description: productData.description || '',
          price: productData.price?.toString() || '',
          comparePrice: productData.comparePrice?.toString() || '',
          cost: productData.cost?.toString() || '',
          sku: productData.sku || '',
          category: productData.category?.id || productData.category || '',
          stock: productData.stock?.toString() || '',
          lowStockThreshold: productData.lowStockThreshold?.toString() || '',
          isActive: productData.isActive ?? true,
          tags: productData.tags || [],
          weight: productData.weight?.toString() || '',
          dimensions: {
            length: productData.dimensions?.length?.toString() || '',
            width: productData.dimensions?.width?.toString() || '',
            height: productData.dimensions?.height?.toString() || ''
          }
        });

        // Load variants if they exist
        if (productData.variants && productData.variants.length > 0) {
          setVariants(productData.variants);
          setShowVariants(true);
        }
      } else {
        setError('فشل في تحميل بيانات المنتج');
      }
    } catch (err) {
      console.error('Error loading product:', err);
      setError('حدث خطأ أثناء تحميل بيانات المنتج');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/products/categories');
      const data = response.data;
      
      if (data.success && data.data) {
        setCategories(data.data);
      } else if (Array.isArray(data)) {
        // Handle direct array response
        setCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('dimensions.')) {
      const dimensionKey = name.split('.')[1] as string;
      setFormData(prev => ({
        ...prev,
        dimensions: {
          ...prev.dimensions,
          [dimensionKey]: value
        }
      }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Variant management functions
  const addVariant = () => {
    const newVariant: any = {
      name: '',
      type: 'color',
      sku: '',
      price: formData.price ? parseFloat(formData.price) : 0,
      comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : 0,
      cost: formData.cost ? parseFloat(formData.cost) : 0,
      images: '',
      stock: 0,
      isActive: true,
      sortOrder: variants.length,
      metadata: null
    };
    console.log(`➕ [VARIANT-ADD] Adding new variant:`, newVariant);
    setVariants(prev => {
      const updated = [...prev, newVariant];
      console.log(`📊 [VARIANT-ADD] Total variants after add: ${updated.length}`);
      return updated;
    });
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    console.log(`✏️ [VARIANT-UPDATE] Updating variant ${index}, field: ${field}, value:`, value);
    setVariants(prev => prev.map((variant, i) => {
      if (i === index) {
        const updated = { ...variant, [field]: value };
        console.log(`📊 [VARIANT-UPDATE] Updated variant ${index}:`, updated);
        return updated;
      }
      return variant;
    }));
  };

  const removeVariant = (index: number) => {
    console.log(`🗑️ [VARIANT-REMOVE] Removing variant at index ${index}`);
    setVariants(prev => {
      const variantToRemove = prev[index];
      console.log(`📋 [VARIANT-REMOVE] Variant being removed:`, variantToRemove);
      const updated = prev.filter((_, i) => i !== index);
      console.log(`📊 [VARIANT-REMOVE] Total variants after removal: ${updated.length}`);
      return updated;
    });
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
      const formData = new FormData();
      filesToUpload.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(`${config.apiUrl}/uploads/multiple`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

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
      console.log(`🗑️ [FRONTEND] Removing image: ${imageUrl}`);

      // Remove from product database
      const response = await fetch(`${config.apiUrl}/products/${product?.id}/images`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-access-token'
        },
        body: JSON.stringify({ imageUrl })
      });

      const data = await response.json();
      console.log(`📊 [FRONTEND] Remove image response:`, data);

      if (data.success) {
        console.log(`✅ [FRONTEND] Image removed from database successfully`);
        setUploadedImages(prev => prev.filter((_, i) => i !== index));

        // Also try to delete the physical file if it's an uploaded file
        const filename = imageUrl.split('/').pop();
        if (filename && imageUrl.includes('/uploads/')) {
          try {
            await fetch(`${config.apiUrl}/uploads/file/${filename}`, {
              method: 'DELETE'
            });
            console.log(`🗂️ [FRONTEND] Physical file deleted: ${filename}`);
          } catch (fileError) {
            console.warn(`⚠️ [FRONTEND] Could not delete physical file: ${filename}`, fileError);
          }
        }
      } else {
        console.error(`❌ [FRONTEND] Failed to remove image from database:`, data.error);
        alert('فشل في حذف الصورة من قاعدة البيانات: ' + data.message);
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error removing image:', error);
      alert('حدث خطأ أثناء حذف الصورة');
    }
  };

  const addImageFromUrl = async (imageUrl: string) => {
    if (!imageUrl.trim() || !product) return;

    try {
      console.log(`🔗 [FRONTEND] Adding image from URL: ${imageUrl}`);

      const response = await fetch(`${config.apiUrl}/products/${product.id}/images/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageUrl: imageUrl.trim() })
      });

      const data = await response.json();
      console.log(`📊 [FRONTEND] Add image URL response:`, data);

      if (data.success) {
        console.log(`✅ [FRONTEND] Image URL added to database successfully`);
        setUploadedImages(prev => [...prev, imageUrl.trim()]);
        alert('تم إضافة الصورة من الرابط بنجاح!');
      } else {
        console.error(`❌ [FRONTEND] Failed to add image URL:`, data.error);
        alert('فشل في إضافة الصورة: ' + data.message);
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error adding image from URL:', error);
      alert('حدث خطأ أثناء إضافة الصورة من الرابط');
    }
  };

  const addVariantImage = (variantIndex: number, imageUrl: string) => {
    if (imageUrl.trim()) {
      console.log(`🎨 [VARIANT-IMAGE] Adding image to variant ${variantIndex}: ${imageUrl}`);
      setVariants(prev => prev.map((variant, i) => {
        if (i === variantIndex) {
          const currentImages = variant.images ? variant.images.split(',').filter(img => img.trim()) : [];
          if (!currentImages.includes(imageUrl.trim())) {
            currentImages.push(imageUrl.trim());
            console.log(`✅ [VARIANT-IMAGE] Image added to variant ${variantIndex}. Total images: ${currentImages.length}`);
            return {
              ...variant,
              images: currentImages.join(',')
            };
          } else {
            console.log(`ℹ️ [VARIANT-IMAGE] Image already exists in variant ${variantIndex}`);
            return variant;
          }
        }
        return variant;
      }));
    }
  };

  const removeVariantImage = (variantIndex: number, imageUrl: string) => {
    console.log(`🗑️ [VARIANT-IMAGE] Removing image from variant ${variantIndex}: ${imageUrl}`);
    setVariants(prev => prev.map((variant, i) => {
      if (i === variantIndex) {
        const currentImages = variant.images ? variant.images.split(',').filter(img => img.trim()) : [];
        const filteredImages = currentImages.filter(img => img !== imageUrl);
        console.log(`✅ [VARIANT-IMAGE] Image removed from variant ${variantIndex}. Remaining images: ${filteredImages.length}`);
        return {
          ...variant,
          images: filteredImages.join(',')
        };
      }
      return variant;
    }));
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;

    try {
      setSaving(true);
      setError(null);

      // Prepare update data
      const updateData = {
        name: formData.name,
        description: formData.description,
        price: formData.price ? parseFloat(formData.price) : undefined,
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        sku: formData.sku,
        category: formData.category,
        stock: formData.stock ? parseInt(formData.stock) : undefined,
        lowStockThreshold: formData.lowStockThreshold ? parseInt(formData.lowStockThreshold) : undefined,
        isActive: formData.isActive,
        tags: formData.tags,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        dimensions: (formData.dimensions.length || formData.dimensions.width || formData.dimensions.height) ? {
          length: formData.dimensions.length ? parseFloat(formData.dimensions.length) : undefined,
          width: formData.dimensions.width ? parseFloat(formData.dimensions.width) : undefined,
          height: formData.dimensions.height ? parseFloat(formData.dimensions.height) : undefined,
        } : undefined
      };

      const token = authService.getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${config.apiUrl}/products/${product.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update variants if any changes
        try {
          console.log(`🎨 [VARIANTS] Starting variant update process for product ${product.id}`);
          console.log(`📊 [VARIANTS] Current variants in state:`, variants);

          // Headers with auth token for variant operations
          const variantHeaders = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-access-token'
          };

          // First, get existing variants
          const existingVariantsResponse = await fetch(`${config.apiUrl}/products/${product.id}/variants`, {
            headers: variantHeaders
          });
          const existingVariantsData = await existingVariantsResponse.json();
          const existingVariants = existingVariantsData.success ? existingVariantsData.data : [];

          console.log(`📋 [VARIANTS] Existing variants in database:`, existingVariants);

          // Delete removed variants
          for (const existingVariant of existingVariants) {
            const stillExists = variants.find(v => v.id === existingVariant.id);
            if (!stillExists) {
              console.log(`🗑️ [VARIANTS] Deleting removed variant: ${existingVariant.id} (${existingVariant.name})`);
              const deleteResponse = await fetch(`${config.apiUrl}/products/variants/${existingVariant.id}`, {
                method: 'DELETE',
                headers: variantHeaders
              });
              const deleteData = await deleteResponse.json();
              console.log(`📊 [VARIANTS] Delete response:`, deleteData);
            }
          }

          // Update or create variants
          for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];
            if (!variant) continue;

            console.log(`🔄 [VARIANTS] Processing variant ${i + 1}/${variants.length}:`, variant);

            if (variant.id) {
              // Update existing variant
              console.log(`✏️ [VARIANTS] Updating existing variant: ${variant.id}`);
              const updateResponse = await fetch(`${config.apiUrl}/products/variants/${variant.id}`, {
                method: 'PATCH',
                headers: variantHeaders,
                body: JSON.stringify(variant)
              });
              const updateData = await updateResponse.json();
              console.log(`📊 [VARIANTS] Update response:`, updateData);
            } else {
              // Create new variant
              console.log(`➕ [VARIANTS] Creating new variant:`, variant);
              const createResponse = await fetch(`${config.apiUrl}/products/${product.id}/variants`, {
                method: 'POST',
                headers: variantHeaders,
                body: JSON.stringify(variant)
              });
              const createData = await createResponse.json();
              console.log(`📊 [VARIANTS] Create response:`, createData);
            }
          }

          console.log(`✅ [VARIANTS] Variant update process completed successfully`);
        } catch (variantError) {
          console.error('❌ [VARIANTS] Error updating variants:', variantError);
          // Don't fail the whole process if variants fail
          alert('تحذير: حدث خطأ في تحديث المتغيرات، لكن تم حفظ باقي بيانات المنتج');
        }

        alert('تم تحديث المنتج بنجاح');
        // Reload the product data to show updated information
        await loadProduct(product.id);
        // Navigate to view page with a slight delay to ensure data is loaded
        setTimeout(() => {
          navigate(`/products/${product.id}`);
        }, 500);
      } else {
        setError(data.error || 'فشل في تحديث المنتج');
      }
    } catch (err) {
      console.error('Error updating product:', err);
      setError('حدث خطأ أثناء تحديث المنتج');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <Link
            to="/products"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeftIcon className="h-4 w-4 ml-2" />
            العودة للمنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Link
                to={`/products/${id}`}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-4 w-4 ml-1" />
                العودة لتفاصيل المنتج
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">تعديل المنتج</h1>
                <p className="text-sm text-gray-500">{formData.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XMarkIcon className="h-5 w-5 text-red-400 ml-2" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Last Update Info */}
        {product && (product as any).updatedAt && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-blue-400 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800">
                  آخر تحديث: {new Date((product as any).updatedAt).toLocaleString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (id) {
                    loadProduct(id);
                    loadCategories();
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                تحديث الآن
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">المعلومات الأساسية</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  اسم المنتج *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">
                  رمز المنتج (SKU) *
                </label>
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  الفئة *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">اختر الفئة</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  السعر *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
                  الكمية المتاحة *
                </label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                  <span className="mr-2 text-sm text-gray-700">المنتج نشط ومتاح للبيع</span>
                </label>
              </div>
            </div>
          </div>

          {/* Media Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">صور المنتج</h2>
            <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="images" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span>ارفع ملفات جديدة</span>
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

            {/* Add Image from URL */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">إضافة صورة من رابط:</h4>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="أدخل رابط الصورة هنا..."
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      if (input.value.trim()) {
                        addImageFromUrl(input.value);
                        input.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement;
                    if (input.value.trim()) {
                      addImageFromUrl(input.value);
                      input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  إضافة
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">يمكنك إضافة صور من روابط خارجية (مثل Google Drive، Dropbox، إلخ)</p>
            </div>

            {uploadedImages.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">الصور الجديدة المرفوعة:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {uploadedImages.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`صورة جديدة ${index + 1}`}
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
                {images.length} صور جديدة تم تحديدها للرفع
              </div>
            )}
          </div>

          {/* Product Variants Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">متغيرات المنتج</h2>
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
                  إدارة متغيرات المنتج مثل الألوان أو الأحجام. كل متغير له صور وسعر ومخزون منفصل.
                </div>

                {variants.map((variant, index) => (
                  <div key={variant.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-800">
                        متغير {index + 1} {variant.name && `- ${variant.name}`}
                      </h4>
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
                          السعر (اختياري)
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

                    {/* Variant Images */}
                    <div className="mt-4 border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        صور المتغير
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {variant.images && variant.images.split(',').filter(img => img.trim()).map((imageUrl, imgIndex) => (
                          <div key={imgIndex} className="relative">
                            <img
                              src={imageUrl.trim()}
                              alt={`${variant.name} ${imgIndex + 1}`}
                              className="w-16 h-16 object-cover rounded border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTI4IDI4TDM2IDM2TDQ0IDI4IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removeVariantImage(index, imageUrl.trim())}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="text-xs font-medium text-gray-600 mb-2">إضافة صورة للمتغير:</h5>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="أدخل رابط الصورة هنا..."
                            className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const input = e.target as HTMLInputElement;
                                if (input.value.trim()) {
                                  addVariantImage(index, input.value);
                                  input.value = '';
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement;
                              if (input.value.trim()) {
                                addVariantImage(index, input.value);
                                input.value = '';
                            }
                          }}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                        >
                          إضافة
                        </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">يمكنك إضافة صور من روابط خارجية للمتغير</p>
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

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 space-x-reverse">
            <Link
              to={`/products/${id}`}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              إلغاء
            </Link>

            <button
              type="button"
              onClick={async () => {
                if (id) {
                  console.log('Manual reload triggered');
                  setLoading(true);
                  try {
                    await loadProduct(id);
                    await loadCategories();
                    // Show success message briefly
                    const originalText = document.querySelector('[data-reload-btn]')?.textContent;
                    const btn = document.querySelector('[data-reload-btn]');
                    if (btn) {
                      btn.textContent = 'تم التحديث ✓';
                      setTimeout(() => {
                        btn.textContent = originalText || 'إعادة تحميل';
                      }, 2000);
                    }
                  } catch (error) {
                    console.error('Error reloading data:', error);
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              data-reload-btn
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 ml-2"></div>
                  جاري التحميل...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  إعادة تحميل
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 ml-2" />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductEdit;
