const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

const getAllCustomer = async(req , res)=>{
      try {
    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    //console.log('👥 Fetching customers for company:', companyId);

    const customers = await prisma.customer.findMany({
      where: { companyId }, // فلترة بـ companyId
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      success: true,
      data: customers,
      message: `تم جلب ${customers.length} عميل للشركة`
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب العملاء'
    });
  }
};

const deleteAllConversations = async (req, res) => {
  try {
    const deleted = await prisma.conversation.deleteMany({});

    res.json({
      success: true,
      deletedCount: deleted.count,
      message: `تم مسح ${deleted.count} محادثة`
    });
  } catch (error) {
    console.error('❌ Error deleting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مسح المحادثات'
    });
  }
};

// 🗑️ مسح كل العملاء بدون فلترة
const deleteAllCustomers = async (req, res) => {
  try {
    const deleted = await prisma.customer.deleteMany({});

    res.json({
      success: true,
      deletedCount: deleted.count,
      message: `تم مسح ${deleted.count} عميل`
    });
  } catch (error) {
    console.error('❌ Error deleting customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مسح العملاء'
    });
  }
};


module.exports = {getAllCustomer , deleteAllConversations , deleteAllCustomers}