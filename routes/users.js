const express = require('express');
const { body, query } = require('express-validator');
const fs = require('fs');
const path = require('path');

// Skip MongoDB imports in production
let mongoose, User;
if (process.env.NODE_ENV !== 'production' && process.env.USE_SUPABASE !== 'true') {
  mongoose = require('mongoose');
  User = require('../models/User');
} else {
  console.log('Skipping MongoDB imports in users routes - using Supabase only');
  User = {}; // Empty object for production
}
const { authMiddleware } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/sanitization');
const { uploadSingleUserPhoto } = require('../middleware/upload');
const { 
  lazyPaginationMiddleware, 
  getUsersWithLazyLoad, 
  loadMoreUsers, 
  searchUsersLazy,
  getUserStats 
} = require('../middleware/lazyPagination');
const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    console.log('=== ROLE MIDDLEWARE HIT ===');
    console.log('Route:', req.method, req.path);
    console.log('Required roles:', roles);
    console.log('User role:', req.user?.role);
    
    if (!req.user) {
      console.log('No user in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      console.log('User role not in required roles');
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};
const { handleValidationErrors, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log('Users route request:', req.method, req.path, req.params);
  next();
});

// @route   POST /api/users
// @desc    Create new user (Admin only)
// @access  Private (Admin only)
router.post('/', [
  authMiddleware,
  roleMiddleware('admin'),
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
  body('phone').optional().isString(),
  body('employer').optional().isMongoId(),
  body('specialty').optional().isString(),
  body('licenseNumber').optional().isString(),
  body('team').optional().isString(),
  body('defaultTeam').optional().isString(),
  body('managedTeams').optional().isString(),
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
    specialty,
    licenseNumber,
    address,
    emergencyContact,
    medicalInfo,
    team,
    defaultTeam,
    managedTeams
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

  // Add role-specific fields
  if (role === 'clinician') {
    if (specialty) userData.specialty = specialty;
    if (licenseNumber) userData.licenseNumber = licenseNumber;
  }

  if (role === 'worker' && employer) {
    userData.employer = employer;
  }

  if (role === 'team_leader') {
    // Parse managedTeams if it's a string (from FormData)
    let parsedManagedTeams = managedTeams;
    if (typeof managedTeams === 'string') {
      try {
        parsedManagedTeams = JSON.parse(managedTeams);
      } catch (e) {
        parsedManagedTeams = [managedTeams];
      }
    }
    
    userData.team = team || 'DEFAULT TEAM';
    userData.defaultTeam = defaultTeam || team || 'DEFAULT TEAM';
    userData.managedTeams = parsedManagedTeams || [team || 'DEFAULT TEAM'];
  }

  // Add optional fields
  if (address) userData.address = address;
  if (emergencyContact) userData.emergencyContact = emergencyContact;
  
  // Handle profile image upload
  if (req.file) {
    userData.profileImage = `/uploads/users/${req.file.filename}`;
    console.log('📸 New user profile image saved:', userData.profileImage);
  }
  
  // Set default medicalInfo if not provided
  if (!medicalInfo) {
    userData.medicalInfo = {
      allergies: [],
      medications: [],
      medicalConditions: []
    };
  } else {
    userData.medicalInfo = medicalInfo;
  }
  
  // Set default isAvailable
  userData.isAvailable = true;

  const user = new User(userData);
  await user.save();

  // Return user without password
  const userResponse = user.toObject();
  delete userResponse.password;

  res.status(201).json({
    message: 'User created successfully',
    user: userResponse
  });
}));


// @route   GET /api/users
// @desc    Get all users with lazy loading pagination - OPTIMIZED
// @access  Private (Admin, Case Manager, Site Supervisor, Clinician)
router.get('/', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'site_supervisor', 'clinician'),
  lazyPaginationMiddleware,
  query('role').optional().isIn(['admin', 'worker', 'employer', 'site_supervisor', 'clinician', 'case_manager', 'gp_insurer', 'team_leader']),
  query('search').optional().isString(),
  query('includeTotal').optional().isBoolean(),
  handleValidationErrors
], asyncHandler(getUsersWithLazyLoad));

