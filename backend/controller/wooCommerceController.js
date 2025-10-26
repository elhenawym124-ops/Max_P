const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();
const axios = require('axios');

/**
 * جلب المنتجات من WooCommerce API
 * POST /api/v1/woocommerce/fetch-products
 */
const fetchProductsFromWooCommerce = async (req, res) => {
  try {
    console.log('🔍 [WOOCOMMERCE] Fetching products from WooCommerce...');
    
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { storeUrl, consumerKey, consumerSecret } = req.body;

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return res.status(400).json({
        success: false,
        message: 'رابط المتجر ومفاتيح API مطلوبة'
      });
    }

    // تنظيف الرابط
    let cleanUrl = storeUrl.trim();
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    // إزالة الـ trailing slash
    cleanUrl = cleanUrl.replace(/\/$/, '');

    console.log(`🔗 [WOOCOMMERCE] Store URL: ${cleanUrl}`);

    try {
      // WooCommerce API endpoint
      const apiUrl = `${cleanUrl}/wp-json/wc/v3/products`;
      
      // WooCommerce يستخدم Basic Auth
      const auth = {
        username: consumerKey.trim(),
        password: consumerSecret.trim()
      };

      console.log(`📡 [WOOCOMMERCE] Fetching from: ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        auth,
        params: {
          per_page: 100, // جلب 100 منتج في المرة الواحدة
          status: 'publish' // فقط المنتجات المنشورة
        },
        timeout: 30000 // 30 seconds timeout
      });

      const products = response.data;

      if (!Array.isArray(products)) {
        return res.status(400).json({
          success: false,
          message: 'تنسيق البيانات غير صحيح من WooCommerce'
        });
      }

      console.log(`✅ [WOOCOMMERCE] Found ${products.length} products`);

      // تحويل المنتجات لصيغة موحدة
      const formattedProducts = products.map(product => {
        // استخراج الصور
        const images = product.images?.map(img => img.src) || [];
        
        // استخراج أول فئة
        const firstCategory = product.categories?.[0]?.name || null;
        
        // استخراج الوصف (إزالة HTML tags)
        const description = product.description ? 
          product.description.replace(/<[^>]*>/g, '').trim() : 
          product.short_description ? 
          product.short_description.replace(/<[^>]*>/g, '').trim() : 
          '';

        return {
          name: product.name,
          description: description,
          price: parseFloat(product.price || product.regular_price || 0),
          comparePrice: product.regular_price && product.sale_price ? 
            parseFloat(product.regular_price) : null,
          cost: null,
          sku: product.sku || null,
          barcode: null,
          stock: product.stock_quantity || 0,
          trackInventory: product.manage_stock === true,
          images: images,
          category: firstCategory,
          tags: product.tags?.map(tag => tag.name) || [],
          weight: product.weight ? parseFloat(product.weight) : null,
          dimensions: product.dimensions?.length || product.dimensions?.width || product.dimensions?.height ? 
            product.dimensions : null,
          wooCommerceId: product.id?.toString() || null,
          wooCommerceUrl: product.permalink || null,
          isActive: product.status === 'publish'
        };
      });

      res.json({
        success: true,
        message: `تم جلب ${formattedProducts.length} منتج من WooCommerce`,
        data: {
          products: formattedProducts,
          count: formattedProducts.length,
          storeUrl: cleanUrl
        }
      });

    } catch (apiError) {
      console.error('❌ [WOOCOMMERCE] API Error:', apiError.message);
      
      // رسالة خطأ مفصلة
      let errorMessage = 'فشل الاتصال بـ WooCommerce';
      if (apiError.response?.status === 401) {
        errorMessage = 'مفاتيح API غير صحيحة';
      } else if (apiError.response?.status === 404) {
        errorMessage = 'رابط المتجر غير صحيح أو WooCommerce غير مفعل';
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        error: apiError.response?.data?.message || apiError.message,
        hint: 'تأكد من صحة رابط المتجر ومفاتيح API'
      });
    }

  } catch (error) {
    console.error('❌ [WOOCOMMERCE] Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المنتجات',
      error: error.message
    });
  }
};

/**
 * استيراد المنتجات المحددة من WooCommerce
 * POST /api/v1/woocommerce/import-selected
 */
const importSelectedProducts = async (req, res) => {
  try {
    console.log('📦 [WOOCOMMERCE] Importing selected products...');
    
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'قائمة المنتجات مطلوبة'
      });
    }

    console.log(`📦 [WOOCOMMERCE] Importing ${products.length} products...`);

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const productData of products) {
      try {
        const { name, price, wooCommerceId } = productData;

        if (!name || price === undefined || price === null) {
          results.failed.push({
            product: productData,
            reason: 'اسم المنتج والسعر مطلوبان'
          });
          continue;
        }

        // التحقق من وجود المنتج مسبقاً
        if (wooCommerceId) {
          const existingProduct = await prisma.product.findFirst({
            where: {
              wooCommerceId: wooCommerceId.toString(),
              companyId
            }
          });

          if (existingProduct) {
            results.skipped.push({
              product: productData,
              reason: 'المنتج موجود بالفعل',
              existingProduct
            });
            continue;
          }
        }

        // معالجة الفئة
        let categoryId = null;
        if (productData.category && productData.category.trim() !== '') {
          let categoryRecord = await prisma.category.findFirst({
            where: {
              name: productData.category.trim(),
              companyId
            }
          });

          if (!categoryRecord) {
            categoryRecord = await prisma.category.create({
              data: {
                name: productData.category.trim(),
                companyId
              }
            });
            console.log(`✅ [WOOCOMMERCE] Created category: ${productData.category}`);
          }

          categoryId = categoryRecord.id;
        }

        // معالجة الصور
        let processedImages = [];
        if (productData.images && Array.isArray(productData.images)) {
          processedImages = productData.images.filter(img => {
            if (!img) return false;
            try {
              new URL(img);
              return true;
            } catch {
              return false;
            }
          });
        }

        // إنشاء المنتج
        const product = await prisma.product.create({
          data: {
            name: productData.name.trim(),
            description: productData.description || '',
            price: parseFloat(productData.price),
            comparePrice: productData.comparePrice ? parseFloat(productData.comparePrice) : null,
            cost: productData.cost ? parseFloat(productData.cost) : null,
            sku: productData.sku || null,
            barcode: productData.barcode || null,
            stock: productData.stock !== undefined ? parseInt(productData.stock) : 0,
            trackInventory: productData.trackInventory !== undefined ? Boolean(productData.trackInventory) : true,
            companyId,
            categoryId,
            images: processedImages.length > 0 ? JSON.stringify(processedImages) : null,
            tags: productData.tags && Array.isArray(productData.tags) ? JSON.stringify(productData.tags) : null,
            weight: productData.weight ? parseFloat(productData.weight) : null,
            dimensions: productData.dimensions ? JSON.stringify(productData.dimensions) : null,
            wooCommerceId: productData.wooCommerceId?.toString() || null,
            wooCommerceUrl: productData.wooCommerceUrl || null,
            source: 'woocommerce'
          }
        });

        results.success.push(product);

      } catch (error) {
        console.error(`❌ [WOOCOMMERCE] Error importing product ${productData.name}:`, error);
        results.failed.push({
          product: productData,
          reason: error.message
        });
      }
    }

    console.log(`✅ [WOOCOMMERCE] Import completed:`);
    console.log(`   - Success: ${results.success.length}`);
    console.log(`   - Failed: ${results.failed.length}`);
    console.log(`   - Skipped: ${results.skipped.length}`);

    res.status(200).json({
      success: true,
      message: 'تم استيراد المنتجات',
      data: {
        imported: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        details: results
      }
    });

  } catch (error) {
    console.error('❌ [WOOCOMMERCE] Error importing products:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في استيراد المنتجات',
      error: error.message
    });
  }
};

module.exports = {
  fetchProductsFromWooCommerce,
  importSelectedProducts
};
