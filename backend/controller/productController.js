// Use shared database service instead of creating new PrismaClient
const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

// Create alias for executeWithRetry to match usage
const withRetry = executeWithRetry;

const getAllProducts = async (req, res) => {
    try {
        // التحقق من المصادقة والشركة
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        //console.log('📦 Fetching products for company:', companyId);

        const products = await prisma.product.findMany({
            where: { companyId }, // فلترة بـ companyId
            include: {
                variants: {
                    where: { isActive: true },
                    orderBy: [
                        { type: 'asc' },
                        { sortOrder: 'asc' }
                    ]
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: products,
            companyId: companyId,
            message: `تم جلب ${products.length} منتج للشركة`
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المنتجات'
        });
    }
};

const getCategory = async (req, res) => {
    try {
        //console.log('🔍 [server] GET /api/v1/products/categories');
        //console.log('🔍 [server] Request user:', req.user);
        //console.log('🔍 [server] Request headers:', req.headers);

        // 🔐 التحقق من المصادقة والشركة
        if (!req.user) {
            //console.log('❌ [server] No user found in request');
            return res.status(401).json({
                success: false,
                message: 'المصادقة مطلوبة للوصول لهذا المورد',
                code: 'AUTHENTICATION_REQUIRED'
            });
        }

        const companyId = req.user?.companyId;
        if (!companyId) {
            //console.log('❌ [server] No companyId found for user:', req.user);
            return res.status(403).json({
                success: false,
                message: 'معرف الشركة مطلوب للوصول لهذا المورد',
                code: 'COMPANY_ID_REQUIRED'
            });
        }

        //console.log('🏢 [server] Loading categories for company:', companyId);

        const categories = await withRetry(() =>
            prisma.category.findMany({
                where: { companyId }, // 🔐 فلترة بـ companyId من المستخدم المصادق عليه
                orderBy: { name: 'asc' }
            })
        );

        //console.log(`✅ [server] Found ${categories.length} categories for company ${companyId}`);
        res.json({
            success: true,
            data: categories,
            companyId: companyId
        });
    } catch (error) {
        console.error('❌ [server] Error getting categories:', error);
        console.error('❌ [server] Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

const createNewCategory = async(req , res)=>{
      try {
    //console.log('🔍 [server] POST /api/v1/products/categories');
    //console.log('📤 [server] Request body:', req.body);

    // 🔐 التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const { name, description, parentId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // Check if category already exists in the same company
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        companyId // 🔐 فحص في نفس الشركة فقط
      }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists in your company'
      });
    }

    //console.log('📦 Creating category for company:', companyId);

    // Create new category
    const newCategory = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        parentId: parentId || null,
        companyId // 🔐 استخدام companyId من المستخدم المصادق عليه
      }
    });

    //console.log(`✅ [server] Created category: ${newCategory.name} for company ${companyId}`);
    res.status(201).json({
      success: true,
      data: newCategory,
      companyId: companyId
    });
  } catch (error) {
    console.error('❌ [server] Error creating category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const updateCategory = async(req , res)=>{
      try {
    //console.log(`🔍 [server] PUT /api/v1/products/categories/${req.params.id}`);
    //console.log('📤 [server] Request body:', req.body);

    // 🔐 التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const { id } = req.params;
    const { name, description, parentId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // Check if category exists and belongs to the company
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        companyId // 🔐 التأكد أن الفئة تنتمي لنفس الشركة
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if name is already taken by another category
    const duplicateCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        id: { not: id }
      }
    });

    if (duplicateCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists'
      });
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        parentId: parentId || null
      }
    });

    //console.log(`✅ [server] Updated category: ${updatedCategory.name}`);
    res.json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    console.error('❌ [server] Error updating category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const deleteCategory = async(req , res)=>{
      try {
    //console.log(`🔍 [server] DELETE /api/v1/products/categories/${req.params.id}`);

    // 🔐 التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const { id } = req.params;

    // Check if category exists and belongs to the company
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        companyId // 🔐 التأكد أن الفئة تنتمي لنفس الشركة
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found or you do not have permission to delete it'
      });
    }

    // Check if category has products
    const productsCount = await prisma.product.count({
      where: { categoryId: id }
    });

    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. It has ${productsCount} products assigned to it.`
      });
    }

    // Check if category has subcategories
    const subcategoriesCount = await prisma.category.count({
      where: { parentId: id }
    });

    if (subcategoriesCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. It has ${subcategoriesCount} subcategories.`
      });
    }

    // Delete category
    await prisma.category.delete({
      where: { id }
    });

    //console.log(`✅ [server] Deleted category: ${existingCategory.name}`);
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('❌ [server] Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const getSingleProduct = async(req , res)=>{
      try {
    //console.log(`🔍 [server] GET /api/v1/products/${req.params.id}`);

    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: id },
      include: {
        variants: {
          orderBy: { sortOrder: 'asc' }
        },
        category: true
      }
    });

    //console.log(`📊 [server] Product query result:`, {
    //   found: !!product,
    //   name: product?.name,
    //   variantsCount: product?.variants?.length || 0,
    //   categoryName: product?.category?.name
    // });

    if (!product) {
      //console.log(`❌ [server] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    //console.log(`✅ [server] Product found: ${product.name}`);
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(`❌ [server] Error getting product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const updateSingleProduct = async(req , res)=>{
      try {
    //console.log(`🔄 [server] PATCH /api/v1/products/${req.params.id}`, req.body);

    const { id } = req.params;
    const updateData = { ...req.body };

    // Handle images array - convert to JSON string if it's an array
    if (updateData.images && Array.isArray(updateData.images)) {
      updateData.images = JSON.stringify(updateData.images);
      //console.log(`📸 [server] Converted images array to JSON string`);
    }

    // Handle tags array - convert to JSON string if it's an array
    if (updateData.tags && Array.isArray(updateData.tags)) {
      updateData.tags = JSON.stringify(updateData.tags);
      //console.log(`🏷️ [server] Converted tags array to JSON string`);
    }

    // Handle dimensions object - convert to JSON string if it's an object
    if (updateData.dimensions && typeof updateData.dimensions === 'object') {
      updateData.dimensions = JSON.stringify(updateData.dimensions);
      //console.log(`📏 [server] Converted dimensions object to JSON string`);
    }

    // Ensure numeric fields are properly typed
    if (updateData.price !== undefined) {
      updateData.price = parseFloat(updateData.price);
    }
    if (updateData.stock !== undefined) {
      updateData.stock = parseInt(updateData.stock);
    }
    if (updateData.comparePrice !== undefined) {
      updateData.comparePrice = parseFloat(updateData.comparePrice);
    }
    if (updateData.cost !== undefined) {
      updateData.cost = parseFloat(updateData.cost);
    }

    // Handle trackInventory field
    if (updateData.trackInventory !== undefined) {
      updateData.trackInventory = Boolean(updateData.trackInventory);
      //console.log(`📦 [server] Track inventory: ${updateData.trackInventory}`);
    }

    // Handle category field - convert to categoryId for Prisma
    if (updateData.category !== undefined) {
      if (updateData.category && updateData.category.trim() !== '') {
        updateData.categoryId = updateData.category;
        //console.log(`🏷️ [server] Converted category to categoryId: ${updateData.categoryId}`);
      } else {
        // If category is empty string or null, set categoryId to null
        updateData.categoryId = null;
        //console.log(`🏷️ [server] Category is empty, setting categoryId to null`);
      }
      delete updateData.category;
    }

    // Validate categoryId if provided
    if (updateData.categoryId) {
      try {
        const categoryExists = await prisma.category.findUnique({
          where: { id: updateData.categoryId }
        });

        if (!categoryExists) {
          //console.log(`⚠️ [server] Category ${updateData.categoryId} not found, removing from update`);
          delete updateData.categoryId;
        }
      } catch (error) {
        //console.log(`⚠️ [server] Error checking category, removing from update:`, error.message);
        delete updateData.categoryId;
      }
    }

    // Validate companyId if provided
    if (updateData.companyId) {
      try {
        const companyExists = await prisma.company.findUnique({
          where: { id: updateData.companyId }
        });

        if (!companyExists) {
          //console.log(`⚠️ [server] Company ${updateData.companyId} not found, removing from update`);
          delete updateData.companyId;
        }
      } catch (error) {
        //console.log(`⚠️ [server] Error checking company, removing from update:`, error.message);
        delete updateData.companyId;
      }
    }

    //console.log(`🔧 [server] Final update data:`, updateData);

    const product = await prisma.product.update({
      where: { id: id },
      data: updateData
    });

    //console.log(`✅ [server] Product updated: ${product.name}`);
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(`❌ [server] Error updating product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
}

const deleteSingleProduct = async(req , res)=>{
      try {
    //console.log(`🗑️ [server] DELETE /api/v1/products/${req.params.id}`);

    const { id } = req.params;

    await prisma.product.delete({
      where: { id: id }
    });

    //console.log(`✅ [server] Product deleted: ${id}`);
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error(`❌ [server] Error deleting product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const createProduct = async(req , res)=>{
      try {
    //console.log('🔍 [server] POST /api/v1/products');
    //console.log('📤 [server] Request body:', req.body);

    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { name, description, price, category, stock, sku, images, tags } = req.body;

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        error: 'Name and price are required'
      });
    }

    // Generate unique SKU only if provided
    let productSku = sku || null;
    if (productSku) {
      // Ensure SKU is unique within the company
      let skuExists = await prisma.product.findFirst({
        where: {
          sku: productSku,
          companyId // فحص SKU ضمن الشركة فقط
        }
      });
      if (skuExists) {
        return res.status(400).json({
          success: false,
          error: 'SKU already exists in your company. Please use a different SKU.'
        });
      }
    }

    //console.log('📦 Creating product for company:', companyId);

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        price: parseFloat(price),
        sku: productSku,
        stock: parseInt(stock) || 0,
        trackInventory: req.body.trackInventory !== undefined ? req.body.trackInventory : true,
        companyId, // استخدام companyId من المستخدم المصادق عليه
        images: images ? JSON.stringify(images) : null,
        tags: tags ? JSON.stringify(tags) : null
      }
    });

    //console.log('✅ [server] Product created successfully:', product.name);
    res.json({
      success: true,
      data: product,
      companyId: companyId
    });
  } catch (error) {
    console.error('❌ [server] Error creating product:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const deleteImageFromOneProduct = async(req , res)=>{
      try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    //console.log(`🗑️ [IMAGE-DELETE] Removing image from product ${id}:`, imageUrl);

    if (!imageUrl) {
      //console.log('❌ [IMAGE-DELETE] Error: Image URL is required');
      return res.status(400).json({
        success: false,
        error: 'Image URL is required',
        message: 'رابط الصورة مطلوب'
      });
    }

    // Get current product
    const product = await prisma.product.findUnique({
      where: { id: id }
    });

    if (!product) {
      //console.log(`❌ [IMAGE-DELETE] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: 'المنتج غير موجود'
      });
    }

    // Parse current images
    let currentImages = [];
    try {
      currentImages = JSON.parse(product.images || '[]');
    } catch (e) {
      //console.log('⚠️ [IMAGE-DELETE] Error parsing images, treating as empty array');
      currentImages = [];
    }

    // Remove image URL
    const initialCount = currentImages.length;
    currentImages = currentImages.filter(img => img !== imageUrl);
    const finalCount = currentImages.length;

    if (initialCount === finalCount) {
      //console.log(`ℹ️ [IMAGE-DELETE] Image URL not found in product images`);
      return res.status(404).json({
        success: false,
        error: 'Image not found',
        message: 'الصورة غير موجودة'
      });
    }

    //console.log(`➖ [IMAGE-DELETE] Removed image. Images count: ${initialCount} → ${finalCount}`);

    // Update product in database
    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: {
        images: JSON.stringify(currentImages)
      }
    });

    //console.log(`✅ [IMAGE-DELETE] Successfully removed image from product ${id}`);
    //console.log(`📊 [IMAGE-DELETE] Final images array:`, currentImages);

    res.json({
      success: true,
      message: 'تم حذف الصورة بنجاح',
      data: {
        removedImageUrl: imageUrl,
        productId: id,
        remainingImages: currentImages.length,
        allImages: currentImages
      }
    });

  } catch (error) {
    console.error('❌ [IMAGE-DELETE] Error removing image:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'خطأ في الخادم'
    });
  }
}

