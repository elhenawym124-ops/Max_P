const { requireAuth } = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

const prisma = new PrismaClient();

// إعداد multer لرفع الصور
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/payment-receipts';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يجب أن يكون الملف صورة'), false);
    }
  }
});

// جلب أرقام المحافظ النشطة
router.get('/wallet-numbers', requireAuth, async (req, res) => {
  try {
    const walletNumbers = await prisma.walletNumber.findMany({
      where: { 
        companyId: req.user?.companyId,
        isActive: true 
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: walletNumbers
    });
  } catch (error) {
    console.error('خطأ في جلب أرقام المحافظ:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب أرقام المحافظ'
    });
  }
});

// جلب تفاصيل فاتورة للدفع
router.get('/invoice/:invoiceId', requireAuth, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: {
          select: {
            name: true,
            email: true
          }
        },
        subscription: {
          select: {
            planType: true
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة'
      });
    }

    // التحقق من أن الفاتورة غير مدفوعة
    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'هذه الفاتورة مدفوعة بالفعل'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('خطأ في جلب الفاتورة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الفاتورة'
    });
  }
});

// رفع إيصال الدفع
router.post('/submit-receipt', requireAuth, upload.single('receipt'), async (req, res) => {
  try {
    const { invoiceId, walletNumberId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'يجب رفع صورة الإيصال'
      });
    }

    // التحقق من وجود الفاتورة
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة'
      });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'هذه الفاتورة مدفوعة بالفعل'
      });
    }

    // التحقق من وجود رقم المحفظة
    const walletNumber = await prisma.walletNumber.findUnique({
      where: { id: walletNumberId }
    });

    if (!walletNumber || !walletNumber.isActive) {
      return res.status(400).json({
        success: false,
        message: 'رقم المحفظة غير صحيح'
      });
    }

    // حفظ إيصال الدفع
    const paymentReceipt = await prisma.paymentReceipt.create({
      data: {
        invoiceId,
        walletNumberId,
        receiptImage: req.file.path,
        status: 'PENDING'
      }
    });

    res.json({
      success: true,
      message: 'تم إرسال الإيصال بنجاح، سيتم مراجعته قريباً',
      data: paymentReceipt
    });
  } catch (error) {
    console.error('خطأ في رفع الإيصال:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الإيصال'
    });
  }
});

// === APIs الإدارة ===

// جلب جميع أرقام المحافظ (للإدارة)
router.get('/admin/wallet-numbers', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const walletNumbers = await prisma.walletNumber.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: walletNumbers
    });
  } catch (error) {
    console.error('خطأ في جلب أرقام المحافظ:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب أرقام المحافظ'
    });
  }
});

// إضافة رقم محفظة جديد
router.post('/admin/wallet-numbers', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, number, icon, color } = req.body;

    const walletNumber = await prisma.walletNumber.create({
      data: {
        name,
        number,
        icon,
        color,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: 'تم إضافة رقم المحفظة بنجاح',
      data: walletNumber
    });
  } catch (error) {
    console.error('خطأ في إضافة رقم المحفظة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة رقم المحفظة'
    });
  }
});

// تحديث رقم محفظة
router.put('/admin/wallet-numbers/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, number, icon, color, isActive } = req.body;

    const walletNumber = await prisma.walletNumber.update({
      where: { id },
      data: {
        name,
        number,
        icon,
        color,
        isActive
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث رقم المحفظة بنجاح',
      data: walletNumber
    });
  } catch (error) {
    console.error('خطأ في تحديث رقم المحفظة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث رقم المحفظة'
    });
  }
});

// حذف رقم محفظة
router.delete('/admin/wallet-numbers/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.walletNumber.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'تم حذف رقم المحفظة بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف رقم المحفظة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف رقم المحفظة'
    });
  }
});

// جلب الإيصالات في الانتظار
router.get('/admin/pending-receipts', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const receipts = await prisma.paymentReceipt.findMany({
      where: { status: 'PENDING' },
      include: {
        invoice: {
          include: {
            company: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        walletNumber: true
      },
      orderBy: { submittedAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.paymentReceipt.count({
      where: { status: 'PENDING' }
    });

    res.json({
      success: true,
      data: receipts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('خطأ في جلب الإيصالات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإيصالات'
    });
  }
});

// مراجعة إيصال الدفع
router.post('/admin/review-receipt/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' or 'reject'

    const receipt = await prisma.paymentReceipt.findUnique({
      where: { id },
      include: { invoice: true }
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'الإيصال غير موجود'
      });
    }

    if (receipt.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'تم مراجعة هذا الإيصال بالفعل'
      });
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    // تحديث حالة الإيصال
    await prisma.paymentReceipt.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: 'admin', // يمكن تحسينه لاحقاً
        notes
      }
    });

    // إذا تم الموافقة، تحديث حالة الفاتورة
    if (action === 'approve') {
      await prisma.invoice.update({
        where: { id: receipt.invoiceId },
        data: {
          status: 'PAID',
          paidDate: new Date()
        }
      });

      // إنشاء سجل دفع
      await prisma.payment.create({
        data: {
          paymentNumber: `PAY-${Date.now()}`,
          invoiceId: receipt.invoiceId,
          companyId: receipt.invoice.companyId,
          amount: receipt.invoice.totalAmount,
          status: 'COMPLETED',
          method: 'WALLET_TRANSFER',
          paidAt: new Date()
        }
      });
    }

    res.json({
      success: true,
      message: action === 'approve' ? 'تم تأكيد الدفع بنجاح' : 'تم رفض الإيصال'
    });
  } catch (error) {
    console.error('خطأ في مراجعة الإيصال:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مراجعة الإيصال'
    });
  }
});

module.exports = router;