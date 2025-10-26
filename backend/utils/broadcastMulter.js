// إعداد multer لاستقبال الصور في broadcastRoutes
const multer = require('multer');
const path = require('path');

// إعداد مكان حفظ الصور واسم الملف
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/broadcast_images'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

module.exports = upload;
