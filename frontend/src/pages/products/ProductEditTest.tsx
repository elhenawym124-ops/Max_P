import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';

const ProductEditTest: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        console.log('🚀 Loading product:', id);
        const response = await apiClient.get(`/products/${id}`);
        console.log('📦 Raw response:', response);
        console.log('📦 Response data:', response.data);
        
        setProduct(response.data);
        setLoading(false);
      } catch (error) {
        console.error('❌ Error loading product:', error);
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!product) {
    return <div className="p-6">Product not found</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Product Test</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Raw Product Data:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(product, null, 2)}
        </pre>
        
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-2">Parsed Fields:</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name:</label>
              <div className="mt-1 text-sm text-gray-900">{product.name || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">SKU:</label>
              <div className="mt-1 text-sm text-gray-900">{product.sku || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price:</label>
              <div className="mt-1 text-sm text-gray-900">{product.price || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Stock:</label>
              <div className="mt-1 text-sm text-gray-900">{product.stock || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category ID:</label>
              <div className="mt-1 text-sm text-gray-900">{product.categoryId || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Active:</label>
              <div className="mt-1 text-sm text-gray-900">{product.isActive ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-2">Description:</h3>
          <div className="bg-gray-50 p-3 rounded text-sm">
            {product.description || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductEditTest;
