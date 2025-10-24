const express = require('express');
const { body, query, param } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/authSupabase');
const { handleValidationErrors } = require('../middleware/validators');
const appointmentsController = require('../controllers/appointmentsController');

const router = express.Router();

// @route   GET /api/appointments
// @desc    Get appointments
// @access  Private
router.get('/', [
  authenticateToken,
  query('case').optional().isUUID(),
  query('clinician').optional().isUUID(),
  query('worker').optional().isUUID(),
  query('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  query('appointmentType').optional().isIn(['assessment', 'treatment', 'follow_up', 'consultation', 'telehealth']),
  query('date').optional().isISO8601(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], appointmentsController.getAppointments);

// @route   GET /api/appointments/calendar
// @desc    Get appointments for calendar view
// @access  Private
router.get('/calendar', [
  authenticateToken,
  query('start').isISO8601().withMessage('Valid start date is required'),
  query('end').isISO8601().withMessage('Valid end date is required'),
  handleValidationErrors
], appointmentsController.getCalendarAppointments);

// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', [
  authenticateToken,
  param('id').isUUID(),
  handleValidationErrors
], appointmentsController.getAppointmentById);

// @route   POST /api/appointments
// @desc    Create appointment
// @access  Private (Admin, Case Manager, Clinician)
router.post('/', [
  authenticateToken,
  requireRole('admin', 'case_manager', 'clinician'),
  body('case').isUUID().withMessage('Valid case ID is required'),
  body('worker').optional().isUUID(),
  body('clinician').optional().isUUID(),
  body('appointmentType')
    .isIn(['assessment', 'treatment', 'follow_up', 'consultation', 'telehealth'])
    .withMessage('Valid appointment type is required'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('duration').optional().isInt({ min: 15, max: 480 }),
  body('location').optional().isIn(['clinic', 'telehealth', 'workplace', 'home']),
  body('notes').optional().isString(),
  body('isVirtual').optional().isBoolean(),
  body('purpose').optional().isString(),
  body('agenda').optional().isArray(),
  body('preparation').optional().isArray(),
  handleValidationErrors
], appointmentsController.createAppointment);

// @route   PUT /api/appointments/:id
// @desc    Update appointment
// @access  Private (Admin, Case Manager, Clinician)
router.put('/:id', [
  authenticateToken,
  requireRole('admin', 'case_manager', 'clinician'),
  param('id').isUUID(),
  body('appointmentType')
    .optional()
    .isIn(['assessment', 'treatment', 'follow_up', 'consultation', 'telehealth']),
  body('scheduledDate').optional().isISO8601(),
  body('duration').optional().isInt({ min: 15, max: 480 }),
  body('location').optional().isIn(['clinic', 'telehealth', 'workplace', 'home']),
  body('notes').optional().isString(),
  body('isVirtual').optional().isBoolean(),
  body('status')
    .optional()
    .isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  body('purpose').optional().isString(),
  body('agenda').optional().isArray(),
  body('preparation').optional().isArray(),
  handleValidationErrors
], appointmentsController.updateAppointment);

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status
// @access  Private (Admin, Case Manager, Clinician, Worker)
router.put('/:id/status', [
  authenticateToken,
  requireRole('admin', 'case_manager', 'clinician', 'worker'),
  param('id').isUUID(),
  body('status')
    .isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
    .withMessage('Valid status is required'),
  body('notes').optional().isString(),
  handleValidationErrors
], appointmentsController.updateAppointmentStatus);

// @route   DELETE /api/appointments/:id
// @desc    Delete appointment
// @access  Private (Admin, Case Manager, Clinician)
router.delete('/:id', [
  authenticateToken,
  requireRole('admin', 'case_manager', 'clinician'),
  param('id').isUUID(),
  handleValidationErrors
], appointmentsController.deleteAppointment);

module.exports = router;
