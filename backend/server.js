const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const socketService = require('./services/socketService');
const axios = require('axios');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

// 🚀 PERFORMANCE OPTIMIZATION PATCH
const PERFORMANCE_CONFIG = require('./config/performance');
//console.log('⚡ [PERFORMANCE] Loading server with optimized settings...');

// تأجيل تحميل الخدمات الثقيلة إذا كان في وضع التحميل السريع
const shouldLazyLoad = PERFORMANCE_CONFIG.FAST_STARTUP_MODE;
if (shouldLazyLoad) {
  //console.log('🚀 [PERFORMANCE] Fast startup mode enabled - deferring heavy services');
}

// استيراد نظام البيئة الذكي
const envConfig = require('./config/environment');

// AI Agent Integration - التحميل المؤجل للخدمات الثقيلة
let aiAgentService, ragService, memoryService, multimodalService;
if (!shouldLazyLoad) {
  aiAgentService = require('./services/aiAgentService');
  ragService = require('./services/ragService');
  memoryService = require('./services/memoryService');
  multimodalService = require('./services/multimodalService');
  //console.log('✅ [PERFORMANCE] AI services loaded immediately');
} else {
  //console.log('⏳ [PERFORMANCE] AI services will be loaded after server startup');
}
//Import Routes
const MessageHealthChecker = require('./utils/messageHealthChecker');
const scheduledMaintenance = require('./services/scheduledPatternMaintenanceService');

