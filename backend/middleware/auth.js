const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        company: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.companyId) {
      return res.status(403).json({ 
        error: 'User must be associated with a company',
        code: 'COMPANY_REQUIRED'
      });
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      company: user.company
    };

    // Security logging
    //console.log(`[SECURITY] Authenticated access: ${user.email} (${user.companyId}) - ${req.method} ${req.path}`);

    next();
  } catch (error) {
    console.error('[AUTH ERROR]', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Company isolation middleware
 * Ensures user can only access their company's data
 */
const requireCompanyAccess = (req, res, next) => {
  if (!req.user || !req.user.companyId) {
    return res.status(401).json({ 
      error: 'Company authentication required',
      code: 'COMPANY_AUTH_REQUIRED'
    });
  }

  // Add companyId to request for easy access
  req.companyId = req.user.companyId;

  next();
};

/**
 * Optional authentication middleware
 * Adds user info if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        company: true
      }
    });

    if (user && user.companyId) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        company: user.company
      };
    }

    next();
  } catch (error) {
    // If optional auth fails, just continue without user
    next();
  }
};

module.exports = {
  requireAuth,
  requireRole,
  requireCompanyAccess,
  optionalAuth
};
