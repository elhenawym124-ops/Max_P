const express = require('express');
const router = express.Router();
const conversationController = require('../controller/conversationController');
const path = require("path")
const fs = require("fs")
const multer = require("multer")
const verifyToken = require("../utils/verifyToken")

const conversationStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/conversations');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `conversation-${uniqueSuffix}${extension}`);
  }
});

const conversationFileFilter = (req, file, cb) => {
  // Accept images and common file types
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('image/');
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype || extname) {
    cb(null, true);
  } else {
    cb(new Error('Only images and documents are allowed!'), false);
  }
};

const conversationUpload = multer({
  storage: conversationStorage,
  fileFilter: conversationFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  }
});

router.delete('/:id', conversationController.deleteConverstation);
router.post('/:id/messages', conversationController.postMessageConverstation);
router.post('/:id/upload',verifyToken.authenticateToken ,conversationUpload.array('files', 10) ,conversationController.uploadFile);
router.post('/:id/reply' ,conversationController.postReply);
router.get('/:id/health-check' ,conversationController.checkHealth);
router.post('/:id/read', verifyToken.authenticateToken, conversationController.markConversationAsRead);

module.exports = router;