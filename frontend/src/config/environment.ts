/**
 * Smart Environment Configuration System
 * نظام ذكي لكشف البيئة وتحديد الروابط تلقائياً
 */

interface EnvironmentConfig {
  apiUrl: string;
  wsUrl: string;
  appUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  environment: 'development' | 'production';
}

/**
 * كشف البيئة الحالية بناءً على hostname
 */
const detectEnvironment = (): 'development' | 'production' => {
  const hostname = window.location.hostname;
  
  // إذا كان localhost أو IP محلي = بيئة تطوير
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.includes('local')
  ) {
    return 'development';
  }
  
  // أي شيء آخر = بيئة إنتاج
  return 'production';
};

/**
 * إنشاء إعدادات البيئة الذكية
 */
const createEnvironmentConfig = (): EnvironmentConfig => {
  const environment = detectEnvironment();
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';
  
  let apiUrl: string;
  let wsUrl: string;
  let appUrl: string;
  
  if (isDevelopment) {
    // إعدادات بيئة التطوير
    const backendPort = 3007;
    const frontendPort = window.location.port || '3000';
    
    apiUrl = `http://localhost:${backendPort}/api/v1`;
    wsUrl = `ws://localhost:${backendPort}`;
    appUrl = `http://localhost:${frontendPort}`;
  } else {
    // إعدادات بيئة الإنتاج
    const productionDomain = 'https://www.mokhtarelhenawy.online';
    
    apiUrl = `${productionDomain}/api/v1`;
    wsUrl = `wss://mokhtarelhenawy.online`;
    appUrl = productionDomain;
  }
  
  return {
    apiUrl,
    wsUrl,
    appUrl,
    isDevelopment,
    isProduction,
    environment
  };
};

// إنشاء إعدادات البيئة
export const envConfig = createEnvironmentConfig();

// تسجيل معلومات البيئة في الكونسول
console.log('🌍 [ENV-CONFIG] Environment Detection:', {
  hostname: window.location.hostname,
  environment: envConfig.environment,
  apiUrl: envConfig.apiUrl,
  wsUrl: envConfig.wsUrl,
  appUrl: envConfig.appUrl
});

// تصدير دوال مساعدة
export const isLocal = () => envConfig.isDevelopment;
export const isProduction = () => envConfig.isProduction;
export const getApiUrl = () => envConfig.apiUrl;
export const getWsUrl = () => envConfig.wsUrl;
export const getAppUrl = () => envConfig.appUrl;

export default envConfig;