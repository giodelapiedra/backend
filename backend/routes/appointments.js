const express = require('express');
const { body, query } = require('express-validator');
const Appointment = require('../models/Appointment');
const Case = require('../models/Case');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { handleValidationErrors, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @route   GET /api/appointments
// @desc    Get appointments
// @access  Private
router.get('/', [
  authMiddleware,
  query('case').optional().isMongoId(),
  query('clinician').optional().isMongoId(),
  query('worker').optional().isMongoId(),
  query('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  query('appointmentType').optional().isIn(['assessment', 'treatment', 'follow_up', 'consultation', 'telehealth']),
  query('date').optional().isISO8601(),
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
    filter.worker = req.user._id;
  }
  
  if (req.query.case) {
    filter.case = req.query.case;
  }
  
  if (req.query.clinician) {
    filter.clinician = req.query.clinician;
  }
  
  if (req.query.worker) {
    filter.worker = req.query.worker;
  }
  
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  if (req.query.appointmentType) {
    filter.appointmentType = req.query.appointmentType;
  }
  
  if (req.query.date) {
    const date = new Date(req.query.date);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    filter.scheduledDate = { $gte: startOfDay, $lte: endOfDay };
  }

  const appointments = await Appointment.find(filter)
    .populate('case', 'caseNumber status worker')
    .populate('clinician', 'firstName lastName email')
    .populate('worker', 'firstName lastName email')
    .sort({ scheduledDate: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Appointment.countDocuments(filter);

  res.json({
    appointments,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('case', 'caseNumber status worker')
    .populate('clinician', 'firstName lastName email')
    .populate('worker', 'firstName lastName email');

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  // Check access permissions
  const hasAccess = 
    req.user.role === 'admin' ||
    appointment.worker._id.toString() === req.user._id.toString() ||
    appointment.clinician._id.toString() === req.user._id.toString() ||
    (req.user.role === 'case_manager' && appointment.case.caseManager?.toString() === req.user._id.toString());

  if (!hasAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ appointment });
}));

// @route   POST /api/appointments
// @desc    Create new appointment
// @access  Private (Clinician, Case Manager)
router.post('/', [
  authMiddleware,
  roleMiddleware('clinician', 'case_manager'),
  body('case').isMongoId().withMessage('Valid case ID is required'),
  body('worker').isMongoId().withMessage('Valid worker ID is required'),
  body('appointmentType').isIn(['assessment', 'treatment', 'follow_up', 'consultation', 'telehealth']).withMessage('Valid appointment type is required'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('duration').optional().isInt({ min: 15, max: 480 }),
  body('location').optional().isIn(['clinic', 'telehealth', 'workplace', 'home']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { case: caseId, worker: workerId, ...appointmentData } = req.body;

  // Verify case exists
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Verify worker exists
  const worker = await User.findById(workerId);
  if (!worker || worker.role !== 'worker') {
    return res.status(400).json({ message: 'Invalid worker' });
  }

  // Check for conflicting appointments
  const scheduledDate = new Date(req.body.scheduledDate);
  const duration = req.body.duration || 60;
  const endTime = new Date(scheduledDate.getTime() + duration * 60000);

  const conflictingAppointment = await Appointment.findOne({
    clinician: req.user._id,
    scheduledDate: { $lt: endTime },
    $expr: {
      $lt: [
        { $add: ['$scheduledDate', { $multiply: ['$duration', 60000] }] },
        scheduledDate
      ]
    },
    status: { $in: ['scheduled', 'confirmed'] }
  });

  if (conflictingAppointment) {
    return res.status(400).json({ message: 'Appointment conflicts with existing appointment' });
  }

  const appointment = new Appointment({
    case: caseId,
    worker: workerId,
    clinician: req.user._id,
    ...appointmentData
  });

  await appointment.save();

  // Populate the created appointment
  await appointment.populate([
    { path: 'case', select: 'caseNumber status worker' },
    { path: 'clinician', select: 'firstName lastName email' },
    { path: 'worker', select: 'firstName lastName email' }
  ]);

  res.status(201).json({
    message: 'Appointment created successfully',
    appointment
  });
}));

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status
// @access  Private
router.put('/:id/status', [
  authMiddleware,
  body('status').isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).withMessage('Valid status is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('case', 'caseNumber status worker')
    .populate('clinician', 'firstName lastName email')
    .populate('worker', 'firstName lastName email');

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'admin' ||
    appointment.clinician._id.toString() === req.user._id.toString() ||
    appointment.worker._id.toString() === req.user._id.toString() ||
    req.user.role === 'case_manager';

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Handle status-specific logic
  if (req.body.status === 'cancelled') {
    appointment.cancelledBy = req.user._id;
    appointment.cancellationDate = new Date();
    appointment.cancellationReason = req.body.cancellationReason || 'No reason provided';
  } else if (req.body.status === 'completed') {
    appointment.completedDate = new Date();
  }

  appointment.status = req.body.status;
  await appointment.save();

  res.json({
    message: 'Appointment status updated successfully',
    appointment
  });
}));

// @route   PUT /api/appointments/:id
// @desc    Update appointment
// @access  Private
router.put('/:id', [
  authMiddleware,
  body('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  body('scheduledDate').optional().isISO8601(),
  body('duration').optional().isInt({ min: 15, max: 480 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'admin' ||
    appointment.clinician._id.toString() === req.user._id.toString() ||
    appointment.worker._id.toString() === req.user._id.toString() ||
    req.user.role === 'case_manager';

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Handle cancellation
  if (req.body.status === 'cancelled') {
    appointment.cancelledBy = req.user._id;
    appointment.cancellationDate = new Date();
    appointment.cancellationReason = req.body.cancellationReason || 'No reason provided';
  }

  Object.assign(appointment, req.body);
  await appointment.save();

  res.json({
    message: 'Appointment updated successfully',
    appointment
  });
}));

// @route   DELETE /api/appointments/:id
// @desc    Cancel appointment
// @access  Private
router.delete('/:id', [
  authMiddleware,
  body('cancellationReason').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  // Check permissions
  const canCancel = 
    req.user.role === 'admin' ||
    appointment.clinician._id.toString() === req.user._id.toString() ||
    appointment.worker._id.toString() === req.user._id.toString() ||
    req.user.role === 'case_manager';

  if (!canCancel) {
    return res.status(403).json({ message: 'Access denied' });
  }

  appointment.status = 'cancelled';
  appointment.cancelledBy = req.user._id;
  appointment.cancellationDate = new Date();
  appointment.cancellationReason = req.body.cancellationReason || 'No reason provided';

  await appointment.save();

  res.json({
    message: 'Appointment cancelled successfully',
    appointment
  });
}));

// @route   GET /api/appointments/dashboard/stats
// @desc    Get appointment statistics for dashboard
// @access  Private
router.get('/dashboard/stats', authMiddleware, asyncHandler(async (req, res) => {
  const filter = {};
  
  if (req.user.role === 'clinician') {
    filter.clinician = req.user._id;
  } else if (req.user.role === 'worker') {
    filter.worker = req.user._id;
  }

  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const totalAppointments = await Appointment.countDocuments(filter);
  const todayAppointments = await Appointment.countDocuments({
    ...filter,
    scheduledDate: { $gte: startOfDay, $lte: endOfDay }
  });
  const upcomingAppointments = await Appointment.countDocuments({
    ...filter,
    scheduledDate: { $gt: endOfDay },
    status: { $in: ['scheduled', 'confirmed'] }
  });
  const completedAppointments = await Appointment.countDocuments({
    ...filter,
    status: 'completed'
  });

  // Get today's appointments
  const todaysAppointments = await Appointment.find({
    ...filter,
    scheduledDate: { $gte: startOfDay, $lte: endOfDay }
  })
    .populate('case', 'caseNumber worker')
    .populate('worker', 'firstName lastName')
    .sort({ scheduledDate: 1 });

  res.json({
    totalAppointments,
    todayAppointments,
    upcomingAppointments,
    completedAppointments,
    todaysAppointments
  });
}));

module.exports = router;