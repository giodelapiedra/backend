const jwt = require('jsonwebtoken');

// Skip MongoDB imports in production or if mongoose is not available
let User;
try {
  if (process.env.NODE_ENV !== 'production' && process.env.USE_SUPABASE !== 'true') {
    User = require('../models/User');
  } else {
    console.log('⏭️ Skipping MongoDB imports in auth middleware - using Supabase only');
    User = {};
  }
} catch (error) {
  console.log('⏭️ Mongoose not available in auth middleware - using Supabase only');
  User = {};
}

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const authMiddleware = async (req, res, next) => {
  try {
    // First try to get token from cookies (preferred method)
    let token = req.cookies?.token;
    
    // If no cookie token, fall back to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.header('Authorization');
      
      if (!authHeader) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      token = authHeader.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ message: 'No token provided, authorization denied' });
      }
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is valid but user not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(401).json({ message: 'Account is temporarily locked due to too many failed login attempts' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ 
      message: 'Authentication failed'
    });
  }
};

const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  roleMiddleware,
  optionalAuth
};
