const express = require('express');
const { body } = require('express-validator');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { authLimiter, registrationLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { uploadSingleUserPhoto } = require('../middleware/upload');
const { logLoginActivity, logLogoutActivity } = require('../middleware/authLogger');
// Import centralized validators
const { 
  validateLogin,
  validateRegister,
  validatePassword,
  handleValidationErrors 
} = require('../middleware/validators');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public (or Private for authenticated users creating workers)
router.post('/register', [
  // registrationLimiter, // DISABLED
  uploadSingleUserPhoto,
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),
  body('role').isIn(['admin', 'worker', 'employer', 'site_supervisor', 'clinician', 'case_manager', 'gp_insurer'])
    .withMessage('Valid role is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  // Optional authentication - if token is provided, verify it
  if (req.headers.authorization) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      const authUser = await User.findById(decoded.userId).select('-password');
      if (authUser) {
        req.user = authUser;
      }
    } catch (error) {
      // Token invalid, continue without authentication
    }
  }
  const { 
    firstName, 
    lastName, 
    email, 
    password, 
    role, 
    phone, 
    employer,
    address,
    emergencyContact,
    medicalInfo
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists with this email' });
  }

  // Create new user
  const userData = {
    firstName,
    lastName,
    email,
    password,
    role,
    phone
  };

  // Add optional fields if provided, or set defaults for workers
  if (address) {
    userData.address = address;
  } else if (role === 'worker') {
    // Set default address for workers
    userData.address = {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    };
  }
  
  if (emergencyContact) {
    userData.emergencyContact = emergencyContact;
  } else if (role === 'worker') {
    // Set default emergency contact for workers
    userData.emergencyContact = {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    };
  }
  
  if (medicalInfo) {
    userData.medicalInfo = medicalInfo;
  } else if (role === 'worker') {
    // Set default medical info for workers
    userData.medicalInfo = {
      bloodType: '',
      allergies: [],
      medications: [],
      medicalConditions: []
    };
  }

  // Only add employer if provided and role is worker
  if (employer && role === 'worker') {
    userData.employer = employer;
  } else if (role === 'worker' && !employer) {
    // If no employer provided but role is worker, try to get from authenticated user
    // This handles cases where site supervisors create workers
    if (req.user && req.user.employer) {
      userData.employer = req.user.employer;
    } else {
      // For workers registering through main form, assign to default employer
      // Find the first employer in the system (ABC Construction from seed data)
      const defaultEmployer = await User.findOne({ role: 'employer' });
      if (defaultEmployer) {
        userData.employer = defaultEmployer._id;
        console.log('Assigned worker to employer:', defaultEmployer.firstName, defaultEmployer.lastName);
      } else {
        console.log('No employer found in system');
      }
    }
  }

  // Handle profile image upload
  if (req.file) {
    userData.profileImage = `/uploads/users/${req.file.filename}`;
    console.log('📸 New user registration profile image saved:', userData.profileImage);
  }

  const user = new User(userData);

  await user.save();

  // Generate token
  const token = generateToken(user._id);

  // Import secure cookie settings
  const { secureCookieSettings } = require('../middleware/securityHeaders');
  
  // Set cookie with enhanced security for registration
  res.cookie('token', token, {
    ...secureCookieSettings,
    priority: 'high'
  });

  res.status(201).json({
    message: 'User registered successfully',
    token, // Still include token in response for backward compatibility
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      team: user.team,
      teamLeader: user.teamLeader,
      package: user.package,
      phone: user.phone,
      address: user.address,
      emergencyContact: user.emergencyContact,
      medicalInfo: user.medicalInfo,
      profileImage: user.profileImage // Add profile image to registration response
    }
  });
}));

// @route   POST /api/auth/login
// @desc    Login user - OPTIMIZED
// @access  Public
router.post('/login', [
  // authLimiter, // DISABLED
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('rememberMe').optional().isBoolean().withMessage('Remember me must be a boolean'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  // Security: Never log passwords or sensitive information
  console.log('🔐 Login attempt for email:', email.substring(0, 3) + '***');

  // Optimized user lookup with projection
  const user = await User.findOne({ email })
    .select('+password')
    .lean(); // Use lean() for better performance
  
  if (!user) {
    // Security: Use generic error message to prevent user enumeration
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({ message: 'Account is deactivated' });
  }

  // Check password
  const bcrypt = require('bcryptjs');
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    // Security: Log failed attempt without exposing details
    console.log('⚠️ Failed login attempt for user ID:', user._id);
    // Increment login attempts (optimized update)
    await User.findByIdAndUpdate(user._id, { $inc: { loginAttempts: 1 } });
    
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Optimized updates - use findByIdAndUpdate for better performance
  await User.findByIdAndUpdate(user._id, {
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });

  // Generate token
  const token = generateToken(user._id);

  // Log successful login
  await logLoginActivity(user, req, true);

  // Import secure cookie settings
  const { sessionCookieSettings, rememberMeCookieSettings } = require('../middleware/securityHeaders');
  
  // Set cookie with enhanced security based on remember me preference
  const cookieSettings = rememberMe ? rememberMeCookieSettings : sessionCookieSettings;
  
  res.cookie('token', token, {
    ...cookieSettings,
    // Add additional security headers
    priority: 'high', // High priority cookie
    partitioned: false // Not partitioned for main auth cookie
  });

  res.json({
    message: 'Login successful',
    token: token, // Add token to response for frontend
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      team: user.team,
      teamLeader: user.teamLeader,
      package: user.package,
      phone: user.phone,
      address: user.address,
      emergencyContact: user.emergencyContact,
      medicalInfo: user.medicalInfo,
      employer: user.employer,
      lastLogin: user.lastLogin,
      profileImage: user.profileImage // Add profile image to login response
    }
  });
}));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      role: req.user.role,
      team: req.user.team,
      teamLeader: req.user.teamLeader,
      phone: req.user.phone,
      address: req.user.address,
      employer: req.user.employer,
      isActive: req.user.isActive,
      lastLogin: req.user.lastLogin,
      profileImage: req.user.profileImage,
      emergencyContact: req.user.emergencyContact,
      medicalInfo: req.user.medicalInfo
    }
  });
}));

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
  authMiddleware,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 12 })
    .withMessage('New password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');
  
  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password changed successfully' });
}));

// @route   POST /api/auth/logout
// @desc    Logout user (clear cookie and client-side token removal)
// @access  Private
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  // Log logout activity
  await logLogoutActivity(req.user, req);
  
  // Import secure cookie settings for proper clearing
  const { secureCookieSettings } = require('../middleware/securityHeaders');
  
  // Clear the token cookie with all possible configurations
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  // Also clear any other session cookies that might exist
  res.clearCookie('session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  // Set additional security headers for logout
  res.header('Clear-Site-Data', '"cookies", "storage"');
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  res.json({ 
    message: 'Logout successful',
    timestamp: new Date().toISOString()
  });
}));

// @route   POST /api/auth/verify-password
// @desc    Verify user password for sensitive operations
// @access  Private
router.post('/verify-password', authMiddleware, asyncHandler(async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }
  
  try {
    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (isMatch) {
      res.json({ valid: true, message: 'Password verified successfully' });
    } else {
      res.json({ valid: false, message: 'Invalid password' });
    }
  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({ message: 'Password verification failed' });
  }
}));

module.exports = router;
