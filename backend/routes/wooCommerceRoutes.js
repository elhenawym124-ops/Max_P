const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const {
  fetchProductsFromWooCommerce,
  importSelectedProducts
} = require('../controller/wooCommerceController');

/**
 * @route   POST /api/v1/woocommerce/fetch-products
 * @desc    جلب المنتجات من WooCommerce
 * @access  Private
 */
router.post('/fetch-products', verifyToken.authenticateToken, fetchProductsFromWooCommerce);

/**
 * @route   POST /api/v1/woocommerce/import-selected
 * @desc    استيراد المنتجات المحددة من WooCommerce
 * @access  Private
 */
router.post('/import-selected', verifyToken.authenticateToken, importSelectedProducts);

module.exports = router;
