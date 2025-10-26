/**
 * Smart Environment Configuration System for Backend
 * نظام ذكي لكشف البيئة وتحديد الروابط تلقائياً للخادم الخلفي
 */

const detectEnvironment = () => {
  // فحص إذا كان في بيئة تطوير محلية
  const isLocalDevelopment = (
    process.env.NODE_ENV === 'development' ||
    !process.env.NODE_ENV ||
    process.env.PORT === '3007' ||
    !process.env.DATABASE_URL?.includes('production')
  );
  
  // إذا كان NODE_ENV مضبوط صراحة على production
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('production')) {
    return 'production';
  }
  
  // أي حالة أخرى = تطوير
  if (isLocalDevelopment) {
    return 'development';
  }
  
  return 'development'; // Default to development for safety
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
    const frontendPort = '3000';
    
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
      ? ['http://localhost:3000', 'http://localhost:3007', 'http://127.0.0.1:3000', 'http://127.0.0.1:3007']
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