const proxyRoutes = require('./routes/proxyRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const securityRoutes = require('./routes/securityRoutes');
const healthRoute = require('./routes/healthRoute');
const debugRoutes = require('./routes/debugRoutes');
const testRagRoutes = require('./routes/testRagRoutes');
const queueRoutes = require('./routes/queueRoutes');
const authRoutes = require('./routes/authRoutes');
const demoRoutes = require('./routes/demoRoutes');
const productRoutes = require('./routes/productRoutes');
const easyOrdersRoutes = require('./routes/easyOrdersRoutes');
const wooCommerceRoutes = require('./routes/wooCommerceRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const customerRoutes = require('./routes/customerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const opportunitiesRoutes = require('./routes/opportunitiesRoutes');
const taskRoutes = require('./routes/taskRoutes');
const projectRoutes = require('./routes/projectRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const facebookIntegrationRoutes = require('./routes/facebookIntegrationRoutes');
const messageFixRoutes = require('./routes/messageFixRoutes');
const aiRoutes = require('./routes/aiRoutes');
const companyRoutes = require('./routes/companyRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const notificationRoutes = require('./routes/notifications-simple');
const aiNotificationsRoutes = require('./routes/aiNotificationsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const companyDashboardRoutes = require('./routes/companyDashboardRoutes');
const invitationRoutes = require('./routes/invitationRoutes');


const adminAnalyticsRoutes = require('./routes/adminAnalyticsRoutes');
const adminPlansRoutes = require('./routes/adminPlansRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const systemManagementRoutes = require('./routes/systemManagementRoutes');
const walletPaymentRoutes = require('./routes/walletPayment');
const adminCompanyRoutes = require('./routes/adminCompanyRoutes');
const smartDelayRoutes = require('./routes/smartDelayRoutes');
const orderRoutes2 = require('./routes/orders');
const enhancedOrderRoutes = require('./routes/enhancedOrders');
const facebookOAuthRoutes = require('./routes/facebookOAuthRoutes');
const broadcastRoutes = require('./routes/broadcastRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const commentRoutes = require('./routes/commentRoutes');
const branchRoutes = require('./routes/branchRoutes');
const shippingZoneRoutes = require('./routes/shippingZoneRoutes');
const promptLibraryRoutes = require('./routes/promptLibraryRoutes');



// Import Simple Monitoring System
const { simpleMonitor } = require('./services/simpleMonitor');
const monitoringRoutes = require('./routes/monitoringRoutes');
const databaseMonitorRoutes = require('./routes/databaseMonitorRoutes');

// Import Auto Pattern Detection Service - التحميل المؤجل
let autoPatternService;
if (!shouldLazyLoad) {
  autoPatternService = require('./services/autoPatternDetectionService');
  //console.log('✅ [PERFORMANCE] Pattern detection service loaded immediately');
} else {
  //console.log('⏳ [PERFORMANCE] Pattern detection service will be loaded later');
}

// Import Global Security Middleware
const { globalSecurity } = require('./middleware/globalSecurity');

// Import Security Enhancements
const {
  rateLimits,
  securityHeaders,
  sanitizeRequest,
  securityMonitoring,
  enhancedCORS
} = require('./middleware/securityEnhancements');

// Import Input Validation Middleware
const { sanitizeInput } = require('./middleware/inputValidation');

// Import Performance Optimization Middleware
const {
  performanceMonitor,
  cacheMiddleware,
  queryOptimizer,
  responseCompression
} = require('./middleware/performanceOptimization');

// Emergency security patch
const emergencySecurityPatch = require('./middleware/emergencySecurityPatch');

// Set UTF-8 encoding for console output
process.stdout.setEncoding('utf8');
process.stderr.setEncoding('utf8');

//console.log('🚀 Starting Clean Server (No AI)...');

// Import Safe Database Utilities
const { safeDb, DatabaseHelpers } = require('./utils/safeDatabase');

// Import Database Error Handler
const { databaseErrorMiddleware, databaseHealthCheck } = require('./middleware/databaseErrorHandler');

const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry, safeQuery } = require('./services/sharedDatabase');

const aiQualityRoutes = require('./routes/aiQualityRoutes');
const conversationAIRoutes = require('./routes/conversationAIRoutes');

// ⚠️ CRITICAL: Always use safeQuery() or getPrisma() inside async functions
// This ensures proper connection management and retry logic
function getPrisma() {
  return getSharedPrismaClient();
}

const prisma = getSharedPrismaClient();

// Helper function to generate unique IDs
function generateId() {
  return 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
}

// 🚀 دالة تحميل الخدمات الثقيلة بعد بدء السرفر
async function loadHeavyServices() {
  //console.log('📎 [PERFORMANCE] Starting to load heavy services...');
  
  try {
    // تحميل خدمات الذكاء الصناعي
    if (!aiAgentService) {
      //console.log('🤖 [PERFORMANCE] Loading AI Agent Service...');
      aiAgentService = require('./services/aiAgentService');
    }
    
    if (!ragService) {
      //console.log('🧠 [PERFORMANCE] Loading RAG Service...');
      ragService = require('./services/ragService');
    }
    
    if (!memoryService) {
      //console.log('💾 [PERFORMANCE] Loading Memory Service...');
      memoryService = require('./services/memoryService');
    }
    
    if (!multimodalService) {
      //console.log('📷 [PERFORMANCE] Loading Multimodal Service...');
      multimodalService = require('./services/multimodalService');
    }
    
    // تحميل خدمة كشف الأنماط
    if (!autoPatternService) {
      //console.log('🔍 [PERFORMANCE] Loading Auto Pattern Service...');
      autoPatternService = require('./services/autoPatternDetectionService');
      
      // بدء خدمة كشف الأنماط
      autoPatternService.start();
      //console.log(`✅ Auto Pattern Detection Service started successfully`);
      //console.log(`⏰ Detection interval: ${autoPatternService.getStatus().intervalMinutes} minutes`);
    }
    
    // بدء خدمة الصيانة المجدولة
    //console.log(`🕐 Starting Scheduled Pattern Maintenance Service...`);
    scheduledMaintenance.start();
    //console.log(`✅ Scheduled Pattern Maintenance Service started successfully`);
    //console.log(`📅 Weekly cleanup: Sundays at 2:00 AM`);
    //console.log(`📅 Daily maintenance: Every day at 3:00 AM`);
    //console.log(`📅 Monthly archiving: 1st of month at 1:00 AM`);
    
    // بدء خدمة جدولة البرودكاست
    console.log(`📡 Starting Broadcast Scheduler Service...`);
    const broadcastScheduler = require('./services/broadcastSchedulerService');
    broadcastScheduler.start();
    console.log(`✅ Broadcast Scheduler Service started successfully`);
    console.log(`📅 Checking for scheduled broadcasts every minute`);
    
    //console.log('✅ [PERFORMANCE] All heavy services loaded successfully!');
    
  } catch (error) {
    console.error('❌ [PERFORMANCE] Error loading heavy services:', error.message);
    //console.log('🔄 [PERFORMANCE] Server will continue running with basic functionality');
  }
}
// Initialize Express app
const app = express();
const server = http.createServer(app);

// CORS Configuration - استخدام النظام الذكي
app.use(cors({
  origin: envConfig.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id']
}));

app.use(express.json());

// لو بتستقبل form data (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));
// Initialize Socket.IO
socketService.initialize(server);

// Use shared database retry utility
const withRetry = executeWithRetry;

// Set charset for responses (skip for image proxy and uploads)
app.use((req, res, next) => {
  res.charset = 'utf-8';
  // Don't set Content-Type for image proxy routes and uploads
  if (!req.path.startsWith('/api/proxy-image') && !req.path.startsWith('/uploads')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  next();
});

// Apply Security Enhancements
//console.log('🛡️ Applying Security Enhancements...');
app.use(enhancedCORS);
app.use(securityHeaders);
app.use(sanitizeRequest);
app.use(securityMonitoring);
app.use(sanitizeInput); // Input sanitization

// Apply Performance Optimizations
//console.log('⚡ Applying Performance Optimizations...');
app.use(performanceMonitor);
app.use(responseCompression);
app.use(queryOptimizer);
// Cache middleware will be applied to specific routes

// Apply emergency security patch
app.use(emergencySecurityPatch);
//console.log('🚨 Emergency security patch applied');

// // Apply rate limiting (disabled for development)
// if (process.env.NODE_ENV === 'production') {
//   app.use('/api/v1/auth', rateLimits.auth);
//   app.use('/api/v1/admin', rateLimits.admin);
//   app.use('/api/v1', rateLimits.api);
//   //console.log('🛡️ Rate limiting enabled for production');
// } else {
//   //console.log('🔧 Rate limiting disabled for development');
// }


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/api/proxy-image", proxyRoutes);
// Facebook webhook route - must match the URL configured in Facebook Developer Console
app.use("/api/v1/webhook", webhookRoutes);
app.use('/api/v1/facebook-oauth', facebookOAuthRoutes);

// Add monitoring routes (after security middleware)
//console.log('🔧 [SERVER] Registering monitoring routes at /api/v1/monitor');
app.use('/api/v1/monitor', (req, res, next) => {
  //console.log('🔍 [SERVER] Monitor route hit:', req.method, req.path);
  next();
}, monitoringRoutes);
// Health endpoints - Public routes (no authentication required) - MUST be before globalSecurity
app.use('/health', healthRoute);
app.use('/api/health', healthRoute);
app.use('/api/v1/health', healthRoute);

// Apply Global Security Middleware to all routes AFTER public routes
//console.log('🛡️ Applying Global Security Middleware...');
app.use(globalSecurity);



// Add database monitoring routes
//console.log('🔧 [SERVER] Registering database monitoring routes at /api/v1/db-monitor');
app.use('/api/v1/db-monitor', databaseMonitorRoutes);

// Global database error handler (should be after all routes)
app.use(databaseErrorMiddleware);

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'Chat Bot Backend - Clean Version (No AI)',
    version: '1.0.0',
    features: ['Basic messaging', 'Manual responses only']
  });
});

app.use('/api/v1/ai-quality', aiQualityRoutes);
app.use('/api/v1', conversationAIRoutes);

app.use('/api/v1/security', securityRoutes);
// Enhanced health check endpoint with database status
// Debug and monitoring routes
app.use('/api/v1/debug', debugRoutes);

// إعداد UTF-8 للترميز الصحيح
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Basic logging middleware
app.use((req, res, next) => {
  //console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api/v1/queue-stats', queueRoutes);
app.use('/api/v1/test-rag', testRagRoutes);

app.use("/api/v1/auth/", authRoutes)
app.use("/api/v1/dev/", demoRoutes)
app.use("/api/v1/products/", productRoutes)
app.use("/api/v1/easy-orders/", easyOrdersRoutes)
app.use("/api/v1/woocommerce/", wooCommerceRoutes)
app.use("/api/v1/branches/", branchRoutes)
app.use("/api/v1/shipping-zones/", shippingZoneRoutes)
app.use("/api/v1/conversations/", conversationRoutes)
app.use("/api/v1/customers/", customerRoutes)
app.use("/api/v1/orders/", orderRoutes)
app.use("/api/v1/opportunities/", opportunitiesRoutes)
app.use("/api/v1/tasks/", taskRoutes)
app.use("/api/v1/projects/", projectRoutes)
app.use("/api/v1/reports/", reportsRoutes)
app.use("/api/v1/integrations/", facebookIntegrationRoutes)
app.use("/api/v1/messages/", messageFixRoutes)
app.use("/api/v1/comments/", commentRoutes)

// ==================== SERVER STARTUP ====================
const PORT = process.env.PORT || 3001;
let serverStarted = false;

async function startServer() {
  let dbInitialized = false;
  
  try {
    console.log('🔧 [SERVER] Attempting database initialization...');
    
    // Try to initialize database
    await initializeSharedDatabase();
    dbInitialized = true;
    console.log('✅ [SERVER] Database initialized successfully');
    
  } catch (error) {
    console.error('⚠️ [SERVER] Database initialization failed:', error.message.substring(0, 150));
    
    // Check if it's a cooldown/connection limit error
    const isCooldownError = 
      error.message.includes('cooldown') ||
      error.message.includes('max_connections_per_hour') || 
      error.message.includes('ERROR 42000 (1226)');
    
    if (isCooldownError) {
      console.log('🚨 [SERVER] DATABASE IN COOLDOWN MODE');
      console.log('💡 [SERVER] Server will start WITHOUT database access');
      console.log('⏳ [SERVER] Database will automatically reconnect after cooldown ends');
      
      // Schedule retry after cooldown (extract minutes from error if available)
      const cooldownMatch = error.message.match(/(\d+)\s*minutes?/);
      const cooldownMinutes = cooldownMatch ? parseInt(cooldownMatch[1]) : 60;
      
      setTimeout(async () => {
        console.log('🔄 [SERVER] Cooldown ended - attempting database reconnection...');
        try {
          await initializeSharedDatabase();
          console.log('✅ [SERVER] Database reconnected successfully!');
        } catch (retryError) {
          console.error('❌ [SERVER] Reconnection failed:', retryError.message.substring(0, 100));
        }
      }, cooldownMinutes * 60 * 1000);
      
    } else {
      // Non-recoverable error
      console.error('❌ [SERVER] Critical database error - shutting down');
      process.exit(1);
    }
  }
  
  // 🔥 ALWAYS start the server regardless of database status
  server.listen(PORT, async () => {
    serverStarted = true;
    console.log(`Mahmoud Ahmed`);
    
    if (dbInitialized) {
      console.log(`🎉 Server running on port ${PORT} with DATABASE`);
    } else {
      console.log(`⚠️ Server running on port ${PORT} in DEGRADED MODE (no database)`);
    }
    
    console.log(`📱 Frontend: ${envConfig.frontendUrl}`);
    console.log(`🔗 Backend: ${envConfig.backendUrl}`);
    console.log(`🌍 Environment: ${envConfig.environment.toUpperCase()}`);
    
    // 🚀 Load heavy services after server starts
    if (shouldLazyLoad) {
      setTimeout(() => {
        loadHeavyServices();
      }, PERFORMANCE_CONFIG.HEAVY_SERVICES_DELAY * 1000);
    }
  });
}

/**
 * Schedule periodic connection retry attempts
 */
function scheduleConnectionRetries() {
  //console.log('🔄 [SERVER] Scheduling database connection retries...');
  
  const retryInterval = setInterval(async () => {
    try {
      //console.log('🔄 [SERVER] Attempting to reconnect to database...');
      await initializeSharedDatabase();
      //console.log('✅ [SERVER] Database connection restored!');
      clearInterval(retryInterval);
    } catch (error) {
      if (error.message.includes('max_connections_per_hour')) {
        //console.log('⏳ [SERVER] Still in connection limit cooldown, will retry in 5 minutes...');
      } else {
        //console.log('⚠️ [SERVER] Database connection failed, will retry in 5 minutes:', error.message);
      }
    }
  }, 5 * 60 * 1000); // Retry every 5 minutes
  
  // Clear retry attempts after 2 hours to prevent infinite retries
  setTimeout(() => {
    clearInterval(retryInterval);
    //console.log('🕐 [SERVER] Stopped automatic database retry attempts after 2 hours');
  }, 2 * 60 * 60 * 1000);
}

// Start the server
startServer();
// تشغيل فحص صحة الرسائل كل ساعة
//console.log(`🔍 Starting message health monitoring...`);

setInterval(async () => {
  try {
    //console.log('🔍 [AUTO-HEALTH-CHECK] Running periodic message health check...');
    
    // الحصول على أول شركة في النظام للفحص التلقائي
    // في بيئة إنتاجية حقيقية، يجب تشغيل هذا لجميع الشركات
    const firstCompany = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.company.findFirst({
        where: { isActive: true }
      });
    }, 3);
    
    if (firstCompany) {
      //console.log(`🏢 [AUTO-HEALTH-CHECK] Running check for company: ${firstCompany.id}`);
      const checker = new MessageHealthChecker();
      // ✅ تمرير companyId لل_checker
      const results = await checker.checkAllMessages(firstCompany.id);

      if (results.fixed > 0) {
        //console.log(`🔧 [AUTO-HEALTH-CHECK] Fixed ${results.fixed} broken messages`);
      }

      if (results.broken > 0) {
        //console.log(`⚠️ [AUTO-HEALTH-CHECK] Found ${results.broken} broken messages`);
      }

      await checker.disconnect();
    } else {
      //console.log('⚠️ [AUTO-HEALTH-CHECK] No active companies found for health check');
    }
  } catch (error) {
    console.error('❌ [AUTO-HEALTH-CHECK] Error:', error.message);
  }
}, 60 * 60 * 1000); // كل ساعة


// Initialize System Manager
//console.log(`🔧 Initializing System Manager...`);

try {
  const systemManager = require('./services/systemManager');
  systemManager.initializeSystemSettings().then(() => {
    //console.log(`✅ System Manager initialized successfully`);
  }).catch((error) => {
    console.error(`❌ Failed to initialize System Manager:`, error.message);
  });
} catch (error) {
  console.error(`❌ Failed to initialize System Manager:`, error.message);
}


// Start Auto Pattern Detection Service - مؤجل لبعد بدء السرفر
// الخدمة هتتحمل في loadHeavyServices()

// Start Scheduled Pattern Maintenance Service - مؤجل لبعد بدء السرفر
// الخدمة هتتحمل في loadHeavyServices()

// ================================
// AI AGENT API ENDPOINTS
// ================================

// Test AI Agent directly (for testing purposes)
app.post('/test-ai-direct', async (req, res) => {
  try {
    //console.log('🧪 Test AI endpoint called');
    //console.log('📦 Request body:', req.body);

    const { conversationId, senderId, content, attachments = [], customerData } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    // إعداد بيانات الرسالة
    const messageData = {
      conversationId: conversationId || 'test-conversation',
      senderId: senderId || 'test-customer',
      content: content,
      attachments: attachments,
      customerData: customerData || {
        name: 'عميل تجريبي',
        phone: '01234567890',
        email: 'test@example.com',
        orderCount: 0
      }
    };

    //console.log('🤖 Processing with AI Agent...');
    //console.log('📤 Message data:', JSON.stringify(messageData, null, 2));

    // معالجة الرسالة بالذكاء الصناعي
    const aiResponse = await aiAgentService.processCustomerMessage(messageData);

    if (aiResponse) {
      //console.log('✅ AI response generated successfully');

      res.json({
        success: true,
        data: {
          content: aiResponse.content,
          intent: aiResponse.intent,
          sentiment: aiResponse.sentiment,
          confidence: aiResponse.confidence,
          shouldEscalate: aiResponse.shouldEscalate,
          images: aiResponse.images || [],
          processingTime: aiResponse.processingTime || 0,
          orderInfo: aiResponse.orderInfo || null,
          orderCreated: aiResponse.orderCreated || null
        },
        message: 'AI response generated successfully'
      });
    } else {
      //console.log('❌ No AI response generated');

      res.json({
        success: false,
        error: 'AI Agent did not generate a response',
        details: 'This could be due to AI being disabled, quota exceeded, or other configuration issues'
      });
    }

  } catch (error) {
    console.error('❌ Error in test AI endpoint:', error);

    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});
app.use("/api/v1/ai/", aiRoutes)


// Graceful shutdown
process.on('SIGINT', async () => {
  //console.log('🛑 Shutting down server...');
  try {
    const prisma = getPrisma();
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error disconnecting:', error.message);
  }
  process.exit(0);
});

app.use("/api/v1/companies/", companyRoutes)
app.use('/api/v1/settings/', settingsRoutes);

app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/ai-notifications', aiNotificationsRoutes);

// Get user roles
app.get('/api/v1/users/roles', (req, res) => {
  const roles = {
    COMPANY_ADMIN: {
      name: 'مدير الشركة',
      description: 'صلاحيات كاملة لإدارة الشركة والمستخدمين',
      permissions: [
        'إدارة المستخدمين',
        'إدارة الأدوار',
        'إدارة المنتجات',
        'إدارة العملاء',
        'إدارة الطلبات',
        'مشاهدة التقارير',
        'إدارة الإعدادات',
        'إدارة التكاملات'
      ]
    },
    MANAGER: {
      name: 'مدير',
      description: 'صلاحيات إدارية محدودة',
      permissions: [
        'إدارة المنتجات',
        'إدارة العملاء',
        'إدارة الطلبات',
        'مشاهدة التقارير'
      ]
    },
    AGENT: {
      name: 'موظف',
      description: 'صلاحيات أساسية للعمل اليومي',
      permissions: [
        'إدارة العملاء',
        'إدارة الطلبات',
        'مشاهدة المنتجات'
      ]
    }
  };

  res.json({
    success: true,
    message: 'تم جلب الأدوار بنجاح',
    data: roles
  });
});

// ==================== ROLES & PERMISSIONS MANAGEMENT ====================
// Get all available permissions
app.get('/api/v1/permissions', (req, res) => {
  const permissions = {
    'إدارة المستخدمين': {
      key: 'manage_users',
      category: 'إدارة',
      description: 'إضافة وتعديل وحذف المستخدمين'
    },
    'إدارة الأدوار': {
      key: 'manage_roles',
      category: 'إدارة',
      description: 'إنشاء وتعديل الأدوار والصلاحيات'
    },
    'إدارة المنتجات': {
      key: 'manage_products',
      category: 'المنتجات',
      description: 'إضافة وتعديل وحذف المنتجات'
    },
    'مشاهدة المنتجات': {
      key: 'view_products',
      category: 'المنتجات',
      description: 'عرض قائمة المنتجات فقط'
    },
    'إدارة العملاء': {
      key: 'manage_customers',
      category: 'العملاء',
      description: 'إضافة وتعديل وحذف العملاء'
    },
    'مشاهدة العملاء': {
      key: 'view_customers',
      category: 'العملاء',
      description: 'عرض قائمة العملاء فقط'
    },
    'إدارة الطلبات': {
      key: 'manage_orders',
      category: 'الطلبات',
      description: 'إنشاء وتعديل وحذف الطلبات'
    },
    'مشاهدة الطلبات': {
      key: 'view_orders',
      category: 'الطلبات',
      description: 'عرض الطلبات فقط'
    },
    'مشاهدة التقارير': {
      key: 'view_reports',
      category: 'التقارير',
      description: 'الوصول للتقارير والإحصائيات'
    },
    'إدارة التقارير': {
      key: 'manage_reports',
      category: 'التقارير',
      description: 'إنشاء وتخصيص التقارير'
    },
    'إدارة الإعدادات': {
      key: 'manage_settings',
      category: 'الإعدادات',
      description: 'تعديل إعدادات الشركة'
    },
    'إدارة التكاملات': {
      key: 'manage_integrations',
      category: 'التكاملات',
      description: 'إدارة التكاملات مع الأنظمة الخارجية'
    },
    'إدارة المحادثات': {
      key: 'manage_conversations',
      category: 'المحادثات',
      description: 'إدارة المحادثات والرسائل'
    },
    'مشاهدة المحادثات': {
      key: 'view_conversations',
      category: 'المحادثات',
      description: 'عرض المحادثات فقط'
    }
  };

  res.json({
    success: true,
    message: 'تم جلب الصلاحيات بنجاح',
    data: permissions
  });
});

// ==================== DASHBOARD SERVICE ROUTES ====================
app.use('/api/v1/dashboard', dashboardRoutes);

app.use("/api/v1/auth/", authRoutes)
app.use("/api/v1/dev/", demoRoutes)
app.use("/api/v1/products/", productRoutes)
app.use("/api/v1/branches/", branchRoutes)
app.use("/api/v1/shipping-zones/", shippingZoneRoutes)
app.use("/api/v1/conversations/", conversationRoutes)
app.use("/api/v1/customers/", customerRoutes)
app.use("/api/v1/orders/", orderRoutes)
app.use("/api/v1/opportunities/", opportunitiesRoutes)
app.use("/api/v1/tasks/", taskRoutes)
app.use("/api/v1/projects/", projectRoutes)
app.use("/api/v1/reports/", reportsRoutes)
app.use("/api/v1/integrations/", facebookIntegrationRoutes)
app.use("/api/v1/messages/", messageFixRoutes)
app.use("/api/v1/comments/", commentRoutes)

// ==================== COMPANY DASHBOARD ROUTES ====================
app.use('/api/v1/company', companyDashboardRoutes);
app.use('/api/v1/invitations', invitationRoutes);

// ==================== SUPER ADMIN ROUTES ====================

// Super Admin Analytics Routes
app.use('/api/v1/admin/analytics', adminAnalyticsRoutes);

// Super Admin Plans Routes
app.use('/api/v1/admin/plans', adminPlansRoutes);

// Super Admin Subscription Routes
app.use('/api/v1/admin/subscriptions', subscriptionRoutes);

// Super Admin Invoice Routes
app.use('/api/v1/admin/invoices', invoiceRoutes);

// Super Admin Payment Routes
app.use('/api/v1/admin/payments', paymentRoutes);

// Super Admin System Management Routes
app.use('/api/v1/admin', systemManagementRoutes);

// Super Admin Prompt Library Routes
app.use('/api/v1/prompt-library', promptLibraryRoutes);

// Wallet Payment Routes (دفع المحافظ للعملاء)
app.use('/api/v1/wallet-payment', walletPaymentRoutes);

// Initialize Billing Notification Service
const BillingNotificationService = require('./services/billingNotificationService');
const billingNotificationService = new BillingNotificationService();

// Initialize Subscription Renewal Service
const SubscriptionRenewalService = require('./services/subscriptionRenewalService');
const subscriptionRenewalService = new SubscriptionRenewalService();

// Start billing notifications after server is ready
setTimeout(() => {
  billingNotificationService.start();

  // Add renewal processing to daily checks
  const originalRunDailyChecks = billingNotificationService.runDailyChecks;
  billingNotificationService.runDailyChecks = async function() {
    await originalRunDailyChecks.call(this);
    await subscriptionRenewalService.processAutomaticRenewals();
  };
}, 5000); // Wait 5 seconds for server to fully initialize


//console.log('🔧 [ADMIN-ROUTES] Loading admin company routes...');
app.use('/api/v1/admin/companies', adminCompanyRoutes);
//console.log('✅ [ADMIN-ROUTES] Admin company routes loaded successfully');
const verifyToken = require("./utils/verifyToken")

app.get('/api/v1/admin/statistics', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, async (req, res) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      totalCustomers,
      totalConversations,
      totalMessages,
      companiesByPlan
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.customer.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.company.groupBy({
        by: ['plan'],
        _count: { plan: true }
      })
    ]);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      newCompaniesLast30Days,
      newUsersLast30Days,
      newCustomersLast30Days
    ] = await Promise.all([
      prisma.company.count({
        where: { createdAt: { gte: thirtyDaysAgo } }
      }),
      prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } }
      }),
      prisma.customer.count({
        where: { createdAt: { gte: thirtyDaysAgo } }
      })
    ]);

    res.json({
      success: true,
      message: 'تم جلب إحصائيات النظام بنجاح',
      data: {
        overview: {
          totalCompanies,
          activeCompanies,
          inactiveCompanies: totalCompanies - activeCompanies,
          totalUsers,
          totalCustomers,
          totalConversations,
          totalMessages
        },
        planDistribution: companiesByPlan.reduce((acc, item) => {
          acc[item.plan] = item._count.plan;
          return acc;
        }, {}),
        recentActivity: {
          newCompaniesLast30Days,
          newUsersLast30Days,
          newCustomersLast30Days
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإحصائيات',
      error: error.message
    });
  }
});

