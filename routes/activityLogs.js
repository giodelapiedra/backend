const express = require('express');
const { body, query } = require('express-validator');
const ActivityLog = require('../models/ActivityLog');
const Case = require('../models/Case');
const User = require('../models/User');
const RehabilitationPlan = require('../models/RehabilitationPlan');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { handleValidationErrors, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @route   GET /api/activity-logs
// @desc    Get activity logs for clinician
// @access  Private (Clinician, Case Manager, Admin)
router.get('/', [
  authMiddleware,
  roleMiddleware('clinician', 'case_manager', 'admin'),
  query('case').optional().isMongoId(),
  query('worker').optional().isMongoId(),
  query('activityType').optional().isString(),
  query('isReviewed').optional().isBoolean(),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const options = {
    caseId: req.query.case,
    workerId: req.query.worker,
    activityType: req.query.activityType,
    isReviewed: req.query.isReviewed,
    priority: req.query.priority,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    limit: limit
  };

  // Role-based filtering
  if (req.user.role === 'clinician') {
    // Clinicians can only see logs for their cases
    const cases = await Case.find({ clinician: req.user._id }).select('_id');
    options.caseId = options.caseId || { $in: cases.map(c => c._id) };
  } else if (req.user.role === 'case_manager') {
    // Case managers can see logs for their cases
    const cases = await Case.find({ caseManager: req.user._id }).select('_id');
    options.caseId = options.caseId || { $in: cases.map(c => c._id) };
  }

  const logs = await ActivityLog.getClinicianLogs(req.user._id, options)
    .skip(skip)
    .limit(limit);

  const total = await ActivityLog.countDocuments({
    clinician: req.user._id,
    ...(options.caseId && { case: options.caseId }),
    ...(options.workerId && { worker: options.workerId }),
    ...(options.activityType && { activityType: options.activityType }),
    ...(options.isReviewed !== undefined && { isReviewed: options.isReviewed }),
    ...(options.priority && { priority: options.priority }),
    ...(options.startDate && options.endDate && {
      createdAt: {
        $gte: new Date(options.startDate),
        $lte: new Date(options.endDate)
      }
    })
  });

  res.json({
    logs,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

// @route   GET /api/activity-logs/:id
// @desc    Get activity log by ID
// @access  Private (Clinician, Case Manager, Admin)
router.get('/:id', [
  authMiddleware,
  roleMiddleware('clinician', 'case_manager', 'admin')
], asyncHandler(async (req, res) => {
  const log = await ActivityLog.findById(req.params.id)
    .populate('worker', 'firstName lastName email')
    .populate('case', 'caseNumber status')
    .populate('rehabilitationPlan', 'planName status')
    .populate('clinician', 'firstName lastName email');

  if (!log) {
    return res.status(404).json({ message: 'Activity log not found' });
  }

  // Check access permissions
  const hasAccess = 
    req.user.role === 'admin' ||
    log.clinician._id.toString() === req.user._id.toString() ||
    (req.user.role === 'case_manager' && log.case.caseManager?.toString() === req.user._id.toString());

  if (!hasAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ log });
}));

// @route   PUT /api/activity-logs/:id/review
// @desc    Mark activity log as reviewed by clinician
// @access  Private (Clinician, Case Manager, Admin)
router.put('/:id/review', [
  authMiddleware,
  roleMiddleware('clinician', 'case_manager', 'admin'),
  body('notes').optional().isString().isLength({ max: 1000 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const log = await ActivityLog.findById(req.params.id);
  if (!log) {
    return res.status(404).json({ message: 'Activity log not found' });
  }

  // Check access permissions
  const hasAccess = 
    req.user.role === 'admin' ||
    log.clinician.toString() === req.user._id.toString() ||
    (req.user.role === 'case_manager' && log.case.caseManager?.toString() === req.user._id.toString());

  if (!hasAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await log.markAsReviewed(notes);

  res.json({
    message: 'Activity log marked as reviewed',
    log
  });
}));

// @route   GET /api/activity-logs/worker/:workerId
// @desc    Get activity logs for a specific worker
// @access  Private (Clinician, Case Manager, Admin)
router.get('/worker/:workerId', [
  authMiddleware,
  roleMiddleware('clinician', 'case_manager', 'admin'),
  query('case').optional().isMongoId(),
  query('activityType').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const options = {
    caseId: req.query.case,
    activityType: req.query.activityType,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    limit: limit
  };

  // Verify worker exists
  const worker = await User.findById(req.params.workerId);
  if (!worker) {
    return res.status(404).json({ message: 'Worker not found' });
  }

  // Check if user has access to this worker's logs
  const cases = await Case.find({
    worker: req.params.workerId,
    $or: [
      { clinician: req.user._id },
      { caseManager: req.user._id }
    ]
  });

  if (cases.length === 0 && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied to this worker\'s logs' });
  }

  const logs = await ActivityLog.getWorkerLogs(req.params.workerId, options)
    .skip(skip)
    .limit(limit);

  const total = await ActivityLog.countDocuments({
    worker: req.params.workerId,
    ...(options.caseId && { case: options.caseId }),
    ...(options.activityType && { activityType: options.activityType }),
    ...(options.startDate && options.endDate && {
      createdAt: {
        $gte: new Date(options.startDate),
        $lte: new Date(options.endDate)
      }
    })
  });

  res.json({
    worker: {
      _id: worker._id,
      firstName: worker.firstName,
      lastName: worker.lastName,
      email: worker.email
    },
    logs,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

// @route   GET /api/activity-logs/case/:caseId
// @desc    Get activity logs for a specific case
// @access  Private (Clinician, Case Manager, Admin)
router.get('/case/:caseId', [
  authMiddleware,
  roleMiddleware('clinician', 'case_manager', 'admin'),
  query('activityType').optional().isString(),
  query('isReviewed').optional().isBoolean(),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Verify case exists and user has access
  const caseDoc = await Case.findById(req.params.caseId);
  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Check access permissions
  const hasAccess = 
    req.user.role === 'admin' ||
    caseDoc.clinician?.toString() === req.user._id.toString() ||
    caseDoc.caseManager?.toString() === req.user._id.toString();

  if (!hasAccess) {
    return res.status(403).json({ message: 'Access denied to this case\'s logs' });
  }

  const filter = {
    case: req.params.caseId,
    ...(req.query.activityType && { activityType: req.query.activityType }),
    ...(req.query.isReviewed !== undefined && { isReviewed: req.query.isReviewed }),
    ...(req.query.priority && { priority: req.query.priority }),
    ...(req.query.startDate && req.query.endDate && {
      createdAt: {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      }
    })
  };

  const logs = await ActivityLog.find(filter)
    .populate('worker', 'firstName lastName email')
    .populate('case', 'caseNumber status')
    .populate('rehabilitationPlan', 'planName status')
    .populate('clinician', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ActivityLog.countDocuments(filter);

  res.json({
    case: {
      _id: caseDoc._id,
      caseNumber: caseDoc.caseNumber,
      status: caseDoc.status,
      worker: caseDoc.worker
    },
    logs,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

// @route   GET /api/activity-logs/stats/summary
// @desc    Get activity log statistics for clinician dashboard
// @access  Private (Clinician, Case Manager, Admin)
router.get('/stats/summary', [
  authMiddleware,
  roleMiddleware('clinician', 'case_manager', 'admin')
], asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get cases for this user
  let caseFilter = {};
  if (req.user.role === 'clinician') {
    const cases = await Case.find({ clinician: req.user._id }).select('_id');
    caseFilter = { case: { $in: cases.map(c => c._id) } };
  } else if (req.user.role === 'case_manager') {
    const cases = await Case.find({ caseManager: req.user._id }).select('_id');
    caseFilter = { case: { $in: cases.map(c => c._id) } };
  }

  const [
    totalLogs,
    unreviewedLogs,
    logsLast30Days,
    logsLast7Days,
    logsToday,
    logsByType,
    logsByPriority
  ] = await Promise.all([
    ActivityLog.countDocuments({ clinician: req.user._id, ...caseFilter }),
    ActivityLog.countDocuments({ clinician: req.user._id, isReviewed: false, ...caseFilter }),
    ActivityLog.countDocuments({ 
      clinician: req.user._id, 
      createdAt: { $gte: thirtyDaysAgo },
      ...caseFilter 
    }),
    ActivityLog.countDocuments({ 
      clinician: req.user._id, 
      createdAt: { $gte: sevenDaysAgo },
      ...caseFilter 
    }),
    ActivityLog.countDocuments({ 
      clinician: req.user._id, 
      createdAt: { $gte: today },
      ...caseFilter 
    }),
    ActivityLog.aggregate([
      { $match: { clinician: req.user._id, ...caseFilter } },
      { $group: { _id: '$activityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    ActivityLog.aggregate([
      { $match: { clinician: req.user._id, ...caseFilter } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  res.json({
    summary: {
      totalLogs,
      unreviewedLogs,
      logsLast30Days,
      logsLast7Days,
      logsToday
    },
    logsByType,
    logsByPriority
  });
}));

module.exports = router;