const addImageToProduct = async(req , res)=>{
      try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    //console.log(`➕ [IMAGE-ADD] Adding image to product ${id}:`, imageUrl);

    if (!imageUrl) {
      //console.log('❌ [IMAGE-ADD] Error: Image URL is required');
      return res.status(400).json({
        success: false,
        error: 'Image URL is required',
        message: 'رابط الصورة مطلوب'
      });
    }

    // Validate image URL
    try {
      new URL(imageUrl);
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      //console.log('❌ [IMAGE-ADD] Invalid image URL:', imageUrl);
      return res.status(400).json({
        success: false,
        error: 'Invalid image URL',
        message: 'رابط الصورة غير صالح'
      });
    }

    // Get current product
    const product = await prisma.product.findUnique({
      where: { id: id }
    });

    if (!product) {
      //console.log(`❌ [IMAGE-ADD] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: 'المنتج غير موجود'
      });
    }

    // Parse current images
    let currentImages = [];
    try {
      currentImages = JSON.parse(product.images || '[]');
    } catch (e) {
      //console.log('⚠️ [IMAGE-ADD] Error parsing images, treating as empty array');
      currentImages = [];
    }

    // Check if image already exists
    if (currentImages.includes(imageUrl)) {
      //console.log(`ℹ️ [IMAGE-ADD] Image URL already exists in product images`);
      return res.status(409).json({
        success: false,
        error: 'Image already exists',
        message: 'الصورة موجودة بالفعل'
      });
    }

    // Add new image URL
    currentImages.push(imageUrl);
    //console.log(`➕ [IMAGE-ADD] Added image. Images count: ${currentImages.length - 1} → ${currentImages.length}`);

    // Update product in database
    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: {
        images: JSON.stringify(currentImages)
      }
    });

    //console.log(`✅ [IMAGE-ADD] Successfully added image to product ${id}`);
    //console.log(`📊 [IMAGE-ADD] Final images array:`, currentImages);

    res.json({
      success: true,
      message: 'تم إضافة الصورة بنجاح',
      data: {
        addedImageUrl: imageUrl,
        productId: id,
        totalImages: currentImages.length,
        allImages: currentImages
      }
    });

  } catch (error) {
    console.error('❌ [IMAGE-ADD] Error adding image:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'خطأ في الخادم'
    });
  }
}

// Get product variants
const getProductVariants = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة
    const product = await prisma.product.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // جلب الـ variants
    const variants = await prisma.productVariant.findMany({
      where: {
        productId: id
      },
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: variants,
      message: `تم جلب ${variants.length} variant`
    });

  } catch (error) {
    console.error('Error fetching product variants:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب variants المنتج'
    });
  }
};

module.exports = { 
  getAllProducts, 
  getCategory, 
  createNewCategory, 
  updateCategory, 
  deleteCategory, 
  getSingleProduct, 
  updateSingleProduct, 
  deleteSingleProduct, 
  createProduct, 
  deleteImageFromOneProduct, 
  addImageToProduct,
  getProductVariants
}