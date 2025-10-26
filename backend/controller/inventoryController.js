const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

// Get all inventory items with filters
exports.getInventory = async (req, res) => {
  try {
    const { warehouseId, lowStock, outOfStock } = req.query;
    const companyId = req.user.companyId;

    const where = {
      warehouse: {
        companyId: companyId
      }
    };

    // Filter by warehouse
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    // Filter by low stock
    if (lowStock === 'true') {
      where.available = {
        lte: prisma.raw('reorder_point')
      };
    }

    // Filter by out of stock
    if (outOfStock === 'true') {
      where.available = 0;
    }

    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            images: true
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب المخزون',
      error: error.message
    });
  }
};

// Get inventory alerts (low stock / out of stock)
exports.getAlerts = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Get low stock items
    const lowStockItems = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.productId,
        i.warehouseId,
        i.quantity,
        i.available,
        i.minStock,
        i.reorderPoint,
        p.name as productName,
        p.sku,
        w.name as warehouseName
      FROM inventory i
      INNER JOIN products p ON i.productId = p.id
      INNER JOIN warehouses w ON i.warehouseId = w.id
      WHERE w.companyId = ${companyId}
      AND i.available <= i.reorderPoint
      AND i.available > 0
      ORDER BY i.available ASC
    `;

    // Get out of stock items
    const outOfStockItems = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.productId,
        i.warehouseId,
        i.quantity,
        i.available,
        p.name as productName,
        p.sku,
        w.name as warehouseName
      FROM inventory i
      INNER JOIN products p ON i.productId = p.id
      INNER JOIN warehouses w ON i.warehouseId = w.id
      WHERE w.companyId = ${companyId}
      AND i.available = 0
      ORDER BY i.updatedAt DESC
    `;

    res.json({
      success: true,
      data: {
        lowStock: lowStockItems,
        outOfStock: outOfStockItems,
        total: lowStockItems.length + outOfStockItems.length
      }
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب التنبيهات',
      error: error.message
    });
  }
};

// Update stock quantity
exports.updateStock = async (req, res) => {
  try {
    const { productId, warehouseId, quantity, type, reason, notes } = req.body;
    const companyId = req.user.companyId;

    // Verify warehouse belongs to company
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        companyId: companyId
      }
    });

    if (!warehouse) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث هذا المخزن'
      });
    }

    // Get or create inventory record
    let inventory = await prisma.inventory.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId
        }
      }
    });

    if (!inventory) {
      inventory = await prisma.inventory.create({
        data: {
          productId,
          warehouseId,
          quantity: 0,
          available: 0,
          reserved: 0
        }
      });
    }

    // Calculate new quantity based on type
    let newQuantity = inventory.quantity;
    let newAvailable = inventory.available;

    if (type === 'IN' || type === 'PURCHASE' || type === 'RETURN' || type === 'ADJUSTMENT_IN') {
      newQuantity += quantity;
      newAvailable += quantity;
    } else if (type === 'OUT' || type === 'SALE' || type === 'DAMAGE' || type === 'ADJUSTMENT_OUT') {
      newQuantity -= quantity;
      newAvailable -= quantity;
    }

    // Update inventory
    const updatedInventory = await prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: Math.max(0, newQuantity),
        available: Math.max(0, newAvailable)
      },
      include: {
        product: true,
        warehouse: true
      }
    });

    // Create stock movement record
    await prisma.stockMovement.create({
      data: {
        productId,
        warehouseId,
        type,
        reason,
        quantity,
        notes,
        userId: req.user.id,
        userName: req.user.name
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث المخزون بنجاح',
      data: updatedInventory
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث المخزون',
      error: error.message
    });
  }
};

// Get inventory for specific product
exports.getProductInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const companyId = req.user.companyId;

    const inventory = await prisma.inventory.findMany({
      where: {
        productId,
        warehouse: {
          companyId
        }
      },
      include: {
        warehouse: true,
        product: true
      }
    });

    // Calculate totals
    const totals = inventory.reduce((acc, item) => ({
      quantity: acc.quantity + item.quantity,
      available: acc.available + item.available,
      reserved: acc.reserved + item.reserved
    }), { quantity: 0, available: 0, reserved: 0 });

    res.json({
      success: true,
      data: {
        inventory,
        totals
      }
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching product inventory:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب مخزون المنتج',
      error: error.message
    });
  }
};

// Get stock movements
exports.getStockMovements = async (req, res) => {
  try {
    const { productId, warehouseId, type, startDate, endDate } = req.query;
    const companyId = req.user.companyId;

    const where = {
      warehouse: {
        companyId
      }
    };

    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = type;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            sku: true
          }
        },
        warehouse: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    res.json({
      success: true,
      data: movements
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching movements:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب حركات المخزون',
      error: error.message
    });
  }
};
