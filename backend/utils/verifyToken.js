// ==================== MIDDLEWARE ====================
const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticateToken = (req, res, next) => {

  
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];



  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'رمز المصادقة مطلوب',
      code: 'TOKEN_REQUIRED'
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'رمز المصادقة غير صحيح',
      code: 'INVALID_TOKEN',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Company access middleware
const requireCompanyAccess = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const userCompanyId = req.user.companyId;

    // Super admin can access all companies
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Regular users can only access their own company
    if (companyId && companyId !== userCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لهذه الشركة'
      });
    }

    // If no companyId in params, use user's company
    if (!companyId) {
      req.params.companyId = userCompanyId;
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من صلاحية الوصول'
    });
  }
};

// Role-based access control
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لهذا الإجراء'
      });
    }
    next();
  };
};

// Super Admin access control middleware
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'غير مصرح بالوصول'
    });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'هذا المورد متاح لمدير النظام فقط'
    });
  }

  next();
};


module.exports = {requireSuperAdmin , requireRole , requireCompanyAccess , authenticateToken}