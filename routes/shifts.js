const express = require('express');
const router = express.Router();
const {
  getShiftTypes,
  getTeamLeadersWithShifts,
  assignShiftToTeamLeader,
  getShiftHistory,
  updateShiftAssignment,
  deactivateShiftAssignment,
  getShiftStatistics
} = require('../controllers/shiftManagementController');
const { authenticateToken, requireRole } = require('../middleware/authSupabase');

// Test endpoint to debug authentication
router.get('/test-auth', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication successful',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Apply authentication middleware to all routes
router.use(authenticateToken);

// @route   GET /api/shifts/types
// @desc    Get all shift types
// @access  Private (All authenticated users)
router.get('/types', getShiftTypes);

// @route   GET /api/shifts/team-leaders
// @desc    Get all team leaders with their current shifts
// @access  Private (Site supervisors only)
router.get('/team-leaders', requireRole('site_supervisor'), getTeamLeadersWithShifts);

// @route   POST /api/shifts/assign
// @desc    Assign shift to team leader
// @access  Private (Site supervisors only)
router.post('/assign', requireRole('site_supervisor'), assignShiftToTeamLeader);

// @route   GET /api/shifts/history/:teamLeaderId
// @desc    Get shift history for a team leader
// @access  Private (Site supervisors and team leader themselves)
router.get('/history/:teamLeaderId', getShiftHistory);

// @route   PUT /api/shifts/:shiftId
// @desc    Update shift assignment
// @access  Private (Site supervisors only)
router.put('/:shiftId', requireRole('site_supervisor'), updateShiftAssignment);

// @route   DELETE /api/shifts/:shiftId
// @desc    Deactivate shift assignment
// @access  Private (Site supervisors only)
router.delete('/:shiftId', requireRole('site_supervisor'), deactivateShiftAssignment);

// @route   GET /api/shifts/statistics
// @desc    Get shift statistics for site supervisor dashboard
// @access  Private (Site supervisors only)
router.get('/statistics', requireRole('site_supervisor'), getShiftStatistics);

module.exports = router;
