/**
 * Smart Environment Configuration System for Backend
 * نظام ذكي لكشف البيئة وتحديد الروابط تلقائياً للخادم الخلفي
 */

const detectEnvironment = () => {
  // فحص متغيرات البيئة أولاً
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  if (process.env.NODE_ENV === 'development') {
    return 'development';
  }
  
  // فحص الـ hostname أو المنافذ
  const port = process.env.PORT || '3007';
  
  // إذا كان المنفذ محلي أو في نطاق التطوير
  if (port === '3007' || port === '3007' || process.env.NODE_ENV !== 'production') {
    return 'development';
  }
  
  return 'production';
};

const createEnvironmentConfig = () => {
  const environment = detectEnvironment();
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';
  
  let frontendUrl;
  let backendUrl;
  let apiBaseUrl;
  let wsUrl;
  
  if (isDevelopment) {
    // إعدادات بيئة التطوير
    const backendPort = process.env.PORT || '3007';
    const frontendPort = '3008';
    
    frontendUrl = `http://localhost:${frontendPort}`;
    backendUrl = `http://localhost:${backendPort}`;
    apiBaseUrl = `http://localhost:${backendPort}/api/v1`;
    wsUrl = `ws://localhost:${backendPort}`;
  } else {
    // إعدادات بيئة الإنتاج
    const productionDomain = 'https://www.mokhtarelhenawy.online';
    
    frontendUrl = productionDomain;
    backendUrl = productionDomain;
    apiBaseUrl = `${productionDomain}/api/v1`;
    wsUrl = `wss://mokhtarelhenawy.online`;
  }
  
  return {
    environment,
    isDevelopment,
    isProduction,
    frontendUrl,
    backendUrl,
    apiBaseUrl,
    wsUrl,
    
    // CORS Origins - Allow both www and non-www domains
    corsOrigins: isDevelopment 
      ? ['http://localhost:3008', 'http://localhost:3000', 'https://mokhtarelhenawy.online', 'https://www.mokhtarelhenawy.online']
      : ['https://mokhtarelhenawy.online', 'https://www.mokhtarelhenawy.online'],
    
    // Database Configuration
    database: {
      // يمكن إضافة إعدادات قاعدة البيانات حسب البيئة
      ssl: isProduction,
      logging: isDevelopment
    }
  };
};

// إنشاء إعدادات البيئة
const envConfig = createEnvironmentConfig();

// تسجيل معلومات البيئة
console.log('🌍 [BACKEND-ENV] Environment Detection:', {
  environment: envConfig.environment,
  frontendUrl: envConfig.frontendUrl,
  backendUrl: envConfig.backendUrl,
  apiBaseUrl: envConfig.apiBaseUrl,
  corsOrigins: envConfig.corsOrigins
});

module.exports = envConfig;