// ==================== SUPER ADMIN LOGIN ====================
// Super admin login endpoint
app.post('/api/v1/super-admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }

    // Find user
    const user = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.user.findUnique({
        where: { email }
      });
    }, 5);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    // Check if user is Super Admin
    if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'هذا الحساب ليس حساب مدير نظام'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'هذا الحساب غير مفعل'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar
        }
      }
    });

  } catch (error) {
    console.error('خطأ في تسجيل دخول السوبر أدمن:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
});

// ==================== QUICK USER CREATION ====================
// Create users quickly for testing
app.post('/api/v1/create-users', async (req, res) => {
  try {
    //console.log('🚀 إنشاء المستخدمين...');
    
    // 1. إنشاء شركة
    let company = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.company.findFirst();
    }, 3);
    
    if (!company) {
      company = await safeQuery(async () => {
        const prisma = getPrisma();
        return await prisma.company.create({
          data: {
            name: 'شركة الاختبار',
            email: 'test@company.com',
            phone: '+20123456789',
            plan: 'PRO',
            isActive: true
          }
        });
      }, 3);
      //console.log('✅ تم إنشاء الشركة:', company.name);
    }
    
    // 2. إنشاء مستخدم عادي
    const hashedPassword1 = await bcrypt.hash('admin123', 12);
    const user1 = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.user.upsert({
        where: { email: 'admin@test.com' },
        update: {},
        create: {
          email: 'admin@test.com',
          password: hashedPassword1,
          firstName: 'أحمد',
          lastName: 'المدير',
          role: 'COMPANY_ADMIN',
          isActive: true,
          isEmailVerified: true,
          companyId: company.id
        }
      });
    }, 3);
    
    // 3. إنشاء سوبر أدمن
    const hashedPassword2 = await bcrypt.hash('SuperAdmin123!', 12);
    const user2 = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.user.upsert({
        where: { email: 'superadmin@system.com' },
        update: {},
        create: {
          email: 'superadmin@system.com',
          password: hashedPassword2,
          firstName: 'مدير',
          lastName: 'النظام',
          role: 'SUPER_ADMIN',
          isActive: true,
          isEmailVerified: true,
          companyId: null
        }
      });
    }, 3);
    
    res.json({
      success: true,
      message: 'تم إنشاء المستخدمين بنجاح',
      data: {
        regularUser: {
          email: 'admin@test.com',
          password: 'admin123',
          role: 'COMPANY_ADMIN'
        },
        superAdmin: {
          email: 'superadmin@system.com',
          password: 'SuperAdmin123!',
          role: 'SUPER_ADMIN'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء المستخدمين:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء المستخدمين',
      error: error.message
    });
  }
});

