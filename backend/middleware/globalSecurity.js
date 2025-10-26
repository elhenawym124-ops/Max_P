/**
 * Global Security Middleware
 * نظام حماية شامل لجميع routes في التطبيق
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Security logging system
class SecurityLogger {
  constructor() {
    this.logs = new Map();
    this.alertThresholds = {
      'failed_auth': { count: 5, timeWindow: 300000 }, // 5 attempts in 5 minutes
      'company_violation': { count: 3, timeWindow: 300000 }, // 3 violations in 5 minutes
      'unauthorized_access': { count: 10, timeWindow: 600000 } // 10 attempts in 10 minutes
    };
    this.suspiciousIPs = new Set();
    this.blockedIPs = new Set();
  }

  log(eventType, details) {
    const logEntry = {
      timestamp: new Date(),
      type: eventType,
      ...details
    };

    if (!this.logs.has(eventType)) {
      this.logs.set(eventType, []);
    }

    this.logs.get(eventType).push(logEntry);

    // Keep only last 1000 entries per event type
    if (this.logs.get(eventType).length > 1000) {
      this.logs.get(eventType).shift();
    }

    // Check for suspicious activity
    this.checkSuspiciousActivity(eventType, details);

    // Console logging with security level
    const securityLevel = this.getSecurityLevel(eventType);
    //console.log(`🔒 [SECURITY-${securityLevel}] ${eventType}:`, details);

    // Write critical events to file
    if (securityLevel === 'CRITICAL') {
      this.writeToSecurityLog(logEntry);
    }
  }

  getSecurityLevel(eventType) {
    const criticalEvents = ['company_violation', 'unauthorized_database_access', 'token_tampering'];
    const highEvents = ['failed_auth', 'unauthorized_access', 'suspicious_activity'];
    const mediumEvents = ['company_access_denied', 'invalid_token'];

    if (criticalEvents.includes(eventType)) return 'CRITICAL';
    if (highEvents.includes(eventType)) return 'HIGH';
    if (mediumEvents.includes(eventType)) return 'MEDIUM';
    return 'LOW';
  }

  checkSuspiciousActivity(eventType, details) {
    const ip = details.ip;
    if (!ip) return;

    const threshold = this.alertThresholds[eventType];
    if (!threshold) return;

    const now = Date.now();
    const recentEvents = this.logs.get(eventType).filter(
      log => log.ip === ip && (now - log.timestamp.getTime()) < threshold.timeWindow
    );

    if (recentEvents.length >= threshold.count) {
      this.log('suspicious_activity', {
        ip,
        eventType,
        count: recentEvents.length,
        timeWindow: threshold.timeWindow,
        severity: 'HIGH'
      });

      this.suspiciousIPs.add(ip);

      // Block IP after repeated violations
      if (recentEvents.length >= threshold.count * 2) {
        this.blockedIPs.add(ip);
        this.log('ip_blocked', { ip, reason: `Exceeded ${eventType} threshold` });
      }
    }
  }

  writeToSecurityLog(logEntry) {
    try {
      const logDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = path.join(logDir, 'security.log');
      const logLine = `${logEntry.timestamp.toISOString()} [${logEntry.type}] ${JSON.stringify(logEntry)}\n`;
      
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write security log:', error);
    }
  }

  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  isIPSuspicious(ip) {
    return this.suspiciousIPs.has(ip);
  }

  getSecurityReport() {
    const report = {
      totalEvents: 0,
      eventsByType: {},
      suspiciousIPs: Array.from(this.suspiciousIPs),
      blockedIPs: Array.from(this.blockedIPs),
      recentCriticalEvents: []
    };

    for (const [eventType, events] of this.logs.entries()) {
      report.totalEvents += events.length;
      report.eventsByType[eventType] = events.length;

      // Get recent critical events (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentCritical = events.filter(
        event => event.timestamp > oneDayAgo && this.getSecurityLevel(eventType) === 'CRITICAL'
      );
      report.recentCriticalEvents.push(...recentCritical);
    }

    return report;
  }

  clearOldLogs() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    for (const [eventType, events] of this.logs.entries()) {
      const filteredEvents = events.filter(event => event.timestamp > oneWeekAgo);
      this.logs.set(eventType, filteredEvents);
    }

    //console.log('🧹 [SECURITY-CLEANUP] Old security logs cleared');
  }
}

const securityLogger = new SecurityLogger();

// Clear old logs weekly
setInterval(() => {
  securityLogger.clearOldLogs();
}, 7 * 24 * 60 * 60 * 1000);

/**
 * IP Blocking Middleware
 */