// @route   GET /api/users/load-more
// @desc    Load more users for infinite scroll
// @access  Private (Admin, Case Manager, Site Supervisor, Clinician)
router.get('/load-more', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'site_supervisor', 'clinician'),
  lazyPaginationMiddleware,
  query('role').optional().isIn(['admin', 'worker', 'employer', 'site_supervisor', 'clinician', 'case_manager', 'gp_insurer', 'team_leader']),
  query('search').optional().isString(),
  handleValidationErrors
], asyncHandler(loadMoreUsers));

// @route   GET /api/users/search
// @desc    Search users with lazy loading
// @access  Private (Admin, Case Manager, Site Supervisor, Clinician)
router.get('/search', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'site_supervisor', 'clinician'),
  query('q').notEmpty().withMessage('Search query is required'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], asyncHandler(searchUsersLazy));

// @route   GET /api/users/stats
// @desc    Get user statistics for dashboard
// @access  Private (Admin, Case Manager, Site Supervisor, Clinician)
router.get('/stats', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'site_supervisor', 'clinician'),
  handleValidationErrors
], asyncHandler(getUserStats));

// @route   GET /api/users/:id
// @desc    Get user by ID - OPTIMIZED
// @access  Private
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  // Use aggregation for better performance and security
  const pipeline = [
    { $match: { _id: mongoose.Types.ObjectId(req.params.id) } },
    {
      $lookup: {
        from: 'users',
        localField: 'employer',
        foreignField: '_id',
        as: 'employerInfo',
        pipeline: [
          { $project: { firstName: 1, lastName: 1, email: 1 } }
        ]
      }
    },
    {
      $addFields: {
        employer: { $arrayElemAt: ['$employerInfo', 0] }
      }
    },
    {
      $project: {
        password: 0,
        employerInfo: 0,
        loginAttempts: 0,
        lockUntil: 0,
        resetPasswordToken: 0,
        resetPasswordExpires: 0,
        emailVerificationToken: 0,
        twoFactorSecret: 0
      }
    }
  ];

  const users = await User.aggregate(pipeline);
  
  if (users.length === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  const user = users[0];

  // Check if user can access this profile
  if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ user });
}));

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Private
router.put('/:id', [
  authMiddleware,
  // Conditional multer middleware - only apply if there's a file
  (req, res, next) => {
    // Check if this is a multipart request
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      return uploadSingleUserPhoto(req, res, next);
    }
    // If not multipart, skip multer
    next();
  },
  // Note: Validation is handled manually in the route handler for form data
], asyncHandler(async (req, res) => {
  // Manual validation for form data
  if (req.body.firstName && req.body.firstName.trim() === '') {
    return res.status(400).json({ message: 'First name cannot be empty' });
  }
  if (req.body.lastName && req.body.lastName.trim() === '') {
    return res.status(400).json({ message: 'Last name cannot be empty' });
  }
  if (req.body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  
  // Sanitize input data to prevent XSS
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/[<>]/g, '');
  };
  
  // Sanitize all string fields
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = sanitizeString(req.body[key]);
    }
  });

  const user = await User.findById(req.params.id);

  if (!user) {
    console.log('User not found with ID:', req.params.id);
    return res.status(404).json({ message: 'User not found' });
  }

  // User found successfully
  console.log('User details:', {
    userIdString: user._id.toString(),
    userEmail: user.email
  });

  // Check permissions - users can only edit their own profiles
  const userIdString = req.user._id.toString();
  const targetIdString = req.params.id;

  if (req.user.role !== 'admin' && userIdString !== targetIdString) {
    return res.status(403).json({ 
      message: 'Access denied. You can only edit your own profile.' 
    });
  }

  try {
    // Only admin can change role and active status
    if (req.user.role !== 'admin') {
      delete req.body.role;
      delete req.body.isActive;
    }

  // Check if email is being changed and if it's already taken
  if (req.body.email && req.body.email !== user.email) {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
  }

  // Only update fields that are provided in the request
  const updateData = {};
  
  // Only include fields that are actually provided
  if (req.body.firstName !== undefined) updateData.firstName = req.body.firstName;
  if (req.body.lastName !== undefined) updateData.lastName = req.body.lastName;
  if (req.body.email !== undefined) updateData.email = req.body.email;
  if (req.body.phone !== undefined) updateData.phone = req.body.phone;
  if (req.body.address !== undefined) updateData.address = req.body.address;
  if (req.body.emergencyContact !== undefined) updateData.emergencyContact = req.body.emergencyContact;
  if (req.body.medicalInfo !== undefined) updateData.medicalInfo = req.body.medicalInfo;
  
  
  // Handle profile image upload
  if (req.file) {
    // Delete old profile image if it exists
    if (user.profileImage) {
      const oldImagePath = path.join(__dirname, '..', user.profileImage);
      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      } catch (error) {
        console.error('❌ Error deleting old profile image:', error);
        // Don't fail the update if we can't delete the old image
      }
    }
    
    updateData.profileImage = `/uploads/users/${req.file.filename}`;
  } else {
    // No new file uploaded, preserve existing profile image
    if (user.profileImage) {
      updateData.profileImage = user.profileImage;
    } else if (req.body.profileImage) {
      // If no existing image but profileImage is provided in request, use it
      updateData.profileImage = req.body.profileImage;
    }
  }
  
  // Handle nested objects properly - parse JSON strings from FormData
  if (req.body.address) {
    try {
      const addressData = typeof req.body.address === 'string' 
        ? JSON.parse(req.body.address) 
        : req.body.address;
      updateData.address = { ...user.address, ...addressData };
    } catch (error) {
      console.error('Error parsing address:', error);
      return res.status(400).json({ message: 'Invalid address format' });
    }
  }
  
  if (req.body.emergencyContact) {
    try {
      const emergencyData = typeof req.body.emergencyContact === 'string' 
        ? JSON.parse(req.body.emergencyContact) 
        : req.body.emergencyContact;
      updateData.emergencyContact = { ...user.emergencyContact, ...emergencyData };
    } catch (error) {
      console.error('Error parsing emergency contact:', error);
      return res.status(400).json({ message: 'Invalid emergency contact format' });
    }
  }
  
  if (req.body.medicalInfo) {
    try {
      const medicalData = typeof req.body.medicalInfo === 'string' 
        ? JSON.parse(req.body.medicalInfo) 
        : req.body.medicalInfo;
      updateData.medicalInfo = { ...user.medicalInfo, ...medicalData };
    } catch (error) {
      console.error('Error parsing medical info:', error);
      return res.status(400).json({ message: 'Invalid medical info format' });
    }
  }


  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  if (!updatedUser) {
    return res.status(404).json({ message: 'User not found after update' });
  }

  // User updated successfully
  res.json({
    message: 'User updated successfully',
    user: {
      id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      address: updatedUser.address,
      emergencyContact: updatedUser.emergencyContact,
      medicalInfo: updatedUser.medicalInfo,
      employer: updatedUser.employer,
      profileImage: updatedUser.profileImage,
      isActive: updatedUser.isActive,
      lastLogin: updatedUser.lastLogin
    }
  });
} catch (error) {
  console.error('Error in profile update:', error);
  res.status(500).json({ 
    message: 'Internal server error', 
    error: error.message 
  });
}
}));