// ==================== SUPER ADMIN CREATION ====================
// Create super admin endpoint
app.post('/api/v1/create-super-admin', async (req, res) => {
  try {
    //console.log('🚀 إنشاء السوبر أدمن...');

    // Check if super admin already exists
    const existingSuperAdmin = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
      });
    }, 3);

    if (existingSuperAdmin) {
      return res.json({
        success: true,
        message: 'السوبر أدمن موجود بالفعل في النظام',
        data: {
          email: existingSuperAdmin.email,
          firstName: existingSuperAdmin.firstName,
          lastName: existingSuperAdmin.lastName,
          role: existingSuperAdmin.role
        }
      });
    }

    // Super admin data
    const superAdminData = {
      email: 'superadmin@system.com',
      password: 'SuperAdmin123!',
      firstName: 'مدير',
      lastName: 'النظام',
      role: 'SUPER_ADMIN',
      isActive: true,
      isEmailVerified: true,
      companyId: null
    };

    // Hash password
    const hashedPassword = await bcrypt.hash(superAdminData.password, 12);

    // Create super admin
    const superAdmin = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.user.create({
        data: {
          email: superAdminData.email,
          password: hashedPassword,
          firstName: superAdminData.firstName,
          lastName: superAdminData.lastName,
          role: superAdminData.role,
          isActive: superAdminData.isActive,
          isEmailVerified: superAdminData.isEmailVerified,
          companyId: superAdminData.companyId
        }
      });
    }, 3);

    //console.log('✅ تم إنشاء السوبر أدمن بنجاح!');

    res.json({
      success: true,
      message: 'تم إنشاء السوبر أدمن بنجاح',
      data: {
        email: superAdmin.email,
        password: superAdminData.password,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        role: superAdmin.role
      }
    });

  } catch (error) {
    console.error('❌ خطأ في إنشاء السوبر أدمن:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء السوبر أدمن',
      error: error.message
    });
  }
});

