const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const {
  submitWorkReadiness,
  getTeamWorkReadiness,
  getWorkReadinessHistory,
  followUpWorker,
  checkTodaySubmission,
  getAssessmentLogs
} = require('../controllers/workReadinessController');

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

// Submit Work Readiness Assessment (Worker)
router.post('/submit', authMiddleware, [
  body('fatigueLevel').isInt({ min: 1, max: 5 }).withMessage('Fatigue level must be between 1 and 5'),
  body('painDiscomfort').isIn(['yes', 'no']).withMessage('Pain/discomfort must be yes or no'),
  body('painAreas').optional().isArray().withMessage('Pain areas must be an array'),
  body('readinessLevel').isIn(['fit', 'minor', 'not_fit']).withMessage('Invalid readiness level'),
  body('mood').isIn(['excellent', 'good', 'okay', 'poor', 'terrible']).withMessage('Invalid mood'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors
], asyncHandler(submitWorkReadiness));

// Get Team Work Readiness Data (Team Leader)
router.get('/team', authMiddleware, asyncHandler(getTeamWorkReadiness));

// Check if worker has already submitted today's assessment (Worker)
router.get('/check-today', authMiddleware, asyncHandler(checkTodaySubmission));

// Get Work Readiness History (Team Leader)
router.get('/team/history', authMiddleware, asyncHandler(getWorkReadinessHistory));

// Follow up with non-compliant worker (Team Leader)
router.post('/followup', authMiddleware, [
  body('workerId').isMongoId().withMessage('Valid worker ID is required'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  body('message').optional().isString().withMessage('Message must be a string'),
  handleValidationErrors
], asyncHandler(followUpWorker));

// Get Assessment Logs with Advanced Filtering (Team Leader)
router.get('/logs', authMiddleware, asyncHandler(getAssessmentLogs));

module.exports = router;
