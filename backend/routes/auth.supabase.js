const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const { supabase, db } = require('../config/supabase');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadSingleUserPhoto } = require('../middleware/upload');
const { logLoginActivity, logLogoutActivity } = require('../middleware/authLogger');
const { 
  validateLogin,
  validateRegister,
  validatePassword,
  handleValidationErrors 
} = require('../middleware/validators');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  uploadSingleUserPhoto,
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),
  body('role').isIn(['admin', 'worker', 'employer', 'site_supervisor', 'clinician', 'case_manager', 'gp_insurer', 'team_leader'])
    .withMessage('Valid role is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
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
    medicalInfo,
    team,
    defaultTeam,
    managedTeams
  } = req.body;

  // Check if user already exists
  const existingUser = await db.users.findByEmail(email);
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists with this email' });
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user data
  const userData = {
    first_name: firstName,
    last_name: lastName,
    email,
    password_hash: passwordHash,
    role,
    phone,
    address: address || {},
    emergency_contact: emergencyContact || {},
    medical_info: medicalInfo || {},
    is_active: true
  };

  // Add team-specific fields for team leaders
  if (role === 'team_leader') {
    userData.team = team || 'DEFAULT TEAM';
    userData.default_team = defaultTeam || team || 'DEFAULT TEAM';
    userData.managed_teams = managedTeams || [team || 'DEFAULT TEAM'];
  }

  // Add employer for workers
  if (role === 'worker' && employer) {
    userData.employer_id = employer;
  }

  // Handle profile image upload
  if (req.file) {
    userData.profile_image = `/uploads/users/${req.file.filename}`;
  }

  // Create user in Supabase
  const user = await db.users.create(userData);

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: role
    }
  });

  if (authError) {
    console.error('Auth user creation error:', authError);
    // Continue without auth user for now
  }

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      team: user.team,
      phone: user.phone,
      address: user.address,
      emergencyContact: user.emergency_contact,
      medicalInfo: user.medical_info,
      profileImage: user.profile_image
    }
  });
}));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('rememberMe').optional().isBoolean().withMessage('Remember me must be a boolean'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  console.log('🔐 Login attempt for email:', email.substring(0, 3) + '***');

  // Find user by email
  const user = await db.users.findByEmail(email);
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Check if user is active
  if (!user.is_active) {
    return res.status(401).json({ message: 'Account is deactivated' });
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  
  if (!isMatch) {
    console.log('⚠️ Failed login attempt for user ID:', user.id);
    // Increment login attempts
    await db.users.update(user.id, { 
      login_attempts: (user.login_attempts || 0) + 1 
    });
    
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Reset login attempts (remove last_login since column doesn't exist)
  await db.users.update(user.id, {
    login_attempts: 0,
    lock_until: null
    // Note: last_login column doesn't exist, so we removed it
  });

  // Log successful login
  await logLoginActivity(user, req, true);

  // Generate JWT token (you can also use Supabase JWT)
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });

  // Set secure cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 days or 1 day
  });

  res.json({
    message: 'Login successful',
    token: token,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      team: user.team,
      phone: user.phone,
      address: user.address,
      emergencyContact: user.emergency_contact,
      medicalInfo: user.medical_info,
      employer: user.employer_id,
      // Note: lastLogin removed since column doesn't exist
      profileImage: user.profile_image
    }
  });
}));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', asyncHandler(async (req, res) => {
  // This middleware should be updated to work with Supabase
  const user = req.user; // Assuming auth middleware sets this
  
  res.json({
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      team: user.team,
      phone: user.phone,
      address: user.address,
      employer: user.employer_id,
      isActive: user.is_active,
      // Note: lastLogin removed since column doesn't exist
      profileImage: user.profile_image,
      emergencyContact: user.emergency_contact,
      medicalInfo: user.medical_info
    }
  });
}));

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 12 })
    .withMessage('New password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user;

  // Get user with password hash
  const userWithPassword = await db.users.findById(user.id);
  
  // Check current password
  const isMatch = await bcrypt.compare(currentPassword, userWithPassword.password_hash);
  if (!isMatch) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }

  // Hash new password
  const salt = await bcrypt.genSalt(12);
  const newPasswordHash = await bcrypt.hash(newPassword, salt);

  // Update password
  await db.users.update(user.id, { password_hash: newPasswordHash });

  res.json({ message: 'Password changed successfully' });
}));

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', asyncHandler(async (req, res) => {
  // Log logout activity
  await logLogoutActivity(req.user, req);
  
  // Clear the token cookie
  res.clearCookie('token', {
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
router.post('/verify-password', asyncHandler(async (req, res) => {
  const { password } = req.body;
  const user = req.user;
  
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }
  
  try {
    // Get user with password hash
    const userWithPassword = await db.users.findById(user.id);
    
    if (!userWithPassword) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, userWithPassword.password_hash);
    
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
