const express = require('express');
const router = express.Router();
const adminCompnayController = require('../controller/adminCompnayController');
const verifyToken = require("../utils/verifyToken")

// Get all companies (for Super Admin dashboard)
router.get('/', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.getAllCompanies);

router.get('/:companyId', verifyToken.authenticateToken , verifyToken.requireSuperAdmin, adminCompnayController.getCompanyDetails);

router.post('/', verifyToken.authenticateToken , verifyToken.requireSuperAdmin, adminCompnayController.createNewCompany);

router.put('/:companyId', verifyToken.authenticateToken , verifyToken.requireSuperAdmin, adminCompnayController.updateCompany);

router.delete('/:companyId', verifyToken.authenticateToken , verifyToken.requireSuperAdmin, adminCompnayController.deleteCompany);

// Get Facebook pages for a company
router.get('/:companyId/facebook-pages', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.getCompanyFacebookPages);

// Login as company admin
router.post('/:companyId/login-as-admin', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.loginAsCompanyAdmin);

module.exports = router;