// ==================== DEVELOPMENT HELPERS ====================
// Create test user endpoint (for development only)
app.post('/api/v1/dev/create-test-user', async (req, res) => {
  try {
    // Check if we're in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'هذا الـ endpoint متاح فقط في بيئة التطوير'
      });
    }

    // Get the first company
    const company = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.company.findFirst();
    }, 3);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'لا توجد شركات في النظام'
      });
    }

    // Check if test user already exists
    const existingUser = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.user.findFirst({
        where: { email: 'admin@test.com' }
      });
    }, 3);

    if (existingUser) {
      return res.json({
        success: true,
        message: 'المستخدم التجريبي موجود بالفعل',
        data: {
          email: 'admin@test.com',
          password: 'admin123',
          role: existingUser.role,
          companyId: existingUser.companyId
        }
      });
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const testUser = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.user.create({
        data: {
          firstName: 'أحمد',
          lastName: 'المدير',
          email: 'admin@test.com',
          password: hashedPassword,
          phone: '+201234567890',
          role: 'COMPANY_ADMIN',
          isActive: true,
          isEmailVerified: true,
          companyId: company.id
        }
      });
    }, 3);

    res.json({
      success: true,
      message: 'تم إنشاء المستخدم التجريبي بنجاح',
      data: {
        email: 'admin@test.com',
        password: 'admin123',
        role: testUser.role,
        companyId: testUser.companyId
      }
    });

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء المستخدم التجريبي',
      error: error.message
    });
  }
});


// ==================== SMART DELAY MONITORING ENDPOINTS ====================
app.use('/api/v1/smart-delay', smartDelayRoutes);
// ==================== END SMART DELAY ENDPOINTS ====================
// Enhanced product routes - commented out as not implemented
// app.use('/api/v1/products', enhancedProductRoutes);

app.use('/api/v1/orders-new', orderRoutes2);
app.use('/api/v1/orders-enhanced', enhancedOrderRoutes);

const successLearningRoutes = require('./routes/successLearning');
app.use('/api/v1/success-learning', successLearningRoutes);


const autoPatternRoutes = require('./routes/autoPatternRoutes');
app.use('/api/v1/auto-patterns', autoPatternRoutes);


const prioritySettingsRoutes = require('./routes/prioritySettingsRoutes');
app.use('/api/v1/priority-settings', prioritySettingsRoutes);

const uploadRoutes = require('./routes/uploadRoutes');
app.use('/api/v1/upload', uploadRoutes);

// ==================== BROADCAST ROUTES ====================
app.use('/api/v1/broadcast', broadcastRoutes);

// ==================== INVENTORY ROUTES ====================
app.use('/api/v1/inventory', inventoryRoutes);

// Real conversations endpoint with search support - with company isolation and caching
app.get('/api/v1/conversations', 
  verifyToken.authenticateToken, 
  verifyToken.requireCompanyAccess,
  async (req, res) => {
  try {
    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { search, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    //console.log('📞 Fetching real conversations from database for company:', companyId);
    //console.log(`📄 Pagination: page=${pageNum}, limit=${limitNum}, skip=${skip}`);

    if (search) {
      //console.log(`🔍 البحث عن: "${search}"`);
    }

    // Build search conditions with company filter
    let whereCondition = {
      companyId // إضافة فلترة الشركة
    };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereCondition = {
        AND: [
          { companyId }, // تأكد من فلترة الشركة
          {
            OR: [
              // البحث في اسم العميل
              {
                customer: {
                  OR: [
                    { firstName: { contains: searchTerm } },
                    { lastName: { contains: searchTerm } },
                    { facebookId: { contains: searchTerm } },
                    { email: { contains: searchTerm } },
                    { phone: { contains: searchTerm } }
                  ]
                }
              },
              // البحث في محتوى الرسائل
              {
                messages: {
                  some: {
                    content: { contains: searchTerm }
                  }
                }
              },
              // البحث في آخر رسالة
              {
                lastMessage: { contains: searchTerm }
              }
            ]
          }
        ]
      };
    }

    // Get total count for pagination
    const totalCount = await safeDb.execute(async (prisma) => {
      return await prisma.conversation.count({
        where: whereCondition
      });
    }, { 
      fallback: 0,
      maxRetries: 2
    });

    // Use safe database operation with fallback
    const conversations = await safeDb.execute(async (prisma) => {
      return await prisma.conversation.findMany({
        where: whereCondition,
        select: {
          id: true,
          customerId: true,
          channel: true,
          status: true,
          lastMessageAt: true,
          lastMessagePreview: true,
          metadata: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              facebookId: true,
            }
          },
          assignedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          _count: {
            select: {
              messages: {
                where: {
                  isRead: false,
                  isFromCustomer: true,
                }
              }
            }
          }
        },
        orderBy: {
          lastMessageAt: 'desc'
        },
        skip: skip,
        take: limitNum
      });
    }, { 
      fallback: [], // Return empty array if database is unavailable
      maxRetries: 2 // Fewer retries for this endpoint
    });

    // Transform data to match frontend format
    const transformedConversations = await Promise.all(conversations.map(async conv => {
      // استخراج حالة AI من metadata
      let aiEnabled = true; // افتراضي
      let pageName = null; // اسم الصفحة
      let pageId = null; // معرف الصفحة
      if (conv.metadata) {
        try {
          const metadata = JSON.parse(conv.metadata);
          aiEnabled = metadata.aiEnabled !== false;
          pageName = metadata.pageName || null;
          pageId = metadata.pageId || null;
          
          // إذا كان لدينا pageId لكن ليس pageName، ابحث عنه في جدول FacebookPage
          if (pageId && !pageName) {
            try {
              const facebookPage = await prisma.facebookPage.findUnique({
                where: { pageId: pageId },
                select: { pageName: true }
              });
              if (facebookPage) {
                pageName = facebookPage.pageName;
                //console.log(`🔍 [PAGE-LOOKUP] Found page name for ${pageId}: ${pageName}`);
              }
            } catch (pageError) {
              console.warn(`⚠️ Failed to lookup page name for ${pageId}:`, pageError.message);
            }
          }
          
          //console.log(`🔍 [AI-DEBUG] Conversation ${conv.id}: metadata=${conv.metadata}, aiEnabled=${aiEnabled}, pageName=${pageName}`);
        } catch (error) {
          console.warn('⚠️ Could not parse conversation metadata:', error);
        }
      } else {
        //console.log(`🔍 [AI-DEBUG] Conversation ${conv.id}: no metadata, using default aiEnabled=${aiEnabled}`);
      }

      // 🔧 FIX: Fallback لجلب آخر رسالة فعلية من جدول messages لو lastMessagePreview فارغ
      let lastMessagePreview = conv.lastMessagePreview;
      let derivedLastMessageTime = conv.lastMessageAt || conv.createdAt;
      if (
        !lastMessagePreview ||
        lastMessagePreview === 'لا توجد رسائل' ||
        lastMessagePreview.trim() === '' ||
        lastMessagePreview.trim().length < 2 ||
        /^[✓✗×\s]+$/.test(lastMessagePreview.trim())
      ) {
        try {
          // جلب جميع الرسائل وفلترتها في الكود (أبسط وأضمن)
          const messages = await prisma.message.findMany({
            where: { conversationId: conv.id },
            orderBy: { createdAt: 'desc' },
            take: 50, // جلب آخر 50 رسالة
            select: { content: true, type: true, createdAt: true }
          });
          
          // البحث عن أول رسالة فيها محتوى فعلي
          let lastMessage = null;
          for (const msg of messages) {
            const msgType = (msg.type || '').toString().toUpperCase();
            if (msgType === 'IMAGE') {
              lastMessage = { content: '📷 صورة', type: 'IMAGE', createdAt: msg.createdAt };
              break;
            } else if (msgType === 'FILE') {
              lastMessage = { content: '📎 ملف', type: 'FILE', createdAt: msg.createdAt };
              break;
            } else if (msgType === 'TEXT') {
              const trimmedContent = (msg.content || '').trim();
              // قبول أي نص غير فارغ، مع تخطي الرموز فقط مثل ✓✓
              if (trimmedContent.length >= 1 && !/^[✓✗×\s]+$/.test(trimmedContent)) {
                lastMessage = { ...msg, content: trimmedContent };
                break;
              }
            } else {
              // في حال كانت أنواع قديمة/مختلفة، جرّب التعامل كنص
              const trimmedContent = (msg.content || '').trim();
              if (trimmedContent.length >= 1 && !/^[✓✗×\s]+$/.test(trimmedContent)) {
                lastMessage = { ...msg, content: trimmedContent, type: 'TEXT' };
                break;
              }
            }
          }
          
          if (lastMessage && lastMessage.content) {
            lastMessagePreview = lastMessage.type === 'IMAGE' ? '📷 صورة' : 
                                lastMessage.type === 'FILE' ? '📎 ملف' : 
                                (lastMessage.content.length > 100 ? lastMessage.content.substring(0, 100) + '...' : lastMessage.content);
            derivedLastMessageTime = lastMessage.createdAt || derivedLastMessageTime;
            console.log(`✅ [FALLBACK] Retrieved last meaningful message for conversation ${conv.id}: ${lastMessagePreview.substring(0, 50)}...`);
          } else {
            lastMessagePreview = 'لا توجد رسائل';
            console.log(`⚠️ [FALLBACK] No meaningful messages found for conversation ${conv.id}`);
          }
        } catch (error) {
          console.warn(`⚠️ [FALLBACK] Failed to get last message for conversation ${conv.id}:`, error.message);
          lastMessagePreview = 'لا توجد رسائل';
        }
      }
  
      return {
        id: conv.id,
        customerId: conv.customerId,
        customerName: `${conv.customer.firstName || ''} ${conv.customer.lastName || ''}`.trim() || 'عميل',
        customerAvatar: null,
        customerEmail: conv.customer.email,
        customerPhone: conv.customer.phone,
        lastMessage: lastMessagePreview,
        lastMessageTime: derivedLastMessageTime,
        timestamp: derivedLastMessageTime,
        unreadCount: conv._count.messages,
        isOnline: false, // يمكن تحديثه لاحقاً
        platform: conv.channel?.toLowerCase() || 'facebook',
        status: conv.status?.toLowerCase() || 'active',
        messages: [],
        customerOrders: [],
        lastRepliedBy: conv.assignedUser ? `${conv.assignedUser.firstName} ${conv.assignedUser.lastName}` : null,
        aiEnabled: aiEnabled,
        pageName: pageName, // إضافة اسم الصفحة
        pageId: pageId // إضافة معرف الصفحة
      };
    }));

    //console.log(`✅ Found ${transformedConversations.length} real conversations${search ? ` matching "${search}"` : ''}`);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // إرجاع البيانات مع معلومات البحث والـ pagination
    res.json({
      success: true,
      data: transformedConversations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage
      },
      search: search || null,
      message: search ? `تم العثور على ${totalCount} محادثة مطابقة للبحث` : `تم تحميل ${transformedConversations.length} من ${totalCount} محادثة`
    });
  } catch (error) {
    console.error('❌ Error fetching real conversations:', error);
    
    // Handle connection limit errors gracefully
    if (error.message.includes('max_connections_per_hour')) {
      return res.status(503).json({ 
        success: false,
        error: 'CONNECTION_LIMIT_EXCEEDED',
        message: 'قاعدة البيانات غير متاحة مؤقتاً بسبب تجاوز حد الاتصالات',
        data: [],
        total: 0,
        retryAfter: 3600
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: 'حدث خطأ في الخادم'
    });
  }
});

