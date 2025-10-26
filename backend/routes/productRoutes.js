const express = require('express');
const router = express.Router();
const productController = require('../controller/productController');
const verifyToken = require("../utils/verifyToken")

router.get('/', verifyToken.authenticateToken ,productController.getAllProducts);
router.get('/categories', verifyToken.authenticateToken ,productController.getCategory);
router.post('/categories', verifyToken.authenticateToken ,productController.createNewCategory);
router.put('/categories/:id',verifyToken.authenticateToken , productController.updateCategory);
router.delete('/categories/:id', verifyToken.authenticateToken ,productController.deleteCategory);


router.get('/:id', verifyToken.authenticateToken ,productController.getSingleProduct);
router.patch('/:id', verifyToken.authenticateToken ,productController.updateSingleProduct);
router.delete('/:id', verifyToken.authenticateToken ,productController.deleteSingleProduct);
router.post('/', verifyToken.authenticateToken ,productController.createProduct);
router.delete('/:id/images', verifyToken.authenticateToken ,productController.deleteImageFromOneProduct);

router.post('/:id/images/url', verifyToken.authenticateToken ,productController.addImageToProduct);

// Get product variants
router.get('/:id/variants', verifyToken.authenticateToken, productController.getProductVariants);

module.exports = router;