const express = require('express');
const { body, query } = require('express-validator');
const RehabPlan = require('../models/RehabPlan');
const RehabilitationPlan = require('../models/RehabilitationPlan');
const Case = require('../models/Case');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { handleValidationErrors, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @route   GET /api/rehab-plans
// @desc    Get rehabilitation plans
// @access  Private
router.get('/', [
  authMiddleware,
  query('case').optional().isMongoId(),
  query('status').optional().isIn(['active', 'completed', 'paused', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const filter = {};
  
  // Role-based filtering
  if (req.user.role === 'worker') {
    // Workers can see plans for their cases
    const cases = await Case.find({ worker: req.user._id }).select('_id');
    filter.case = { $in: cases.map(c => c._id) };
  } else if (req.user.role === 'clinician') {
    // Clinicians can see plans they created
    filter.clinician = req.user._id;
  }
  
  if (req.query.case) {
    filter.case = req.query.case;
  }
  
  if (req.query.status) {
    filter.status = req.query.status;
  }

  // Fetch from both models
  const [rehabPlans, rehabilitationPlans] = await Promise.all([
    RehabPlan.find(filter)
      .populate('case', 'caseNumber status worker')
      .populate('clinician', 'firstName lastName email')
      .populate('case.worker', 'firstName lastName email')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit),
    RehabilitationPlan.find(filter)
      .populate('case', 'caseNumber status worker')
      .populate('worker', 'firstName lastName email')
      .populate('clinician', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
  ]);
  
  const allPlans = [...rehabPlans, ...rehabilitationPlans];
  const total = await Promise.all([
    RehabPlan.countDocuments(filter),
    RehabilitationPlan.countDocuments(filter)
  ]).then(([rehabCount, rehabilitationCount]) => rehabCount + rehabilitationCount);

  res.json({
    rehabPlans: allPlans,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

// @route   GET /api/rehab-plans/:id
// @desc    Get rehabilitation plan by ID
// @access  Private
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const rehabPlan = await RehabPlan.findById(req.params.id)
    .populate('case', 'caseNumber status worker')
    .populate('clinician', 'firstName lastName email')
    .populate('case.worker', 'firstName lastName email')
    .populate('modifications.modifiedBy', 'firstName lastName role');

  if (!rehabPlan) {
    return res.status(404).json({ message: 'Rehabilitation plan not found' });
  }

  // Check access permissions
  const hasAccess = 
    req.user.role === 'admin' ||
    rehabPlan.case.worker._id.toString() === req.user._id.toString() ||
    rehabPlan.clinician._id.toString() === req.user._id.toString() ||
    (req.user.role === 'case_manager' && rehabPlan.case.caseManager?.toString() === req.user._id.toString());

  if (!hasAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ rehabPlan });
}));

// @route   POST /api/rehab-plans
// @desc    Create new rehabilitation plan
// @access  Private (Clinician, Case Manager)
router.post('/', [
  authMiddleware,
  roleMiddleware('clinician', 'case_manager'),
  body('case').isMongoId().withMessage('Valid case ID is required'),
  body('planName').notEmpty().withMessage('Plan name is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601(),
  body('goals').optional().isArray(),
  body('exercises').optional().isArray(),
  body('activities').optional().isArray(),
  body('workSimulation').optional().isArray(),
  body('education').optional().isArray(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { case: caseId, ...planData } = req.body;

  // Verify case exists
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Check if plan already exists for this case
  const existingPlan = await RehabPlan.findOne({ 
    case: caseId, 
    status: { $in: ['active', 'paused'] } 
  });

  if (existingPlan) {
    return res.status(400).json({ message: 'Active rehabilitation plan already exists for this case' });
  }

  const rehabPlan = new RehabPlan({
    case: caseId,
    clinician: req.user._id,
    ...planData
  });

  await rehabPlan.save();

  // Populate the created plan
  await rehabPlan.populate([
    { path: 'case', select: 'caseNumber status worker' },
    { path: 'clinician', select: 'firstName lastName email' }
  ]);

  res.status(201).json({
    message: 'Rehabilitation plan created successfully',
    rehabPlan
  });
}));

// @route   PUT /api/rehab-plans/:id
// @desc    Update rehabilitation plan
// @access  Private (Clinician, Case Manager)
router.put('/:id', [
  authMiddleware,
  body('status').optional().isIn(['active', 'completed', 'paused', 'cancelled']),
  body('goals').optional().isArray(),
  body('exercises').optional().isArray(),
  body('activities').optional().isArray(),
  body('notes').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const rehabPlan = await RehabPlan.findById(req.params.id);

  if (!rehabPlan) {
    return res.status(404).json({ message: 'Rehabilitation plan not found' });
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'admin' ||
    rehabPlan.clinician._id.toString() === req.user._id.toString() ||
    req.user.role === 'case_manager';

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Add modification record
  if (Object.keys(req.body).length > 0) {
    rehabPlan.modifications.push({
      date: new Date(),
      type: 'update',
      description: 'Plan updated',
      reason: 'Manual update',
      modifiedBy: req.user._id
    });
  }

  Object.assign(rehabPlan, req.body);
  await rehabPlan.save();

  res.json({
    message: 'Rehabilitation plan updated successfully',
    rehabPlan
  });
}));

// @route   POST /api/rehab-plans/:id/progress
// @desc    Add progress tracking data
// @access  Private (Worker, Clinician)
router.post('/:id/progress', [
  authMiddleware,
  body('type').isIn(['painLevel', 'functionalImprovement', 'workReadiness']).withMessage('Valid progress type is required'),
  body('area').optional().isString(),
  body('level').optional().isInt({ min: 0, max: 10 }),
  body('improvement').optional().isInt({ min: 0, max: 100 }),
  body('score').optional().isInt({ min: 0, max: 100 }),
  body('notes').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const rehabPlan = await RehabPlan.findById(req.params.id);

  if (!rehabPlan) {
    return res.status(404).json({ message: 'Rehabilitation plan not found' });
  }

  // Check access permissions
  const hasAccess = 
    req.user.role === 'admin' ||
    rehabPlan.case.worker._id.toString() === req.user._id.toString() ||
    rehabPlan.clinician._id.toString() === req.user._id.toString();

  if (!hasAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const progressData = {
    date: new Date(),
    ...req.body
  };

  // Add to appropriate progress tracking array
  if (req.body.type === 'painLevel') {
    rehabPlan.progressTracking.painLevel.push(progressData);
  } else if (req.body.type === 'functionalImprovement') {
    rehabPlan.progressTracking.functionalImprovement.push(progressData);
  } else if (req.body.type === 'workReadiness') {
    rehabPlan.progressTracking.workReadiness.push(progressData);
  }

  await rehabPlan.save();

  res.json({
    message: 'Progress data added successfully',
    rehabPlan
  });
}));

// @route   GET /api/rehab-plans/dashboard/stats
// @desc    Get rehabilitation plan statistics for dashboard
// @access  Private
router.get('/dashboard/stats', authMiddleware, asyncHandler(async (req, res) => {
  const filter = {};
  
  if (req.user.role === 'worker') {
    const cases = await Case.find({ worker: req.user._id }).select('_id');
    filter.case = { $in: cases.map(c => c._id) };
  } else if (req.user.role === 'clinician') {
    filter.clinician = req.user._id;
  }

  // Query both RehabPlan and RehabilitationPlan models
  const [activeRehabPlans, activeRehabilitationPlans] = await Promise.all([
    RehabPlan.find({ ...filter, status: 'active' }),
    RehabilitationPlan.find({ ...filter, status: 'active' })
  ]);
  
  const [completedRehabPlans, completedRehabilitationPlans] = await Promise.all([
    RehabPlan.find({ ...filter, status: 'completed' }),
    RehabilitationPlan.find({ ...filter, status: 'completed' })
  ]);
  
  const activePlans = [...activeRehabPlans, ...activeRehabilitationPlans];
  const completedPlans = [...completedRehabPlans, ...completedRehabilitationPlans];

  const totalGoals = activePlans.reduce((sum, plan) => sum + (plan.goals?.length || 0), 0);
  const completedGoals = activePlans.reduce((sum, plan) => 
    sum + (plan.goals?.filter(goal => goal.status === 'completed').length || 0), 0
  );

  const totalExercises = activePlans.reduce((sum, plan) => sum + (plan.exercises?.length || 0), 0);
  const completedExercises = activePlans.reduce((sum, plan) => 
    sum + (plan.exercises?.filter(exercise => exercise.status === 'completed').length || 0), 0
  );

  // Get active cases count
  const activeCases = await Case.find({ 
    ...filter, 
    status: { $in: ['new', 'triaged', 'assessed', 'in_rehab'] } 
  }).countDocuments();

  // Get upcoming appointments (placeholder - you might want to implement this properly)
  const upcomingAppointments = 0; // This would need to be implemented based on your appointments system

  res.json({
    activePlans: activePlans.length,
    completedPlans: completedPlans.length,
    totalGoals,
    completedGoals,
    goalCompletionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
    totalExercises,
    completedExercises,
    exerciseCompletionRate: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0,
    activeCases,
    upcomingAppointments
  });
}));

module.exports = router;