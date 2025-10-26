const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { authenticateToken } = require('../utils/verifyToken');

const prisma = getSharedPrismaClient();

/**
 * Get recent notifications (System notifications)
 */
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const companyId = req.user?.companyId;
    const limit = parseInt(req.query.limit) || 20; // 🚀 تقليل العدد من 50 إلى 20
    const type = req.query.type; // فلترة حسب النوع (اختياري)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    //console.log('📋 [NOTIFICATIONS-API] Fetching notifications for user:', userId, 'company:', companyId);

    // بناء الـ where clause
    const whereClause = {
      companyId: companyId,
      OR: [
        { userId: null } // إشعارات عامة للشركة
      ]
    };

    // إضافة userId فقط لو موجود
    if (userId) {
      whereClause.OR.push({ userId: userId });
    }

    // فلترة حسب النوع إذا تم تحديده
    if (type) {
      whereClause.type = type;
    }

    // 🚀 جلب الإشعارات والعدد في query واحد بدل اتنين
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          data: true,
          isRead: true,
          createdAt: true,
          userId: true,
          // 🚀 بدل include، نستخدم select للـ user (أسرع)
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.notification.count({
        where: {
          ...whereClause,
          isRead: false
        }
      })
    ]);

    // تحويل data من JSON string إلى object
    const formattedNotifications = notifications.map(notif => ({
      ...notif,
      data: notif.data ? JSON.parse(notif.data) : null
    }));

    res.json({
      success: true,
      notifications: formattedNotifications,
      unreadCount: unreadCount
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message
    });
  }
});

/**
 * Mark notification as read
 */
router.post('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId, companyId } = req.user;

    //console.log(`✅ [NOTIFICATIONS-API] Mark as read request for notification: ${notificationId}`);

    const updatedNotification = // SECURITY WARNING: Ensure companyId filter is included
      await prisma.notification.updateMany({
      where: {
        id: notificationId,
        companyId: companyId,
        OR: [
          { userId: userId },
          { userId: null }
        ]
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    if (updatedNotification.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    //console.log(`✅ [NOTIFICATIONS-API] Notification marked as read: ${notificationId}`);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS-API] Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

/**
 * Delete notification
 */
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId, companyId } = req.user;

    //console.log(`🗑️ [NOTIFICATIONS-API] Delete request for notification: ${notificationId}`);

    const deletedNotification = // SECURITY WARNING: Ensure companyId filter is included
      await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        companyId: companyId,
        OR: [
          { userId: userId },
          { userId: null }
        ]
      }
    });

    if (deletedNotification.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    //console.log(`🗑️ [NOTIFICATIONS-API] Notification deleted: ${notificationId}`);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS-API] Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

/**
 * Mark all notifications as read
 */
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const { userId, companyId } = req.user;

    //console.log(`✅ [NOTIFICATIONS-API] Mark all as read for user: ${userId}`);

    // SECURITY WARNING: Ensure companyId filter is included
      await prisma.notification.updateMany({
      where: {
        companyId: companyId,
        OR: [
          { userId: userId },
          { userId: null }
        ],
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS-API] Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

module.exports = router;
