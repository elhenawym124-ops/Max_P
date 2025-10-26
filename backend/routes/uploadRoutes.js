const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const productsDir = path.join(uploadsDir, 'products');
const conversationsDir = path.join(uploadsDir, 'conversations');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

if (!fs.existsSync(conversationsDir)) {
  fs.mkdirSync(conversationsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, productsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  }
});

// Upload single image
router.post('/single', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const imageUrl = `/uploads/products/${req.file.filename}`;
    
    //console.log('Image uploaded successfully:', imageUrl);

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: imageUrl,
        fullUrl: `${req.protocol}://${req.get('host')}${imageUrl}`
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    });
  }
});

// Upload multiple images
router.post('/multiple', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => {
      const imageUrl = `/uploads/products/${file.filename}`;
      return {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        url: imageUrl,
        fullUrl: `${req.protocol}://${req.get('host')}${imageUrl}`
      };
    });

    //console.log(`${uploadedFiles.length} images uploaded successfully`);

    res.json({
      success: true,
      data: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload images'
    });
  }
});

// Delete image
router.delete('/file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(productsDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      //console.log('Image deleted successfully:', filename);
      
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum is 10 files.'
      });
    }
  }
  
  res.status(400).json({
    success: false,
    error: error.message || 'Upload failed'
  });
});

// Configure multer for conversation images
const conversationStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, conversationsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `conversation-${uniqueSuffix}${extension}`);
  }
});

const conversationUpload = multer({
  storage: conversationStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  }
});

// Upload image for conversation
router.post('/conversation-image', conversationUpload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image uploaded'
      });
    }

    const imageUrl = `/uploads/conversations/${req.file.filename}`;

    //console.log('Conversation image uploaded successfully:', imageUrl);

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: imageUrl,
        fullUrl: `${req.protocol}://${req.get('host')}${imageUrl}`,
        type: 'image'
      }
    });
  } catch (error) {
    console.error('Error uploading conversation image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    });
  }
});

module.exports = router;
