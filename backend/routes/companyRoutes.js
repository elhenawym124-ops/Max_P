const express = require('express');
const router = express.Router();
const companiesController = require('../controller/companiesController');
const verifyToken = require("../utils/verifyToken")
const { cacheMiddleware } = require('../middleware/performanceOptimization');

// Apply caching to frequently accessed company routes
router.get('/current', cacheMiddleware(120000), companiesController.getCurrentCompany); // 2 minutes cache
router.get('/1',companiesController.REMOVEDDangerousFallbackEndpoint);
router.get('/:id/usage', cacheMiddleware(60000), companiesController.companyUsageEndpoint); // 1 minute cache
router.get('/1/usage-mock',companiesController.mockEndpoint);
router.get('/usage-safe', cacheMiddleware(60000), companiesController.safeUsageEndpoint); // 1 minute cache
router.get('/plans', cacheMiddleware(300000), companiesController.companyPlansEndpoint); // 5 minutes cache
router.get('/:id/info',verifyToken.authenticateToken, cacheMiddleware(120000), companiesController.getCompanyInfoEndpoint); // 2 minutes cache
router.put('/:companyId/currency',companiesController.updateCompanyCurrency);
////////////////////////////////////////////////////////////
router.get('/',companiesController.getAllCompanies);
router.get('/:id',verifyToken.authenticateToken,companiesController.getCompanyDetails);
router.post('/',companiesController.createNewCompany);
router.put('/:id',companiesController.updateCompany);
router.delete('/:id',companiesController.deleteCompany);
// ==================== COMPANY USERS MANAGEMENT ====================
router.get('/:companyId/users',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,companiesController.getCompanyUsers);
router.post('/:companyId/users',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,verifyToken.requireRole(['COMPANY_ADMIN']),companiesController.createnewUserForCompany);
router.put('/:companyId/users/:userId',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,verifyToken.requireRole(['COMPANY_ADMIN']),companiesController.updateUser);
router.delete('/:companyId/users/:userId',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,verifyToken.requireRole(['COMPANY_ADMIN']),companiesController.deleteUser);

// ==================== USER PROFILE ====================
router.put('/profile/me',verifyToken.authenticateToken,companiesController.updateMyProfile);

// ==================== ROLES & PERMISSIONS MANAGEMENT ====================
router.post('/:companyId/roles',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,verifyToken.requireRole(['COMPANY_ADMIN']),companiesController.createCustomRole);
router.get('/:companyId/roles',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,companiesController.getCompanyRoles);
router.put('/:companyId/roles/:roleKey',companiesController.updateCustomRole);
router.delete('/:companyId/roles/:roleKey',companiesController.deleteCustomRole);

// ==================== USER INVITATIONS ROUTES ====================
router.post('/:companyId/invitations',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,verifyToken.requireRole(['COMPANY_ADMIN']),companiesController.sendUserInvitation);

router.delete('/:companyId/invitations/:invitationId',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,companiesController.cancelInvitation);

router.post('/:companyId/invitations/:invitationId',verifyToken.authenticateToken,verifyToken.requireCompanyAccess,verifyToken.requireRole(['COMPANY_ADMIN']),companiesController.resendInvitation);


router.get('/frontend-safe/:id/usage',companiesController.FrontendSpecificSafeEndpoint);

module.exports = router;