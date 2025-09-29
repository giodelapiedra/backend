const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { cache } = require('../middleware/cache');
const rateLimit = require('express-rate-limit');
const { 
  getDashboard, 
  getTeamMembers, 
  getTeams, 
  createTeam, 
  setDefaultTeam, 
  createUser, 
  updateTeamMember, 
  getTeamLoginActivity, 
  getAnalytics, 
  getAllTeamLeadersForSupervisor,
  getTeamList 
} = require('../controllers/teamLeaderController');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// @route   GET /api/team-leader/dashboard
// @desc    Get team leader dashboard analytics (with caching)
// @access  Private (Team Leader)
router.get('/dashboard', authMiddleware, asyncHandler(async (req, res) => {
  // Verify user is team leader
  if (req.user.role !== 'team_leader') {
    return res.status(403).json({ message: 'Access denied. Team leader role required.' });
  }

  try {
    // Check cache first
    const cacheKey = `team-leader-dashboard-${req.user._id}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        message: 'Team leader dashboard data retrieved successfully (cached)',
        data: cachedData
      });
    }

    // Get dashboard data from controller
    await getDashboard(req, res);
    
    // Cache the result for 5 minutes
    cache.set(cacheKey, res.locals.dashboardData, 300);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
}));

// @route   GET /api/team-leader/team-members
// @desc    Get team members with pagination and search
// @access  Private (Team Leader)
router.get('/team-members', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.role !== 'team_leader') {
    return res.status(403).json({ message: 'Access denied. Team leader role required.' });
  }
  
  await getTeamMembers(req, res);
}));

// @route   GET /api/team-leader/teams
// @desc    Get teams managed by this team leader
// @access  Private (Team Leader)
router.get('/teams', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.role !== 'team_leader') {
    return res.status(403).json({ message: 'Access denied. Team leader role required.' });
  }
  
  await getTeams(req, res);
}));

// @route   POST /api/team-leader/teams
// @desc    Create a new team
// @access  Private (Team Leader)
router.post('/teams', [
  authMiddleware,
  body('teamName').trim().notEmpty().withMessage('Team name is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  if (req.user.role !== 'team_leader') {
    return res.status(403).json({ message: 'Access denied. Team leader role required.' });
  }
  
  await createTeam(req, res);
}));

// @route   PUT /api/team-leader/teams/default
// @desc    Set default team
// @access  Private (Team Leader)
router.put('/teams/default', [
  authMiddleware,
  body('teamName').trim().notEmpty().withMessage('Team name is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  if (req.user.role !== 'team_leader') {
    return res.status(403).json({ message: 'Access denied. Team leader role required.' });
  }
  
  await setDefaultTeam(req, res);
}));

// @route   POST /api/team-leader/create-user
// @desc    Create new worker user (restricted to workers only)
// @access  Private (Team Leader)
router.post('/create-user', [
  authMiddleware,
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('phone').optional().isString(),
  body('team').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  if (req.user.role !== 'team_leader') {
    return res.status(403).json({ message: 'Access denied. Team leader role required.' });
  }
  
  await createUser(req, res);
}));

// @route   PUT /api/team-leader/team-members/:id
// @desc    Update team member information
// @access  Private (Team Leader)
router.put('/team-members/:id', [
  authMiddleware,
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('email').optional().isEmail(),
  body('phone').optional().trim(),
  body('team').optional().trim(),
  body('isActive').optional().isBoolean(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  if (req.user.role !== 'team_leader') {
    return res.status(403).json({ message: 'Access denied. Team leader role required.' });
  }
  
  await updateTeamMember(req, res);
}));

// @route   GET /api/team-leader/team-login-activity
// @desc    Get team member login activity
// @access  Private (Team Leader)
router.get('/team-login-activity', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.role !== 'team_leader') {
    return res.status(403).json({ message: 'Access denied. Team leader role required.' });
  }
  
  await getTeamLoginActivity(req, res);
}));

// @route   DELETE /api/team-leader/team-members/:id
// @desc    Remove team member (deactivate)
// @access  Private (Team Leader)
router.delete('/team-members/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.role !== 'team_leader') {
    return res.status(403).json({ message: 'Access denied. Team leader role required.' });
  }
  
  try {
    const { id } = req.params;
    
    // Find the team member
    const teamMember = await User.findById(id);
    if (!teamMember) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    
    // Check if the team member belongs to this team leader
    if (teamMember.teamLeader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only manage your own team members.' });
    }
    
    // Deactivate the team member instead of deleting
    teamMember.isActive = false;
    await teamMember.save();
    
    res.json({ 
      message: 'Team member removed successfully',
      teamMember: {
        id: teamMember._id,
        firstName: teamMember.firstName,
        lastName: teamMember.lastName,
        email: teamMember.email,
        isActive: teamMember.isActive
      }
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ message: 'Server error while removing team member' });
  }
}));

// @route   POST /api/team-leader/send-invite/:id
// @desc    Send invitation to inactive team member
// @access  Private (Team Leader)
router.post('/send-invite/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.role !== 'team_leader') {
    return res.status(403).json({ message: 'Access denied. Team leader role required.' });
  }
  
  try {
    const { id } = req.params;
    
    // Find the team member
    const teamMember = await User.findById(id);
    if (!teamMember) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    
    // Check if the team member belongs to this team leader
    if (teamMember.teamLeader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only manage your own team members.' });
    }
    
    // Reactivate the team member
    teamMember.isActive = true;
    await teamMember.save();
    
    // TODO: Send actual email invitation here
    // For now, we'll just reactivate the account
    
    res.json({ 
      message: 'Invitation sent successfully',
      teamMember: {
        id: teamMember._id,
        firstName: teamMember.firstName,
        lastName: teamMember.lastName,
        email: teamMember.email,
        isActive: teamMember.isActive
      }
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ message: 'Server error while sending invitation' });
  }
}));

// @route   GET /api/team-leader/analytics
// @desc    Get team leader analytics data
// @access  Private (Team Leader)
router.get('/analytics', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.role !== 'team_leader') {
    return res.status(403).json({ message: 'Access denied. Team leader role required.' });
  }
  
  await getAnalytics(req, res);
}));

// @route   GET /api/team-leader/supervisor-overview
// @desc    Get all team leaders and their members for supervisor monitoring
// @access  Private (Site Supervisor)
router.get('/supervisor-overview', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.role !== 'site_supervisor') {
    return res.status(403).json({ message: 'Access denied. Site supervisor role required.' });
  }

  await getAllTeamLeadersForSupervisor(req, res);
}));

// Rate limiting for team endpoints
const teamListLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    message: 'Too many team list requests. Please try again later.',
    retryAfter: Math.ceil(15 * 60 * 1000 / 1000), // Convert to seconds
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit exceeded for team list by IP ${req.ip} for user ${req.user?.id}`);
    res.status(429).json({
      message: 'Too many team list requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
});

// Input validation for team selection
const validateTeamSelection = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(`[SECURITY] Invalid team selection request from user ${req.user?.id}:`, errors.array());
    return res.status(400).json({
      message: 'Invalid request parameters',
      errors: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
});

router.get('/teams-list', 
  teamListLimiter,
  authMiddleware, 
  validateTeamSelection,
  asyncHandler(async (req, res) => {
    // Enhanced security check
    if (!req.user || req.user.role !== 'site_supervisor') {
      console.warn(`[SECURITY] Unauthorized team list access by user ${req.user?.id || 'anonymous'} with role ${req.user?.role || 'none'}`);
      return res.status(403).json({ 
        message: 'Access denied. Site supervisor role required.',
        code: 'ACCESS_DENIED',
        timestamp: new Date().toISOString()
      });
    }

    // Additional user validation
    if (!req.user.isActive) {
      console.warn(`[SECURITY] Inactive user ${req.user.id} attempting team list access`);
      return res.status(403).json({ 
        message: 'Account is inactive.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    await getTeamList(req, res);
  })
);

module.exports = router;