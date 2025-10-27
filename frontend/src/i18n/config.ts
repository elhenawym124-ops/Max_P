import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import arTranslation from '../locales/ar/translation.json';
import enTranslation from '../locales/en/translation.json';

// قائمة الدول العربية
const ARABIC_COUNTRIES = [
  'EG', // مصر
  'SA', // السعودية
  'AE', // الإمارات
  'KW', // الكويت
  'QA', // قطر
  'BH', // البحرين
  'OM', // عمان
  'JO', // الأردن
  'LB', // لبنان
  'SY', // سوريا
  'IQ', // العراق
  'YE', // اليمن
  'PS', // فلسطين
  'LY', // ليبيا
  'TN', // تونس
  'DZ', // الجزائر
  'MA', // المغرب
  'SD', // السودان
  'SO', // الصومال
  'DJ', // جيبوتي
  'KM', // جزر القمر
  'MR', // موريتانيا
];

// دالة للكشف عن الدولة من خلال IP
const detectCountryByIP = async (): Promise<string | null> => {
  try {
    // استخدام API مجاني للكشف عن الموقع الجغرافي
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code || null;
  } catch (error) {
    console.error('Error detecting country:', error);
    return null;
  }
};

// دالة لتحديد اللغة بناءً على الدولة
const getLanguageByCountry = async (): Promise<string> => {
  // أولاً، تحقق من اللغة المحفوظة في localStorage
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage) {
    return savedLanguage;
  }

  // إذا لم تكن هناك لغة محفوظة، اكتشف الدولة
  const countryCode = await detectCountryByIP();
  
  if (countryCode && ARABIC_COUNTRIES.includes(countryCode)) {
    return 'ar';
  }
  
  return 'en';
};

// إعداد i18n
const initI18n = async () => {
  const detectedLanguage = await getLanguageByCountry();

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        ar: {
          translation: arTranslation,
        },
        en: {
          translation: enTranslation,
        },
      },
      lng: detectedLanguage,
      fallbackLng: 'ar',
      debug: false,
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
      },
    });

  // تطبيق اتجاه النص بناءً على اللغة
  document.documentElement.dir = detectedLanguage === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = detectedLanguage;
};

// تهيئة i18n
initI18n();

// دالة لتغيير اللغة
export const changeLanguage = (language: string) => {
  i18n.changeLanguage(language);
  localStorage.setItem('language', language);
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
  // إعادة تحميل الصفحة لتطبيق التغييرات على جميع المكونات
  window.location.reload();
};

export default i18n;