// Real messages endpoint with company isolation and caching
app.get('/api/v1/conversations/:id/messages', 
  verifyToken.authenticateToken, 
  verifyToken.requireCompanyAccess,
  async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const { includeFacebookReplies = true } = req.query; // Add query parameter to include Facebook replies
    
    // التحقق من المصادقة والشركة
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }
    
    //console.log(`📨 Fetching real messages for conversation ${id} (Company: ${companyId})...`);

    // التحقق من أن المحادثة تنتمي للشركة المحددة
    const conversation = await safeDb.execute(async (prisma) => {
      return await prisma.conversation.findFirst({
        where: {
          id: id,
          companyId: companyId // ✅ التحقق من العزل
        },
        select: { id: true, companyId: true }
      });
    }, { fallback: null, maxRetries: 2 });

    if (!conversation) {
      //console.log(`❌ [SECURITY] Unauthorized access attempt to conversation ${id} by company ${companyId}`);
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة أو غير مصرح بالوصول إليها'
      });
    }

    // Use safe database operation with fallback
    const messages = await safeDb.execute(async (prisma) => {
      return await prisma.message.findMany({
        where: {
          conversationId: id,
          // ✅ عزل إضافي: التأكد من أن الرسائل تنتمي لمحادثة الشركة المحددة
          conversation: {
            companyId: companyId
          }
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
    }, { 
      fallback: [], // Return empty array if database is unavailable
      maxRetries: 2 // Fewer retries for this endpoint
    });

    // Transform messages to match frontend format
    const transformedMessages = messages.map(msg => {
      try {
      // استخراج معلومات الذكاء الصناعي من metadata
      let isAiGenerated = false;
      let isFacebookReply = false; // New flag for Facebook replies
      let facebookMessageId = null; // Store Facebook message ID if available
      
      if (msg.metadata) {
        try {
          // تنظيف metadata قبل parsing
          let cleanMetadata = msg.metadata;
          if (typeof cleanMetadata === 'string') {
            cleanMetadata = cleanMetadata.trim();

            // التحقق من صحة JSON
            if (cleanMetadata.startsWith('{') && cleanMetadata.endsWith('}')) {
              const metadata = JSON.parse(cleanMetadata);
              isAiGenerated = metadata.isAIGenerated || metadata.isAutoGenerated || false;
              isFacebookReply = metadata.platform === 'facebook' && !msg.isFromCustomer; // Outgoing Facebook messages
              facebookMessageId = metadata.facebookMessageId || null; // Store Facebook message ID
            } else {
              // إذا لم يكن JSON صحيح، تحقق من النص المباشر
              isAiGenerated = cleanMetadata.includes('"isAIGenerated":true') ||
                             cleanMetadata.includes('"isAutoGenerated":true');
              isFacebookReply = cleanMetadata.includes('"platform":"facebook"') && 
                               cleanMetadata.includes('"isFromCustomer":false');
            }
          }
        } catch (e) {
          console.warn(`⚠️ Failed to parse metadata for message ${msg.id}:`, e.message);
          // إذا فشل parsing، تحقق من النص المباشر
          isAiGenerated = msg.metadata.includes('"isAIGenerated":true') ||
                         msg.metadata.includes('"isAutoGenerated":true');
          isFacebookReply = msg.metadata.includes('"platform":"facebook"') && 
                           msg.metadata.includes('"isFromCustomer":false');
        }
      }

      // معالجة الصور والمرفقات - محسن
      let fileUrl = null;
      let fileName = null;
      let fileSize = null;

      // استخراج معلومات الملف من attachments أو metadata
      if (msg.type === 'IMAGE' || msg.type === 'FILE') {
        // أولاً: محاولة استخراج من attachments
        if (msg.attachments) {
          try {
            const attachments = JSON.parse(msg.attachments);
            if (attachments && attachments.length > 0) {
              const attachment = attachments[0];
              fileUrl = attachment.url || attachment.fileUrl;
              fileName = attachment.name || attachment.fileName;
              fileSize = attachment.size || attachment.fileSize;
            }
          } catch (e) {
            console.warn(`⚠️ Failed to parse attachments for message ${msg.id}`);
          }
        }

        // ثانياً: محاولة استخراج من metadata
        if (!fileUrl && msg.metadata) {
          try {
            const metadata = JSON.parse(msg.metadata);
            fileUrl = metadata.fileUrl;
            fileName = metadata.fileName;
            fileSize = metadata.fileSize;
          } catch (e) {
            console.warn(`⚠️ Failed to parse metadata for message ${msg.id}`);
          }
        }

        // ثالثاً: للصور القديمة، استخدم content كـ URL
        if (!fileUrl && msg.type === 'IMAGE' && msg.content) {
          if (msg.content.startsWith('http') || msg.content.startsWith('/uploads')) {
            fileUrl = msg.content;
            fileName = 'صورة';
          }
        }

        // رابعاً: للملفات، استخدم content كاسم الملف
        if (!fileName && msg.type === 'FILE') {
          fileName = msg.content;
        }
      }

      return {
        id: msg.id,
        content: msg.type === 'IMAGE' ? (fileName || 'صورة') :
                msg.type === 'FILE' ? (fileName || msg.content) : msg.content,
        timestamp: msg.createdAt,
        isFromCustomer: msg.isFromCustomer,
        sender: msg.sender ? {
          id: msg.sender.id,
          name: `${msg.sender.firstName} ${msg.sender.lastName}`,
        } : null,
        type: msg.type?.toLowerCase() || 'text',
        attachments: (() => {
          try {
            if (!msg.attachments) return [];

            // تنظيف البيانات قبل parsing
            let cleanAttachments = msg.attachments;
            if (typeof cleanAttachments === 'string') {
              // إزالة الأحرف غير المرغوب فيها
              cleanAttachments = cleanAttachments.trim();

              // التحقق من صحة JSON
              if (cleanAttachments.startsWith('[') && cleanAttachments.endsWith(']')) {
                return JSON.parse(cleanAttachments);
              } else if (cleanAttachments.startsWith('{') && cleanAttachments.endsWith('}')) {
                return [JSON.parse(cleanAttachments)];
              } else {
                console.warn(`⚠️ Invalid JSON format for attachments in message ${msg.id}`);
                return [];
              }
            }

            return Array.isArray(cleanAttachments) ? cleanAttachments : [];
          } catch (error) {
            console.error(`❌ Failed to parse attachments for message ${msg.id}:`, error.message);
            console.error(`❌ Raw attachments data: "${msg.attachments?.substring(0, 200)}..."`);
            // إرجاع مصفوفة فارغة في حالة الخطأ
            return [];
          }
        })(),
        fileUrl: fileUrl, // إضافة رابط الملف للصور
        fileName: fileName, // إضافة اسم الملف
        fileSize: fileSize, // إضافة حجم الملف
        isAiGenerated: isAiGenerated, // إضافة معلومة الذكاء الصناعي
        isFacebookReply: isFacebookReply, // إضافة معلومة الردود من فيسبوك
        facebookMessageId: facebookMessageId, // إضافة معرف رسالة فيسبوك
        metadata: msg.metadata // إضافة metadata للتشخيص
      };
      } catch (messageError) {
        console.error(`❌ Error processing message ${msg.id}:`, messageError.message);
        console.error(`❌ Message data:`, {
          id: msg.id,
          type: msg.type,
          content: msg.content?.substring(0, 100),
          attachments: msg.attachments?.substring(0, 100),
          metadata: msg.metadata?.substring(0, 100)
        });

        // إرجاع رسالة بسيطة في حالة الخطأ
        return {
          id: msg.id,
          content: msg.content || '[رسالة معطوبة]',
          type: msg.type || 'TEXT',
          timestamp: msg.createdAt,
          isFromCustomer: msg.isFromCustomer,
          attachments: [],
          isAiGenerated: false,
          isFacebookReply: false, // Default to false on error
          facebookMessageId: null, // Default to null on error
          metadata: null
        };
      }
    }).filter(Boolean); // إزالة الرسائل null

    // إحصائيات الرسائل
    const aiMessages = transformedMessages.filter(m => m.isAiGenerated).length;
    const manualMessages = transformedMessages.filter(m => !m.isFromCustomer && !m.isAiGenerated && !m.isFacebookReply).length;
    const customerMessages = transformedMessages.filter(m => m.isFromCustomer).length;
    const facebookReplies = transformedMessages.filter(m => m.isFacebookReply).length; // Count Facebook replies

    //console.log(`✅ [SECURITY] Company ${companyId} accessed ${transformedMessages.length} messages from conversation ${id}`);
    //console.log(`📊 Message stats - AI: ${aiMessages}, Manual: ${manualMessages}, Customer: ${customerMessages}, Facebook: ${facebookReplies}`);

    res.json(transformedMessages);
  } catch (error) {
    console.error('❌ Error fetching real messages:', error);
    
    // Handle connection limit errors gracefully
    if (error.message.includes('max_connections_per_hour')) {
      return res.status(503).json({ 
        success: false,
        error: 'CONNECTION_LIMIT_EXCEEDED',
        message: 'قاعدة البيانات غير متاحة مؤقتاً بسبب تجاوز حد الاتصالات',
        data: [],
        retryAfter: 3600
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: 'حدث خطأ في الخادم'
    });
  }
});

// Real customer profile endpoint
app.get('/api/v1/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    //console.log(`👤 Fetching real customer profile for ${id}...`);

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Transform customer data
    const transformedCustomer = {
      id: customer.id,
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'عميل',
      email: customer.email,
      phone: customer.phone,
      avatar: customer.avatar,
      orders: customer.orders.map(order => ({
        id: order.id,
        total: order.total,
        status: order.status,
        date: order.createdAt
      })),
      totalSpent: customer.orders.reduce((sum, order) => sum + (order.total || 0), 0),
      joinDate: customer.createdAt,
      lastActivity: customer.updatedAt,
      preferences: {
        language: 'ar',
        notifications: true
      }
    };

    //console.log(`✅ Found real customer: ${transformedCustomer.name}`);
    res.json(transformedCustomer);
  } catch (error) {
    console.error('❌ Error fetching real customer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Real saved replies endpoint
app.get('/api/v1/saved-replies', async (req, res) => {
  try {
    //console.log('💬 Fetching real saved replies from database...');

    // يمكن إضافة جدول saved_replies لاحقاً، الآن نستخدم ردود افتراضية
    const savedReplies = [
      {
        id: '1',
        title: 'ترحيب',
        content: 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟',
        category: 'welcome',
        createdAt: new Date()
      },
      {
        id: '2',
        title: 'شكر',
        content: 'شكراً لتواصلك معنا. نقدر ثقتك بنا.',
        category: 'thanks',
        createdAt: new Date()
      },
      {
        id: '3',
        title: 'اعتذار',
        content: 'نعتذر عن أي إزعاج. سنعمل على حل المشكلة فوراً.',
        category: 'apology',
        createdAt: new Date()
      },
      {
        id: '4',
        title: 'متابعة',
        content: 'هل تحتاج إلى أي مساعدة إضافية؟',
        category: 'followup',
        createdAt: new Date()
      },
      {
        id: '5',
        title: 'إغلاق',
        content: 'شكراً لك. نتمنى لك يوماً سعيداً!',
        category: 'closing',
        createdAt: new Date()
      }
    ];

    //console.log(`✅ Returning ${savedReplies.length} saved replies`);
    res.json(savedReplies);
  } catch (error) {
    console.error('❌ Error fetching saved replies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Get Facebook user info (الطريقة القديمة - تعمل فقط مع المطورين والإداريين)
async function getFacebookUserInfo(userId, pageAccessToken) {
  try {
    //console.log(`🔍 Fetching Facebook user info for: ${userId}`);
    const response = await axios.get(`https://graph.facebook.com/v18.0/${userId}`, {
      params: {
        access_token: pageAccessToken,
        fields: 'first_name,last_name,profile_pic',
      },
      timeout: 5000
    });

    //console.log(`✅ Facebook user info retrieved:`, {
    //   id: userId,
    //   name: `${response.data.first_name} ${response.data.last_name}`,
    //   first_name: response.data.first_name,
    //   last_name: response.data.last_name,
    //   profile_pic: response.data.profile_pic ? 'Available' : 'Not available'
    // });

    return response.data;
  } catch (error) {
    console.error('❌ Error getting Facebook user info:', error.message);
    if (error.response) {
      console.error('❌ Facebook API Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    console.error('❌ Request details:', {
      userId: userId,
      url: `https://graph.facebook.com/v18.0/${userId}`,
      hasToken: !!pageAccessToken,
      tokenLength: pageAccessToken ? pageAccessToken.length : 0
    });
    // في حالة فشل الحصول على الاسم الحقيقي، نعيد null لعدم التحديث
    //console.log('⚠️ Could not get real name from Facebook, keeping existing name');
    return null;

    // اختيار اسم عشوائي بناءً على User ID
    const nameIndex = parseInt(userId.slice(-1)) % fallbackNames.length;
    return fallbackNames[nameIndex];
  }
}
// Update existing Facebook customers with real names
app.post('/api/v1/customers/update-facebook-names', async (req, res) => {
  try {
    //console.log('🔄 Starting to update Facebook customer names...');

    // البحث عن الصفحة الافتراضية للحصول على pageAccessToken
    const defaultPage = await prisma.facebookPage.findFirst({
      where: { status: 'connected' },
      orderBy: { connectedAt: 'desc' }
    });

    if (!defaultPage || !defaultPage.pageAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'No connected Facebook page found'
      });
    }

    // البحث عن العملاء الذين لديهم أسماء افتراضية (عربية أو إنجليزية)
    const customersToUpdate = await prisma.customer.findMany({
      where: {
        AND: [
          { facebookId: { not: null } },
          {
            OR: [
              { firstName: 'Facebook' },
              { lastName: 'User' },
              { firstName: { contains: 'Facebook' } },
              { firstName: 'عميل' },
              { firstName: 'زائر' },
              { firstName: 'زبون' },
              { lastName: 'كريم' },
              { lastName: 'مميز' },
              { lastName: 'عزيز' },
              { lastName: 'جديد' }
            ]
          }
        ]
      },
      take: 50 // تحديث 50 عميل في المرة الواحدة لتجنب rate limiting
    });

    //console.log(`📊 Found ${customersToUpdate.length} customers to update`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const customer of customersToUpdate) {
      try {
        // جلب معلومات المستخدم الحقيقية من Facebook
        const userInfo = await getFacebookUserInfo(customer.facebookId, defaultPage.pageAccessToken);

        if (userInfo && userInfo.first_name && userInfo.last_name) {
          // التحقق من أن الاسم ليس افتراضياً
          const isDefaultName = ['Facebook', 'عميل', 'زائر', 'زبون'].includes(userInfo.first_name) ||
                               ['User', 'كريم', 'مميز', 'عزيز', 'جديد'].includes(userInfo.last_name);

          if (!isDefaultName) {
            // تحديث اسم العميل بالاسم الحقيقي
            await prisma.customer.update({
              where: { id: customer.id },
              data: {
                firstName: userInfo.first_name,
                lastName: userInfo.last_name
              }
            });

            //console.log(`✅ Updated customer ${customer.id}: ${customer.firstName} ${customer.lastName} → ${userInfo.first_name} ${userInfo.last_name}`);
            updatedCount++;
          } else {
            //console.log(`⚠️ Customer ${customer.id} has default name on Facebook too: ${userInfo.first_name} ${userInfo.last_name}`);
          }
        } else {
          //console.log(`⚠️ Could not get real name for customer ${customer.id} (${customer.facebookId})`);
        }

        // تأخير قصير لتجنب rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Error updating customer ${customer.id}:`, error.message);
        errorCount++;
      }
    }

    //console.log(`🎉 Update completed: ${updatedCount} updated, ${errorCount} errors`);

    res.json({
      success: true,
      message: `Updated ${updatedCount} customers successfully`,
      stats: {
        total: customersToUpdate.length,
        updated: updatedCount,
        errors: errorCount
      }
    });

  } catch (error) {
    console.error('❌ Error updating Facebook customer names:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// API endpoint لتحديث أسماء العملاء لعرض Facebook User ID
app.post('/api/v1/customers/update-names-to-ids', async (req, res) => {
  try {
    //console.log('🔄 Starting to update customer names to show Facebook User IDs...');

    // البحث عن جميع العملاء الذين لديهم Facebook IDs
    const customersToUpdate = await prisma.customer.findMany({
      where: {
        facebookId: { not: null }
      },
      take: 100 // تحديث 100 عميل في المرة الواحدة
    });

    //console.log(`📊 Found ${customersToUpdate.length} customers to update`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const customer of customersToUpdate) {
      try {
        // تحديث اسم العميل ليعرض Facebook User ID كاملاً
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            firstName: customer.facebookId,
            lastName: ""
          }
        });

        //console.log(`✅ Updated customer ${customer.id}: ${customer.firstName} ${customer.lastName} → عميل #${shortId}`);
        updatedCount++;

        // تأخير قصير
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        console.error(`❌ Error updating customer ${customer.id}:`, error.message);
        errorCount++;
      }
    }

    //console.log(`🎉 Update completed: ${updatedCount} updated, ${errorCount} errors`);

    res.json({
      success: true,
      message: `Updated ${updatedCount} customers to show Facebook User IDs successfully`,
      stats: {
        total: customersToUpdate.length,
        updated: updatedCount,
        errors: errorCount
      }
    });

  } catch (error) {
    console.error('❌ Error updating customer names to IDs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test Facebook API connection
app.get('/api/v1/facebook/test-token/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;

    const page = await prisma.facebookPage.findFirst({
      where: { pageId: pageId }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Test the token by getting page info
    const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
      params: {
        access_token: page.pageAccessToken,
        fields: 'name,id'
      },
      timeout: 5000
    });

    res.json({
      success: true,
      pageInfo: response.data,
      tokenValid: true
    });

  } catch (error) {
    console.error('❌ Token test failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message,
      tokenValid: false,
      details: error.response?.data
    });
  }
});

// Update Page Access Token
app.post('/api/v1/facebook/update-token/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { pageAccessToken } = req.body;

    if (!pageAccessToken) {
      return res.status(400).json({ error: 'Page access token is required' });
    }

    // Test the new token first
    const testResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
      params: {
        access_token: pageAccessToken,
        fields: 'name,id'
      },
      timeout: 5000
    });

    // Update the token in database
    const updatedPage = await prisma.facebookPage.update({
      where: { pageId: pageId },
      data: {
        pageAccessToken: pageAccessToken,
        status: 'connected',
        connectedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Token updated successfully',
      pageInfo: testResponse.data,
      updatedPage: {
        id: updatedPage.id,
        pageId: updatedPage.pageId,
        pageName: updatedPage.pageName,
        status: updatedPage.status
      }
    });

  } catch (error) {
    console.error('❌ Token update failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});






// ==================== GRACEFUL SHUTDOWN ====================

// معالجة إغلاق آمن للخدمات
process.on('SIGINT', async () => {
  //console.log('\n🛑 Received SIGINT, shutting down gracefully...');

  try {
    // إيقاف خدمة الاكتشاف التلقائي
    //console.log('🔍 Stopping Auto Pattern Detection Service...');
    autoPatternService.stop();

    // إغلاق اتصال قاعدة البيانات
    //console.log('🔌 Closing database connection...');
    await prisma.$disconnect();

    //console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  //console.log('\n🛑 Received SIGTERM, shutting down gracefully...');

  try {
    autoPatternService.stop();
    await prisma.$disconnect();
    //console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
});

// Test route to convert conversation to Facebook for testing (public for testing)
app.post('/api/test/convert-to-facebook/:conversationId', (req, res, next) => {
  // Skip auth for this test route
  next();
}, async (req, res) => {
  try {
    const { conversationId } = req.params;

    //console.log(`🔧 [TEST] Converting conversation ${conversationId} to Facebook...`);

    // Get conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: true }
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Update customer to have Facebook ID
    const testFacebookUserId = '2902798053097917'; // Test Facebook User ID
    await prisma.customer.update({
      where: { id: conversation.customerId },
      data: {
        facebookId: testFacebookUserId,
        firstName: 'Test Facebook',
        lastName: 'User'
      }
    });

    // Update conversation metadata
    const currentMetadata = conversation.metadata ? JSON.parse(conversation.metadata) : {};
    const updatedMetadata = {
      ...currentMetadata,
      pageId: '208485636722490',
      aiEnabled: true,
      platform: 'FACEBOOK'
    };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: JSON.stringify(updatedMetadata),
        channel: 'FACEBOOK'
      }
    });

    //console.log(`✅ [TEST] Conversation ${conversationId} converted to Facebook`);
    //console.log(`👤 [TEST] Customer now has Facebook ID: ${testFacebookUserId}`);

    res.json({
      success: true,
      message: 'Conversation converted to Facebook',
      conversationId,
      facebookUserId: testFacebookUserId,
      pageId: '208485636722490'
    });

  } catch (error) {
    console.error('❌ [TEST] Error converting conversation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Server is already started by startServer() function above

module.exports = app;
