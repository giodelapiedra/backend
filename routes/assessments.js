const express = require('express');
const { body, query } = require('express-validator');
const Assessment = require('../models/Assessment');
const Case = require('../models/Case');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { handleValidationErrors, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @route   GET /api/assessments
// @desc    Get assessments
// @access  Private
router.get('/', [
  authMiddleware,
  query('case').optional().isMongoId(),
  query('clinician').optional().isMongoId(),
  query('assessmentType').optional().isIn(['initial', 'follow_up', 'discharge', 'return_to_work']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const filter = {};
  
  // Role-based filtering
  if (req.user.role === 'clinician') {
    filter.clinician = req.user._id;
  } else if (req.user.role === 'worker') {
    // Workers can see assessments for their cases
    const cases = await Case.find({ worker: req.user._id }).select('_id');
    filter.case = { $in: cases.map(c => c._id) };
  }
  
  if (req.query.case) {
    filter.case = req.query.case;
  }
  
  if (req.query.clinician) {
    filter.clinician = req.query.clinician;
  }
  
  if (req.query.assessmentType) {
    filter.assessmentType = req.query.assessmentType;
  }

  const assessments = await Assessment.find(filter)
    .populate('case', 'caseNumber status worker')
    .populate('clinician', 'firstName lastName email')
    .populate('case.worker', 'firstName lastName email')
    .sort({ assessmentDate: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Assessment.countDocuments(filter);

  res.json({
    assessments,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

// @route   GET /api/assessments/:id
// @desc    Get assessment by ID
// @access  Private
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id)
    .populate('case', 'caseNumber status worker')
    .populate('clinician', 'firstName lastName email')
    .populate('case.worker', 'firstName lastName email');

  if (!assessment) {
    return res.status(404).json({ message: 'Assessment not found' });
  }

  // Check access permissions
  const hasAccess = 
    req.user.role === 'admin' ||
    assessment.case.worker._id.toString() === req.user._id.toString() ||
    assessment.clinician._id.toString() === req.user._id.toString() ||
    (req.user.role === 'case_manager' && assessment.case.caseManager?.toString() === req.user._id.toString());

  if (!hasAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ assessment });
}));

// @route   POST /api/assessments
// @desc    Create new assessment
// @access  Private (Clinician, Case Manager)
router.post('/', [
  authMiddleware,
  roleMiddleware('clinician', 'case_manager'),
  body('case').isMongoId().withMessage('Valid case ID is required'),
  body('assessmentType').isIn(['initial', 'follow_up', 'discharge', 'return_to_work']).withMessage('Valid assessment type is required'),
  body('painAssessment.currentPain.level').optional().isInt({ min: 0, max: 10 }),
  body('workCapacity.currentCapacity').optional().isIn(['no_work', 'light_duty', 'modified_duty', 'full_duty']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { case: caseId, ...assessmentData } = req.body;

  // Verify case exists
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  const assessment = new Assessment({
    case: caseId,
    clinician: req.user._id,
    ...assessmentData
  });

  await assessment.save();

  // Populate the created assessment
  await assessment.populate([
    { path: 'case', select: 'caseNumber status worker' },
    { path: 'clinician', select: 'firstName lastName email' }
  ]);

  res.status(201).json({
    message: 'Assessment created successfully',
    assessment
  });
}));

// @route   PUT /api/assessments/:id
// @desc    Update assessment
// @access  Private (Clinician, Case Manager)
router.put('/:id', [
  authMiddleware,
  body('painAssessment.currentPain.level').optional().isInt({ min: 0, max: 10 }),
  body('workCapacity.currentCapacity').optional().isIn(['no_work', 'light_duty', 'modified_duty', 'full_duty']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id);

  if (!assessment) {
    return res.status(404).json({ message: 'Assessment not found' });
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'admin' ||
    assessment.clinician._id.toString() === req.user._id.toString() ||
    req.user.role === 'case_manager';

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  Object.assign(assessment, req.body);
  await assessment.save();

  res.json({
    message: 'Assessment updated successfully',
    assessment
  });
}));

// @route   GET /api/assessments/dashboard/stats
// @desc    Get assessment statistics for dashboard
// @access  Private
router.get('/dashboard/stats', authMiddleware, asyncHandler(async (req, res) => {
  const filter = {};
  
  if (req.user.role === 'clinician') {
    filter.clinician = req.user._id;
  } else if (req.user.role === 'worker') {
    const cases = await Case.find({ worker: req.user._id }).select('_id');
    filter.case = { $in: cases.map(c => c._id) };
  }

  const totalAssessments = await Assessment.countDocuments(filter);
  const initialAssessments = await Assessment.countDocuments({ ...filter, assessmentType: 'initial' });
  const followUpAssessments = await Assessment.countDocuments({ ...filter, assessmentType: 'follow_up' });
  const dischargeAssessments = await Assessment.countDocuments({ ...filter, assessmentType: 'discharge' });
  const returnToWorkAssessments = await Assessment.countDocuments({ ...filter, assessmentType: 'return_to_work' });

  // Get recent assessments
  const recentAssessments = await Assessment.find(filter)
    .populate('case', 'caseNumber worker')
    .populate('case.worker', 'firstName lastName')
    .sort({ assessmentDate: -1 })
    .limit(5);

  res.json({
    totalAssessments,
    initialAssessments,
    followUpAssessments,
    dischargeAssessments,
    returnToWorkAssessments,
    recentAssessments
  });
}));

module.exports = router;