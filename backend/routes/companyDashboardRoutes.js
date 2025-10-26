const express = require('express');
const router = express.Router();
const companyDashboardController = require('../controller/companyDashboardController');
const verifyToken = require("../utils/verifyToken")

router.get('/dashboard',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,companyDashboardController.companyDashboardOverview)

router.get('/settings',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,companyDashboardController.companySettings)

router.put('/settings',verifyToken.authenticateToken,verifyToken.requireRole(['COMPANY_ADMIN']),companyDashboardController.updateCompanySettings)


// ==================== PLAN LIMITS ROUTES ====================

router.get('/limits',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,companyDashboardController.checkPlanLimits)

router.post('/limits/check',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,companyDashboardController.checkSpecificLimit)

router.post('/limits/check',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,companyDashboardController.checkMultipleLimits)
module.exports = router;