// @route   DELETE /api/users/:id
// @desc    Delete user (soft delete)
// @access  Private (Admin only)
router.delete('/:id', [
  authMiddleware,
  roleMiddleware('admin')
], asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Soft delete by deactivating
  user.isActive = false;
  await user.save();

  res.json({ message: 'User deactivated successfully' });
}));

// @route   GET /api/users/role/:role
// @desc    Get users by role
// @access  Private
router.get('/role/:role', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'clinician', 'employer')
], asyncHandler(async (req, res) => {
  const { role } = req.params;
  
  const users = await User.find({ role, isActive: true })
    .select('firstName lastName email phone')
    .sort({ firstName: 1 });

  res.json({ users });
}));

// @route   POST /api/users/:id/assign-employer
// @desc    Assign employer to worker
// @access  Private (Admin, Case Manager)
router.post('/:id/assign-employer', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager'),
  body('employerId').isMongoId().withMessage('Valid employer ID is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { employerId } = req.body;
  
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.role !== 'worker') {
    return res.status(400).json({ message: 'Can only assign employer to workers' });
  }

  const employer = await User.findById(employerId);
  if (!employer || employer.role !== 'employer') {
    return res.status(400).json({ message: 'Invalid employer' });
  }

  user.employer = employerId;
  await user.save();

  res.json({ message: 'Employer assigned successfully' });
}));

