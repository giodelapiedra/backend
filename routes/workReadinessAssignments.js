const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/workReadinessAssignmentController');
const { authenticateToken, requireRole } = require('../middleware/authSupabase');
const { adminLimiter } = require('../middleware/rateLimiter');
const { validatePagination } = require('../middleware/validators');
const { validateUUID, handleUUIDValidationErrors } = require('../middleware/uuidValidation');
const { validateAssignmentData } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/work-readiness-assignments
 * @desc    Create work readiness assignments
 * @access  Team Leader, Admin
 */
router.post('/', requireRole('team_leader', 'admin'), validateAssignmentData, assignmentController.createAssignments);

/**
 * @route   GET /api/work-readiness-assignments
 * @desc    Get assignments for team leader
 * @access  Team Leader, Admin
 */
router.get('/', validatePagination, assignmentController.getAssignments);

/**
 * @route   GET /api/work-readiness-assignments/worker
 * @desc    Get assignments for worker
 * @access  Worker
 */
router.get('/worker', validatePagination, assignmentController.getWorkerAssignments);

/**
 * @route   GET /api/work-readiness-assignments/today
 * @desc    Get today's assignment for worker
 * @access  Worker
 */
router.get('/today', assignmentController.getTodayAssignment);

/**
 * @route   GET /api/work-readiness-assignments/can-submit
 * @desc    Check if worker can submit work readiness (has active assignment)
 * @access  Worker
 */
router.get('/can-submit', assignmentController.canSubmitWorkReadiness);

/**
 * @route   GET /api/work-readiness-assignments/stats
 * @desc    Get assignment statistics
 * @access  Team Leader, Admin
 */
router.get('/stats', requireRole('team_leader', 'admin'), validatePagination, assignmentController.getAssignmentStats);

/**
 * @route   GET /api/work-readiness-assignments/unselected
 * @desc    Get unselected workers with reasons
 * @access  Team Leader, Admin, Site Supervisor
 */
router.get('/unselected', requireRole('team_leader', 'admin', 'site_supervisor'), validatePagination, (req, res, next) => {
  console.log('🔍 Route /unselected called');
  next();
}, assignmentController.getUnselectedWorkers);

/**
 * @route   POST /api/work-readiness-assignments/unselected/save
 * @desc    Save unselected worker reason
 * @access  Team Leader, Admin
 */
router.post('/unselected/save', requireRole('team_leader', 'admin'), assignmentController.saveUnselectedWorkerReason);

/**
 * @route   PATCH /api/work-readiness-assignments/unselected/:id/close
 * @desc    Close unselected worker case
 * @access  Team Leader, Admin
 */
router.patch('/unselected/:id/close', validateUUID('id'), handleUUIDValidationErrors, requireRole('team_leader', 'admin'), assignmentController.closeUnselectedWorkerCase);
router.get('/unselected/closed/:workerId', validateUUID('workerId'), handleUUIDValidationErrors, requireRole('team_leader', 'admin'), assignmentController.getClosedUnselectedWorkerCases);
router.get('/unselected/closed-all', requireRole('team_leader', 'admin'), assignmentController.getAllClosedUnselectedWorkerCases);

/**
 * @route   PATCH /api/work-readiness-assignments/:id
 * @desc    Update assignment status
 * @access  Team Leader, Worker (limited), Admin
 */
router.patch('/:id', validateUUID('id'), handleUUIDValidationErrors, assignmentController.updateAssignmentStatus);

/**
 * @route   DELETE /api/work-readiness-assignments/:id
 * @desc    Cancel assignment
 * @access  Team Leader, Admin
 */
router.delete('/:id', validateUUID('id'), handleUUIDValidationErrors, requireRole('team_leader', 'admin'), assignmentController.cancelAssignment);

/**
 * @route   POST /api/work-readiness-assignments/mark-overdue
 * @desc    Mark overdue assignments (Manual marking by team leaders)
 * @access  Admin, Team Leader
 */
router.post('/mark-overdue', adminLimiter, requireRole('admin', 'team_leader'), assignmentController.markOverdueAssignments);

module.exports = router;
