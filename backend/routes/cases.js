const express = require('express');
const { body, query } = require('express-validator');
const { db } = require('../config/supabase');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getMyCases, getCases, getCaseById, createCase, updateCase, assignClinician } = require('../controllers/caseController');
const { 
  handleValidationErrors,
  validatePagination 
} = require('../middleware/validators');

const router = express.Router();

// Middleware to log request details
router.use((req, res, next) => {
  console.log('Case API Request:', {
    method: req.method,
    url: req.url,
    userId: req?.user?._id || req?.user?.id,
    userRole: req?.user?.role
  });
  next();
});

// @route   GET /api/cases/my-cases
// @desc    Get cases assigned to the current user
// @access  Private
router.get('/my-cases', [
  authMiddleware
], asyncHandler(getMyCases));

// @route   GET /api/cases/clinician-cases
// @desc    Get cases assigned to the logged-in clinician
// @access  Private (Clinician only)
router.get('/clinician-cases', [
  authMiddleware,
  roleMiddleware('clinician')
], asyncHandler(async (req, res) => {
  try {
    const clinicianId = req.user._id || req.user.id;
    
    // Find all cases assigned to this clinician
    const assignedCases = await db.cases.findMany(
      { clinician_id: clinicianId },
      {
        orderBy: 'created_at',
        ascending: false
      }
    );
    
    res.json({
      success: true,
      count: assignedCases.length,
      cases: assignedCases
    });
  } catch (error) {
    console.error('Error fetching clinician cases:', error);
    res.status(500).json({ 
      message: 'Error fetching assigned cases',
      error: error.message
    });
  }
}));

// @route   GET /api/cases
// @desc    Get all cases (with filtering and pagination)
// @access  Private
router.get('/', [
  authMiddleware,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('search').optional().isString(),
  handleValidationErrors
], asyncHandler(getCases));

// @route   GET /api/cases/:id
// @desc    Get case by ID
// @access  Private
router.get('/:id', [
  authMiddleware
], asyncHandler(getCaseById));

// @route   POST /api/cases
// @desc    Create new case
// @access  Private (Admin, Case Manager)
router.post('/', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager'),
  body('worker_id').notEmpty().withMessage('Worker ID is required'),
  body('employer_id').notEmpty().withMessage('Employer ID is required'),
  body('incident_id').optional(),
  body('injury_details').optional().isObject(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed']),
  body('clinician_id').optional(),
  handleValidationErrors
], asyncHandler(createCase));

// @route   PUT /api/cases/:id
// @desc    Update case
// @access  Private (Admin, Case Manager, Clinician)
router.put('/:id', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'clinician'),
  handleValidationErrors
], asyncHandler(updateCase));

// @route   PUT /api/cases/:id/assign-clinician
// @desc    Assign clinician to case
// @access  Private (Admin, Case Manager)
router.put('/:id/assign-clinician', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager'),
  body('clinician_id').notEmpty().withMessage('Clinician ID is required'),
  handleValidationErrors
], asyncHandler(assignClinician));

// @route   PUT /api/cases/:id/status
// @desc    Update case status
// @access  Private (Admin, Case Manager, Clinician)
router.put('/:id/status', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'clinician'),
  body('status').isIn(['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed']).withMessage('Valid status is required'),
  body('notes').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  try {
    const caseId = req.params.id;
    const { status, notes } = req.body;
    const userId = req.user._id || req.user.id;

    // Fetch existing case
    const existingCase = await db.cases.findById(caseId);
    if (!existingCase) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Check access
    let hasAccess = false;
    if (req.user.role === 'admin' || req.user.role === 'gp_insurer') {
      hasAccess = true;
    } else if (req.user.role === 'case_manager') {
      hasAccess = existingCase.case_manager_id === userId;
    } else if (req.user.role === 'clinician') {
      hasAccess = existingCase.clinician_id === userId;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update case status
    await db.cases.update(caseId, {
      status,
      updated_at: new Date().toISOString()
    });

    // Fetch updated case
    const updatedCase = await db.cases.findById(caseId);

    res.json({
      message: 'Case status updated successfully',
      case: updatedCase
    });
  } catch (error) {
    console.error('Error updating case status:', error);
    res.status(500).json({ 
      message: 'Error updating case status',
      error: error.message 
    });
  }
}));

// @route   DELETE /api/cases/:id
// @desc    Delete case
// @access  Private (Admin only)
router.delete('/:id', [
  authMiddleware,
  roleMiddleware('admin')
], asyncHandler(async (req, res) => {
  try {
    const caseId = req.params.id;

    // Check if case exists
    const existingCase = await db.cases.findById(caseId);
    if (!existingCase) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // For Supabase, we might want to soft delete or mark as inactive
    await db.cases.update(caseId, {
      is_active: false,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      message: 'Case deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting case:', error);
    res.status(500).json({ 
      message: 'Error deleting case',
      error: error.message 
    });
  }
}));

module.exports = router;