const ipBlockingMiddleware = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  if (securityLogger.isIPBlocked(ip)) {
    securityLogger.log('blocked_ip_attempt', {
      ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(403).json({
      success: false,
      message: 'تم حظر الوصول من هذا العنوان',
      code: 'IP_BLOCKED'
    });
  }
  
  if (securityLogger.isIPSuspicious(ip)) {
    securityLogger.log('suspicious_ip_access', {
      ip,
      path: req.path,
      method: req.method
    });
  }
  
  next();
};

/**
 * Enhanced Request Logging Middleware
 */
const enhancedRequestLogging = (req, res, next) => {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress;
  
  // Log all requests for security monitoring
  securityLogger.log('request_received', {
    ip,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    timestamp: new Date(),
    headers: {
      authorization: req.headers.authorization ? 'Bearer [REDACTED]' : 'None',
      'content-type': req.headers['content-type'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    }
  });
  
  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(body) {
    const responseTime = Date.now() - startTime;
    
    // Log security-relevant responses
    if (res.statusCode >= 400) {
      const logType = res.statusCode === 401 ? 'auth_failure' : 
                     res.statusCode === 403 ? 'access_denied' : 'error_response';
      
      securityLogger.log(logType, {
        ip,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        errorCode: body?.code
      });
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};
const PUBLIC_ROUTES = [
  // Authentication routes
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/login',
  'GET /api/v1/auth/verify-email',
  'POST /api/v1/auth/forgot-password',
  'POST /api/v1/auth/reset-password',

  // Health and system routes
  'GET /health',
  'GET /',
  'OPTIONS *',

  // Webhook routes (تحتاج مصادقة خاصة)
  'GET /webhook',
  'POST /webhook',
  'GET /webhook/*',
  'POST /webhook/*',

  // Image proxy routes (للصور الخارجية)
  'GET /api/proxy-image',

  // Public invitation routes
  'GET /api/v1/invitations/verify/*',
  'POST /api/v1/invitations/accept/*',

  // Public monitoring routes (للمراقبة بدون مصادقة)
  'GET /api/v1/success-learning/public/*',
  'POST /api/v1/auto-patterns/public/*',

  // Development routes (في بيئة التطوير فقط)
  'POST /api/v1/dev/create-test-user',

  // Temporary: notifications routes for testing
  'GET /api/v1/notifications/test',
  'GET /api/v1/notifications/recent',
  'POST /api/v1/notifications/*/read',
  'DELETE /api/v1/notifications/*',
  'POST /api/v1/notifications/mark-all-read',

  // Temporary: queue stats for debugging
  'GET /api/v1/queue-stats',
  'GET /api/v1/queue-stats/*',

  // Temporary: opportunities routes for testing
  'GET /api/v1/opportunities',
  'GET /api/v1/opportunities/*',
  'POST /api/v1/opportunities',
  'PUT /api/v1/opportunities/*',
  'DELETE /api/v1/opportunities/*'
];

/**
 * قائمة Routes الإدارية التي تحتاج صلاحيات خاصة
 */
const ADMIN_ROUTES = [
  'GET /api/v1/admin/*',
  'POST /api/v1/admin/*',
  'PUT /api/v1/admin/*',
  'DELETE /api/v1/admin/*'
];

/**
 * قائمة Routes التي تحتاج عزل شركات
 */
const COMPANY_ISOLATED_ROUTES = [
  '/api/v1/products/*',
  '/api/v1/customers/*',
  '/api/v1/conversations/*',
  '/api/v1/orders/*',
  '/api/v1/companies/*',
  '/api/v1/users/*',
  '/api/v1/ai/*',
  '/api/v1/integrations/*',
  '/api/v1/settings/*'
];

/**
 * فحص ما إذا كان route عام
 */
function isPublicRoute(method, path) {
  return PUBLIC_ROUTES.some(route => {
    const [routeMethod, routePath] = route.split(' ');
    
    if (routeMethod === '*' || routeMethod === method) {
      if (routePath === '*') return true;
      if (routePath.endsWith('*')) {
        return path.startsWith(routePath.slice(0, -1));
      }
      return routePath === path;
    }
    
    return false;
  });
}

/**
 * فحص ما إذا كان route إداري
 */
function isAdminRoute(method, path) {
  return ADMIN_ROUTES.some(route => {
    const [routeMethod, routePath] = route.split(' ');
    
    if (routeMethod === '*' || routeMethod === method) {
      if (routePath.endsWith('*')) {
        return path.startsWith(routePath.slice(0, -1));
      }
      return routePath === path;
    }
    
    return false;
  });
}

/**
 * فحص ما إذا كان route يحتاج عزل شركات
 */
function needsCompanyIsolation(path) {
  return COMPANY_ISOLATED_ROUTES.some(route => {
    if (route.endsWith('*')) {
      return path.startsWith(route.slice(0, -1));
    }
    return route === path;
  });
}

/**
 * Middleware المصادقة العامة (Enhanced with security logging)
 */
const globalAuthentication = async (req, res, next) => {
  try {
    const method = req.method;
    const path = req.path;
    const ip = req.ip || req.connection.remoteAddress;

    // السماح للـ routes العامة
    if (isPublicRoute(method, path)) {
      securityLogger.log('public_route_access', {
        ip,
        method,
        path,
        userAgent: req.get('User-Agent')?.substring(0, 50)
      });
      return next();
    }

    // التحقق من وجود token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      securityLogger.log('failed_auth', {
        ip,
        method,
        path,
        reason: 'No token provided',
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        message: 'مطلوب تسجيل الدخول للوصول لهذا المورد',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // التحقق من صحة token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    } catch (error) {
      const logType = error.name === 'TokenExpiredError' ? 'token_expired' : 
                     error.name === 'JsonWebTokenError' ? 'token_invalid' : 'token_error';
      
      securityLogger.log(logType, {
        ip,
        method,
        path,
        error: error.message,
        tokenPrefix: token.substring(0, 10) + '...',
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح',
        code: 'INVALID_TOKEN'
      });
    }

    // إضافة معلومات المستخدم للطلب
    req.user = decoded;

    // التحقق من صلاحيات الإدارة
    if (isAdminRoute(method, path)) {
      if (decoded.role !== 'SUPER_ADMIN') {
        securityLogger.log('unauthorized_admin_access', {
          ip,
          userId: decoded.id,
          userRole: decoded.role,
          method,
          path,
          companyId: decoded.companyId
        });
        
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية إدارية للوصول لهذا المورد',
          code: 'ADMIN_ACCESS_REQUIRED'
        });
      }
    }

    // Log successful authentication
    securityLogger.log('successful_auth', {
      ip,
      userId: decoded.id,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId,
      method,
      path
    });

    next();

  } catch (error) {
    securityLogger.log('auth_system_error', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من المصادقة',
      code: 'AUTHENTICATION_ERROR'
    });
  }
};