// @route   GET /api/users/clinicians/available
// @desc    Get all available clinicians
// @access  Private (Case Manager, Admin)
router.get('/clinicians/available', [
  authMiddleware,
  roleMiddleware('case_manager', 'admin'),
], asyncHandler(async (req, res) => {
  try {
    console.log('Fetching available clinicians...');
    const clinicians = await User.find({ 
      role: 'clinician',
      isActive: true
    })
    .select('firstName lastName email phone specialty licenseNumber isActive')
    .sort({ firstName: 1 });

    console.log(`Found ${clinicians.length} available clinicians`);
    
    res.json({ 
      clinicians: clinicians.map(c => ({
        _id: c._id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        specialty: c.specialty,
        licenseNumber: c.licenseNumber,
        isActive: c.isActive
      }))
    });
  } catch (error) {
    console.error('Error fetching clinicians:', error);
    res.status(500).json({ message: 'Error fetching clinicians', error: error.message });
  }
}));

// @route   PUT /api/users/:id/admin
// @desc    Update user (Admin only)
// @access  Private (Admin only)
router.put('/:id/admin', [
  authMiddleware,
  roleMiddleware('admin'),
  // Conditional multer middleware - only apply if there's a file
  (req, res, next) => {
    // Check if this is a multipart request
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      return uploadSingleUserPhoto(req, res, next);
    }
    // If not multipart, skip multer
    next();
  },
  // Note: Validation is handled manually in the route handler for form data
], asyncHandler(async (req, res) => {
  console.log('=== ADMIN ROUTE HIT ===');
  console.log('Admin route - user role:', req.user.role);
  console.log('Update data:', req.body);
  console.log('Has file:', !!req.file);
  
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Check if email is being changed and if it's already taken
  if (req.body.email && req.body.email !== user.email) {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
  }

  // Update user fields - only update fields that are provided
  const allowedFields = ['firstName', 'lastName', 'email', 'role', 'phone', 'isActive', 'specialty', 'licenseNumber', 'address', 'emergencyContact', 'medicalInfo'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  // Handle profile image upload
  if (req.file) {
    // Delete old profile image if it exists
    if (user.profileImage) {
      const oldImagePath = path.join(__dirname, '..', user.profileImage);
      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log('🗑️ Admin deleted old profile image:', oldImagePath);
        }
      } catch (error) {
        console.error('❌ Error deleting old profile image:', error);
        // Don't fail the update if we can't delete the old image
      }
    }
    
    user.profileImage = `/uploads/users/${req.file.filename}`;
    console.log('📸 Admin saved new profile image:', user.profileImage);
  } else {
    // No new file uploaded, preserve existing profile image
    if (user.profileImage) {
      console.log('📸 Admin preserving existing profile image:', user.profileImage);
    }
  }

  // Handle password update if provided
  if (req.body.password && req.body.password.trim()) {
    // Hash the password before storing
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(req.body.password, salt);
  }

  await user.save();

  // Return updated user without password
  const userResponse = user.toObject();
  delete userResponse.password;

  res.json({
    message: 'User updated successfully',
    user: userResponse
  });
}));

module.exports = router;
