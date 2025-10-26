const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Plans Management APIs for Super Admin
 */

// Default plan configurations
const DEFAULT_PLANS = {
  BASIC: {
    name: 'الخطة الأساسية',
    nameEn: 'Basic Plan',
    price: 2500,
    currency: 'EGP',
    billingCycle: 'monthly',
    features: {
      maxUsers: 5,
      maxCustomers: 1000,
      maxConversations: 5000,
      maxMessages: 50000,
      aiResponses: 1000,
      customBranding: false,
      advancedReports: false,
      apiAccess: false,
      prioritySupport: false,
      customIntegrations: false,
      whatsappBusiness: true,
      facebookMessenger: true,
      webChat: true,
      mobileApp: false,
      multiLanguage: false,
      customFields: 10,
      automatedWorkflows: 5,
      dataRetention: 90, // days
      storageLimit: 1, // GB
      exportData: false
    },
    description: 'مثالية للشركات الصغيرة والناشئة',
    descriptionEn: 'Perfect for small businesses and startups'
  },
  PRO: {
    name: 'الخطة الاحترافية',
    nameEn: 'Professional Plan',
    price: 7500,
    currency: 'EGP',
    billingCycle: 'monthly',
    features: {
      maxUsers: 25,
      maxCustomers: 10000,
      maxConversations: 25000,
      maxMessages: 250000,
      aiResponses: 10000,
      customBranding: true,
      advancedReports: true,
      apiAccess: true,
      prioritySupport: true,
      customIntegrations: true,
      whatsappBusiness: true,
      facebookMessenger: true,
      webChat: true,
      mobileApp: true,
      multiLanguage: true,
      customFields: 50,
      automatedWorkflows: 25,
      dataRetention: 365, // days
      storageLimit: 10, // GB
      exportData: true
    },
    description: 'للشركات المتوسطة التي تحتاج ميزات متقدمة',
    descriptionEn: 'For medium businesses that need advanced features'
  },
  ENTERPRISE: {
    name: 'الخطة المؤسسية',
    nameEn: 'Enterprise Plan',
    price: 15000,
    currency: 'EGP',
    billingCycle: 'monthly',
    features: {
      maxUsers: -1, // unlimited
      maxCustomers: -1, // unlimited
      maxConversations: -1, // unlimited
      maxMessages: -1, // unlimited
      aiResponses: -1, // unlimited
      customBranding: true,
      advancedReports: true,
      apiAccess: true,
      prioritySupport: true,
      customIntegrations: true,
      whatsappBusiness: true,
      facebookMessenger: true,
      webChat: true,
      mobileApp: true,
      multiLanguage: true,
      customFields: -1, // unlimited
      automatedWorkflows: -1, // unlimited
      dataRetention: -1, // unlimited
      storageLimit: -1, // unlimited
      exportData: true,
      dedicatedSupport: true,
      customDevelopment: true,
      onPremiseDeployment: true,
      sla: '99.9%'
    },
    description: 'للمؤسسات الكبيرة مع احتياجات مخصصة',
    descriptionEn: 'For large enterprises with custom requirements'
  }
};

// Get all plans with current pricing
router.get('/plans', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    // Get custom plan configurations from database (if any)
    const customPlans = await prisma.planConfiguration.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    // Merge default plans with custom configurations
    const plans = Object.entries(DEFAULT_PLANS).map(([planType, defaultConfig]) => {
      const customConfig = customPlans.find(cp => cp.planType === planType);
      
      return {
        planType,
        ...defaultConfig,
        ...(customConfig ? {
          price: customConfig.price,
          currency: customConfig.currency,
          billingCycle: customConfig.billingCycle,
          features: { ...defaultConfig.features, ...customConfig.features },
          isCustom: true,
          lastUpdated: customConfig.updatedAt
        } : { isCustom: false })
      };
    });

    // Get usage statistics for each plan
    const planStats = await Promise.all(
      plans.map(async (plan) => {
        const companiesCount = await prisma.company.count({
          where: { plan: plan.planType, isActive: true }
        });

        const totalRevenue = companiesCount * plan.price;

        return {
          ...plan,
          stats: {
            activeCompanies: companiesCount,
            monthlyRevenue: totalRevenue,
            marketShare: 0 // Will be calculated after getting all counts
          }
        };
      })
    );

    // Calculate market share
    const totalCompanies = planStats.reduce((sum, plan) => sum + plan.stats.activeCompanies, 0);
    planStats.forEach(plan => {
      plan.stats.marketShare = totalCompanies > 0 
        ? Math.round((plan.stats.activeCompanies / totalCompanies) * 100) 
        : 0;
    });

    res.json({
      success: true,
      message: 'تم جلب بيانات الخطط بنجاح',
      data: planStats
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات الخطط',
      error: error.message
    });
  }
});

