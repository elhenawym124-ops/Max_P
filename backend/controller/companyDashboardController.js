const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

const planLimitsService = require('../services/planLimitsService');

const companyDashboardOverview = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        // Get company info
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                _count: {
                    select: {
                        users: true,
                        customers: true,
                        products: true,
                        orders: true,
                        conversations: true
                    }
                }
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Get plan limits
        const planLimits = {
            BASIC: {
                users: 5,
                customers: 1000,
                conversations: 5000,
                storage: 1024 // MB
            },
            PRO: {
                users: 25,
                customers: 10000,
                conversations: 25000,
                storage: 5120 // MB
            },
            ENTERPRISE: {
                users: -1, // unlimited
                customers: -1,
                conversations: -1,
                storage: -1
            }
        };

        const currentLimits = planLimits[company.plan] || planLimits.BASIC;

        // Calculate usage percentages
        const usage = {
            users: {
                current: company._count.users,
                limit: currentLimits.users,
                percentage: currentLimits.users === -1 ? 0 : Math.round((company._count.users / currentLimits.users) * 100)
            },
            customers: {
                current: company._count.customers,
                limit: currentLimits.customers,
                percentage: currentLimits.customers === -1 ? 0 : Math.round((company._count.customers / currentLimits.customers) * 100)
            },
            conversations: {
                current: company._count.conversations,
                limit: currentLimits.conversations,
                percentage: currentLimits.conversations === -1 ? 0 : Math.round((company._count.conversations / currentLimits.conversations) * 100)
            }
        };

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentStats = await Promise.all([
            prisma.user.count({
                where: {
                    companyId,
                    createdAt: { gte: sevenDaysAgo }
                }
            }),
            prisma.customer.count({
                where: {
                    companyId,
                    createdAt: { gte: sevenDaysAgo }
                }
            }),
            prisma.conversation.count({
                where: {
                    companyId,
                    createdAt: { gte: sevenDaysAgo }
                }
            })
        ]);

        const dashboardData = {
            company: {
                id: company.id,
                name: company.name,
                plan: company.plan,
                currency: company.currency,
                isActive: company.isActive
            },
            counts: company._count,
            usage,
            limits: currentLimits,
            recentActivity: {
                newUsers: recentStats[0],
                newCustomers: recentStats[1],
                newConversations: recentStats[2]
            }
        };

        res.json({
            success: true,
            message: 'تم جلب بيانات لوحة التحكم بنجاح',
            data: dashboardData
        });

    } catch (error) {
        console.error('❌ Error fetching dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب بيانات لوحة التحكم',
            error: error.message
        });
    }
};

const companySettings = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                website: true,
                address: true,
                plan: true,
                currency: true,
                isActive: true,
                settings: true,
                createdAt: true
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Parse settings
        const settings = company.settings ? JSON.parse(company.settings) : {};

        res.json({
            success: true,
            message: 'تم جلب إعدادات الشركة بنجاح',
            data: {
                ...company,
                settings
            }
        });

    } catch (error) {
        console.error('❌ Error fetching company settings:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب إعدادات الشركة',
            error: error.message
        });
    }
};

const updateCompanySettings = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const {
            name,
            email,
            phone,
            website,
            address,
            settings
        } = req.body;

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(phone !== undefined && { phone }),
                ...(website !== undefined && { website }),
                ...(address !== undefined && { address }),
                ...(settings && { settings: JSON.stringify(settings) })
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                website: true,
                address: true,
                plan: true,
                currency: true,
                isActive: true,
                settings: true,
                updatedAt: true
            }
        });

        res.json({
            success: true,
            message: 'تم تحديث إعدادات الشركة بنجاح',
            data: {
                ...updatedCompany,
                settings: updatedCompany.settings ? JSON.parse(updatedCompany.settings) : {}
            }
        });

    } catch (error) {
        console.error('❌ Error updating company settings:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث إعدادات الشركة',
            error: error.message
        });
    }
};

// ==================== PLAN LIMITS ROUTES ====================

const checkPlanLimits = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        // Get current usage
        const usage = await planLimitsService.getCurrentUsage(companyId);
        const limits = planLimitsService.getPlanLimits(usage.plan);

        // Calculate usage percentages
        const usageData = {};
        for (const [type, currentCount] of Object.entries(usage)) {
            if (type === 'plan') continue;

            const limit = limits[type];
            usageData[type] = {
                current: currentCount,
                limit,
                percentage: limit === -1 ? 0 : Math.round((currentCount / limit) * 100),
                remaining: limit === -1 ? -1 : Math.max(0, limit - currentCount)
            };
        }

        // Get warnings
        const warnings = await planLimitsService.getUsageWarnings(companyId);

        // Get upgrade suggestions
        const upgradeSuggestions = planLimitsService.getUpgradeSuggestions(usage.plan);

        res.json({
            success: true,
            message: 'تم جلب حدود الخطة بنجاح',
            data: {
                plan: usage.plan,
                limits,
                usage: usageData,
                warnings,
                upgradeSuggestions
            }
        });

    } catch (error) {
        console.error('❌ Error fetching plan limits:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب حدود الخطة',
            error: error.message
        });
    }
}

const checkSpecificLimit = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { type, count = 1 } = req.body;

        if (!type) {
            return res.status(400).json({
                success: false,
                message: 'نوع الحد مطلوب'
            });
        }

        const checkResult = await planLimitsService.checkLimits(companyId, type, count);

        res.json({
            success: true,
            message: 'تم فحص الحد بنجاح',
            data: checkResult
        });

    } catch (error) {
        console.error('❌ Error checking limit:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في فحص الحد',
            error: error.message
        });
    }
}

const checkMultipleLimits = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { checks } = req.body;

        if (!checks || typeof checks !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'بيانات الفحص مطلوبة'
            });
        }

        const results = await planLimitsService.checkMultipleLimits(companyId, checks);

        res.json({
            success: true,
            message: 'تم فحص الحدود بنجاح',
            data: results
        });

    } catch (error) {
        console.error('❌ Error checking multiple limits:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في فحص الحدود',
            error: error.message
        });
    }
}

module.exports = {
    companyDashboardOverview,
    companySettings,
    updateCompanySettings , 
    checkPlanLimits ,
    checkMultipleLimits , 
    checkSpecificLimit
}