/**
 * Middleware عزل الشركات العام (Enhanced with security logging)
 */
const globalCompanyIsolation = async (req, res, next) => {
  try {
    const path = req.path;
    const ip = req.ip || req.connection.remoteAddress;

    // تطبيق عزل الشركات فقط على routes المحددة
    if (!needsCompanyIsolation(path)) {
      return next();
    }

    // التأكد من وجود معلومات المستخدم
    if (!req.user || !req.user.companyId) {
      securityLogger.log('company_isolation_failure', {
        ip,
        method: req.method,
        path,
        userId: req.user?.id,
        reason: 'No company ID in user token'
      });
      
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    // إضافة companyId للطلب
    req.companyId = req.user.companyId;

    // التحقق من محاولة الوصول لشركة أخرى
    const requestedCompanyId = req.params.companyId || req.body.companyId || req.query.companyId;
    
    if (requestedCompanyId && req.user.role !== 'SUPER_ADMIN') {
      if (requestedCompanyId !== req.user.companyId) {
        securityLogger.log('company_violation', {
          ip,
          userId: req.user.id,
          userEmail: req.user.email,
          userCompanyId: req.user.companyId,
          requestedCompanyId,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          severity: 'CRITICAL'
        });
        
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول لبيانات هذه الشركة',
          code: 'COMPANY_ACCESS_DENIED'
        });
      }
    }

    // Log successful company access
    securityLogger.log('company_access_granted', {
      ip,
      userId: req.user.id,
      companyId: req.user.companyId,
      method: req.method,
      path,
      requestedCompanyId
    });

    next();

  } catch (error) {
    securityLogger.log('company_isolation_error', {
      ip: req.ip,
      userId: req.user?.id,
      companyId: req.user?.companyId,
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من صلاحية الوصول للشركة',
      code: 'COMPANY_ISOLATION_ERROR'
    });
  }
};

/**
 * Security Monitoring Dashboard Route
 */
const securityDashboard = (req, res) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for security dashboard'
      });
    }

    const securityReport = securityLogger.getSecurityReport();
    
    res.json({
      success: true,
      data: securityReport
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate security report',
      error: error.message
    });
  }
};

/**
 * Middleware الأمان الشامل (Enhanced)
 */
const globalSecurity = [
  ipBlockingMiddleware,
  enhancedRequestLogging,
  globalAuthentication,
  globalCompanyIsolation
];

module.exports = {
  globalSecurity,
  globalAuthentication,
  globalCompanyIsolation,
  ipBlockingMiddleware,
  enhancedRequestLogging,
  securityDashboard,
  securityLogger,
  isPublicRoute,
  isAdminRoute,
  needsCompanyIsolation
};