// Update plan configuration
router.put('/plans/:planType', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { planType } = req.params;
    const { price, currency, billingCycle, features, description, descriptionEn } = req.body;

    // Validate plan type
    if (!DEFAULT_PLANS[planType]) {
      return res.status(400).json({
        success: false,
        message: 'نوع الخطة غير صالح'
      });
    }

    // Validate required fields
    if (!price || !currency) {
      return res.status(400).json({
        success: false,
        message: 'السعر والعملة مطلوبان'
      });
    }

    // Update or create plan configuration
    const planConfig = await prisma.planConfiguration.upsert({
      where: { planType },
      update: {
        price: parseFloat(price),
        currency,
        billingCycle: billingCycle || 'monthly',
        features: features || DEFAULT_PLANS[planType].features,
        description,
        descriptionEn,
        updatedAt: new Date()
      },
      create: {
        planType,
        price: parseFloat(price),
        currency,
        billingCycle: billingCycle || 'monthly',
        features: features || DEFAULT_PLANS[planType].features,
        description,
        descriptionEn
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث إعدادات الخطة بنجاح',
      data: planConfig
    });

  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث إعدادات الخطة',
      error: error.message
    });
  }
});

// Get plan features comparison
router.get('/plans/comparison', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const plans = Object.entries(DEFAULT_PLANS).map(([planType, config]) => ({
      planType,
      name: config.name,
      nameEn: config.nameEn,
      price: config.price,
      features: config.features
    }));

    // Get all unique feature keys
    const allFeatures = new Set();
    plans.forEach(plan => {
      Object.keys(plan.features).forEach(feature => allFeatures.add(feature));
    });

    // Create comparison matrix
    const featureComparison = Array.from(allFeatures).map(featureKey => {
      const feature = {
        key: featureKey,
        name: getFeatureName(featureKey),
        plans: {}
      };

      plans.forEach(plan => {
        feature.plans[plan.planType] = plan.features[featureKey];
      });

      return feature;
    });

    res.json({
      success: true,
      message: 'تم جلب مقارنة الخطط بنجاح',
      data: {
        plans: plans.map(p => ({ planType: p.planType, name: p.name, price: p.price })),
        features: featureComparison
      }
    });

  } catch (error) {
    console.error('Error fetching plan comparison:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب مقارنة الخطط',
      error: error.message
    });
  }
});

// Helper function to get feature display names
function getFeatureName(featureKey) {
  const featureNames = {
    maxUsers: 'الحد الأقصى للمستخدمين',
    maxCustomers: 'الحد الأقصى للعملاء',
    maxConversations: 'الحد الأقصى للمحادثات',
    maxMessages: 'الحد الأقصى للرسائل',
    aiResponses: 'الردود الذكية',
    customBranding: 'العلامة التجارية المخصصة',
    advancedReports: 'التقارير المتقدمة',
    apiAccess: 'الوصول للـ API',
    prioritySupport: 'الدعم المتقدم',
    customIntegrations: 'التكاملات المخصصة',
    whatsappBusiness: 'واتساب بزنس',
    facebookMessenger: 'فيسبوك ماسنجر',
    webChat: 'الدردشة على الموقع',
    mobileApp: 'تطبيق الجوال',
    multiLanguage: 'متعدد اللغات',
    customFields: 'الحقول المخصصة',
    automatedWorkflows: 'سير العمل التلقائي',
    dataRetention: 'الاحتفاظ بالبيانات (أيام)',
    storageLimit: 'حد التخزين (جيجابايت)',
    exportData: 'تصدير البيانات',
    dedicatedSupport: 'دعم مخصص',
    customDevelopment: 'تطوير مخصص',
    onPremiseDeployment: 'النشر المحلي',
    sla: 'اتفاقية مستوى الخدمة'
  };

  return featureNames[featureKey] || featureKey;
}

module.exports = router;
