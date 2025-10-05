const express = require('express');
const { body, query } = require('express-validator');
const Appointment = require('../models/Appointment');
const Case = require('../models/Case');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const zoomService = require('../services/zoomService');
const NotificationService = require('../services/NotificationService');
// Import centralized validators
const { 
  validateAppointment,
  handleValidationErrors,
  isMongoId,
  validatePagination,
  validateDateRange 
} = require('../middleware/validators');

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
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
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
  } else if (req.query.startDate && req.query.endDate) {
    // For calendar view - date range filtering
    const startDate = new Date(req.query.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(req.query.endDate);
    endDate.setHours(23, 59, 59, 999);
    
    filter.scheduledDate = { $gte: startDate, $lte: endDate };
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
    .populate('case', 'caseNumber status worker employer')
    .populate({
      path: 'case',
      populate: {
        path: 'worker',
        select: 'firstName lastName email phone'
      }
    })
    .populate({
      path: 'case',
      populate: {
        path: 'employer',
        select: 'firstName lastName email'
      }
    })
    .populate('clinician', 'firstName lastName email phone')
    .populate('worker', 'firstName lastName email phone');

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  // Check access permissions
  const hasAccess = 
    req.user.role === 'admin' ||
    req.user.role === 'case_manager' ||
    (appointment.clinician && appointment.clinician._id.toString() === req.user._id.toString()) ||
    (appointment.worker && appointment.worker._id.toString() === req.user._id.toString()) ||
    (appointment.case && appointment.case.employer && appointment.case.employer._id.toString() === req.user._id.toString());

  if (!hasAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ appointment });
}));

// @route   POST /api/appointments
// @desc    Create appointment
// @access  Private (Admin, Case Manager, Clinician)
router.post('/', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'clinician'),
  validateAppointment,
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { case: caseId, worker, clinician, appointmentType, scheduledDate, duration, location, notes, isVirtual } = req.body;

  // Verify case exists
  const caseDoc = await Case.findById(caseId)
    .populate('worker', 'firstName lastName email')
    .populate('employer', 'firstName lastName email');
  
  if (!caseDoc) {
    return res.status(400).json({ message: 'Invalid case' });
  }

  // Verify worker exists
  const workerDoc = await User.findById(worker || caseDoc.worker);
  if (!workerDoc || workerDoc.role !== 'worker' || !workerDoc.isActive) {
    return res.status(400).json({ message: 'Invalid worker' });
  }

  // Verify clinician exists
  const clinicianDoc = await User.findById(clinician || caseDoc.clinician);
  if (!clinicianDoc || clinicianDoc.role !== 'clinician' || !clinicianDoc.isActive) {
    return res.status(400).json({ message: 'Invalid clinician' });
  }

  // Create appointment
  const appointment = new Appointment({
    case: caseId, // Use the case ID from the request body
    worker: worker || caseDoc.worker._id, // Use worker ID from case if not provided
    clinician: clinician || caseDoc.clinician._id, // Use clinician ID from case if not provided
    appointmentType,
    scheduledDate,
    duration: duration || 60, // Default to 60 minutes
    location: location || 'clinic', // Default to clinic
    notes: notes || '',
    isVirtual: isVirtual || false,
    status: 'scheduled',
    createdBy: req.user._id
  });

  // If virtual appointment, create Zoom meeting
  let zoomMeetingData = null;
  if (isVirtual) {
    try {
      // Create Zoom meeting
      const zoomResponse = await zoomService.createMeeting({
        topic: `${appointmentType} - Case #${caseDoc.caseNumber}`,
        startTime: scheduledDate,
        duration: duration || 60,
        agenda: `${appointmentType} appointment for ${workerDoc.firstName} ${workerDoc.lastName}`
      });

      if (zoomResponse.success && zoomResponse.meeting) {
        const zoomMeeting = zoomResponse.meeting;
        
        // Store Zoom meeting details in telehealthInfo
        appointment.telehealthInfo = {
          platform: 'zoom',
          meetingId: zoomMeeting.id,
          meetingUrl: zoomMeeting.joinUrl,
          password: zoomMeeting.password,
          instructions: 'Click the join button to start the meeting',
          zoomMeeting: {
            id: zoomMeeting.id,
            topic: zoomMeeting.topic,
            startTime: new Date(scheduledDate),
            duration: duration || 60,
            joinUrl: zoomMeeting.joinUrl,
            password: zoomMeeting.password,
            meetingId: zoomMeeting.meetingId,
            hostId: zoomMeeting.hostId,
            createdAt: new Date(),
            status: 'waiting'
          }
        };
        
        console.log(`Created Zoom meeting for appointment: ${zoomMeeting.id}`);
        console.log(`Zoom join URL: ${zoomMeeting.joinUrl}`);
        
        zoomMeetingData = {
          meetingId: zoomMeeting.id,
          joinUrl: zoomMeeting.joinUrl,
          password: zoomMeeting.password
        };
      } else {
        console.error('Failed to create Zoom meeting:', zoomResponse.error);
        // Continue without Zoom meeting if creation fails
      }
    } catch (zoomError) {
      console.error('Error creating Zoom meeting:', zoomError);
      // Continue without Zoom meeting if creation fails
    }
  }

  await appointment.save();

  // Populate the created appointment
  await appointment.populate([
    { path: 'case', select: 'caseNumber status' },
    { path: 'clinician', select: 'firstName lastName email' },
    { path: 'worker', select: 'firstName lastName email' }
  ]);

  // Create notification for the worker
  try {
    await NotificationService.createNotification({
      recipient: appointment.worker._id,
      sender: req.user._id,
      type: 'appointment_scheduled',
      title: 'New Appointment Scheduled',
      message: `A ${appointmentType} appointment has been scheduled for you on ${new Date(scheduledDate).toLocaleDateString()} at ${new Date(scheduledDate).toLocaleTimeString()}.`,
      relatedEntity: {
        type: 'appointment',
        id: appointment._id
      },
      priority: 'high',
      actionUrl: '/appointments',
      metadata: {
        appointmentType,
        scheduledDate,
        duration,
        location: location || 'Clinic',
        isVirtual: isVirtual || false,
        caseNumber: caseDoc.caseNumber
      }
    });
    
    console.log(`Notification created for worker ${appointment.worker._id} regarding appointment`);
  } catch (notificationError) {
    console.error('Error creating worker notification:', notificationError);
    // Don't fail the appointment creation if notification creation fails
  }

  // Create notification for the clinician
  try {
    await NotificationService.createNotification({
      recipient: appointment.clinician._id,
      sender: req.user._id,
      type: 'appointment_scheduled',
      title: 'New Appointment Scheduled',
      message: `A ${appointmentType} appointment has been scheduled with ${workerDoc.firstName} ${workerDoc.lastName} on ${new Date(scheduledDate).toLocaleDateString()} at ${new Date(scheduledDate).toLocaleTimeString()}.`,
      relatedEntity: {
        type: 'appointment',
        id: appointment._id
      },
      priority: 'high',
      actionUrl: '/appointments',
      metadata: {
        appointmentType,
        scheduledDate,
        duration,
        location: location || 'Clinic',
        isVirtual: isVirtual || false,
        caseNumber: caseDoc.caseNumber,
        workerName: `${workerDoc.firstName} ${workerDoc.lastName}`
      }
    });
    
    console.log(`Notification created for clinician ${appointment.clinician._id} regarding appointment`);
  } catch (notificationError) {
    console.error('Error creating clinician notification:', notificationError);
    // Don't fail the appointment creation if notification creation fails
  }

  // Create Zoom meeting notification if virtual appointment
  if (isVirtual && zoomMeetingData) {
    try {
      await NotificationService.createZoomMeetingNotification(
        appointment.worker._id,
        appointment.clinician._id,
        appointment._id,
        {
          appointmentType,
          scheduledDate,
          duration,
          caseNumber: caseDoc.caseNumber
        },
        zoomMeetingData
      );
      
      console.log(`Zoom meeting notification created for worker ${appointment.worker._id}`);
    } catch (zoomNotificationError) {
      console.error('Error creating Zoom meeting notification:', zoomNotificationError);
      // Don't fail the appointment creation if notification creation fails
    }
  }

  res.status(201).json({
    message: 'Appointment created successfully',
    appointment
  });
}));

// @route   PUT /api/appointments/:id
// @desc    Update appointment
// @access  Private (Admin, Case Manager, Clinician)
router.put('/:id', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'clinician'),
  isMongoId('id'),
  validateAppointment,
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'admin' ||
    req.user.role === 'case_manager' ||
    (appointment.clinician && appointment.clinician.toString() === req.user._id.toString());

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Update appointment fields
  const { appointmentType, scheduledDate, duration, location, notes, isVirtual, status } = req.body;
  
  appointment.appointmentType = appointmentType || appointment.appointmentType;
  appointment.scheduledDate = scheduledDate || appointment.scheduledDate;
  appointment.duration = duration || appointment.duration;
  appointment.location = location || appointment.location;
  appointment.notes = notes || appointment.notes;
  appointment.isVirtual = isVirtual !== undefined ? isVirtual : appointment.isVirtual;
  appointment.status = status || appointment.status;
  appointment.updatedBy = req.user._id;

  // If virtual appointment and no Zoom meeting exists, create one
  let zoomMeetingData = null;
  if (isVirtual && !appointment.zoomMeeting) {
    try {
      // Get case details for Zoom meeting
      const caseDoc = await Case.findById(appointment.case)
        .populate('worker', 'firstName lastName email');
      
      // Create Zoom meeting
      const zoomMeeting = await zoomService.createMeeting({
        topic: `${appointmentType} - Case #${caseDoc.caseNumber}`,
        start_time: scheduledDate || appointment.scheduledDate,
        duration: duration || appointment.duration || 60,
        timezone: 'Asia/Manila',
        agenda: `${appointmentType || appointment.appointmentType} appointment for ${caseDoc.worker.firstName} ${caseDoc.worker.lastName}`
      });

      // Store Zoom meeting details
      appointment.zoomMeeting = {
        meetingId: zoomMeeting.id,
        joinUrl: zoomMeeting.join_url,
        startUrl: zoomMeeting.start_url,
        password: zoomMeeting.password
      };
      
      zoomMeetingData = {
        meetingId: zoomMeeting.id,
        joinUrl: zoomMeeting.join_url,
        password: zoomMeeting.password
      };
      
      console.log(`Created Zoom meeting for updated appointment: ${zoomMeeting.id}`);
    } catch (zoomError) {
      console.error('Error creating Zoom meeting:', zoomError);
      // Continue without Zoom meeting if creation fails
    }
  } else if (isVirtual && appointment.zoomMeeting && (scheduledDate || duration)) {
    // Update existing Zoom meeting if schedule changed
    try {
      await zoomService.updateMeeting(appointment.zoomMeeting.meetingId, {
        start_time: scheduledDate || appointment.scheduledDate,
        duration: duration || appointment.duration
      });
      
      console.log(`Updated Zoom meeting: ${appointment.zoomMeeting.meetingId}`);
    } catch (zoomError) {
      console.error('Error updating Zoom meeting:', zoomError);
      // Continue without updating Zoom meeting if update fails
    }
  }

  await appointment.save();

  // Populate the updated appointment
  await appointment.populate([
    { path: 'case', select: 'caseNumber status worker' },
    { path: 'clinician', select: 'firstName lastName email' },
    { path: 'worker', select: 'firstName lastName email' }
  ]);

  // Create notification for the worker about the update
  try {
    await NotificationService.createNotification({
      recipient: appointment.worker._id,
      sender: req.user._id,
      type: 'appointment_scheduled',
      title: 'Appointment Updated',
      message: `Your ${appointment.appointmentType} appointment scheduled for ${new Date(appointment.scheduledDate).toLocaleDateString()} at ${new Date(appointment.scheduledDate).toLocaleTimeString()} has been updated.`,
      relatedEntity: {
        type: 'appointment',
        id: appointment._id
      },
      priority: 'high',
      actionUrl: '/appointments',
      metadata: {
        appointmentType: appointment.appointmentType,
        scheduledDate: appointment.scheduledDate,
        duration: appointment.duration,
        location: appointment.location,
        isVirtual: appointment.isVirtual,
        status: appointment.status
      }
    });
    
    console.log(`Update notification created for worker ${appointment.worker._id}`);
  } catch (notificationError) {
    console.error('Error creating worker update notification:', notificationError);
    // Don't fail the appointment update if notification creation fails
  }

  // Create Zoom meeting notification if newly created
  if (isVirtual && zoomMeetingData) {
    try {
      await NotificationService.createZoomMeetingNotification(
        appointment.worker._id,
        appointment.clinician._id,
        appointment._id,
        {
          appointmentType: appointment.appointmentType,
          scheduledDate: appointment.scheduledDate,
          duration: appointment.duration,
          caseNumber: appointment.case.caseNumber
        },
        zoomMeetingData
      );
      
      console.log(`Zoom meeting notification created for worker ${appointment.worker._id} after update`);
    } catch (zoomNotificationError) {
      console.error('Error creating Zoom meeting notification after update:', zoomNotificationError);
      // Don't fail the appointment update if notification creation fails
    }
  }

  res.json({
    message: 'Appointment updated successfully',
    appointment
  });
}));

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status
// @access  Private (Admin, Case Manager, Clinician, Worker)
router.put('/:id/status', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'clinician', 'worker'),
  isMongoId('id'),
  body('status').isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).withMessage('Valid status is required'),
  body('notes').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'admin' ||
    req.user.role === 'case_manager' ||
    (appointment.clinician && appointment.clinician.toString() === req.user._id.toString()) ||
    (req.user.role === 'worker' && appointment.worker && appointment.worker.toString() === req.user._id.toString());

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const oldStatus = appointment.status;
  appointment.status = status;
  
  if (notes) {
    appointment.notes = appointment.notes ? `${appointment.notes}\n\n${notes}` : notes;
  }
  
  // Add status history entry
  if (!appointment.statusHistory) {
    appointment.statusHistory = [];
  }
  appointment.statusHistory.push({
    status,
    changedBy: req.user._id,
    changedAt: new Date(),
    notes: notes || `Status changed from ${oldStatus} to ${status}`
  });

  // If cancelled, try to cancel Zoom meeting
  if (status === 'cancelled' && appointment.telehealthInfo?.zoomMeeting?.id) {
    try {
      await zoomService.deleteMeeting(appointment.telehealthInfo.zoomMeeting.id);
      console.log(`Cancelled Zoom meeting: ${appointment.telehealthInfo.zoomMeeting.id}`);
    } catch (zoomError) {
      console.error('Error cancelling Zoom meeting:', zoomError);
      // Continue without cancelling Zoom meeting if deletion fails
    }
  }

  await appointment.save();

  // Populate the updated appointment
  await appointment.populate([
    { path: 'case', select: 'caseNumber status worker' },
    { path: 'clinician', select: 'firstName lastName email' },
    { path: 'worker', select: 'firstName lastName email' }
  ]);

  // Create notification for the worker about the status change
  try {
    await NotificationService.createNotification({
      recipient: appointment.worker._id,
      sender: req.user._id,
      type: 'appointment_scheduled',
      title: 'Appointment Status Updated',
      message: `Your ${appointment.appointmentType} appointment status has been updated to ${status}.`,
      relatedEntity: {
        type: 'appointment',
        id: appointment._id
      },
      priority: status === 'cancelled' ? 'high' : 'medium',
      actionUrl: '/appointments',
      metadata: {
        appointmentType: appointment.appointmentType,
        scheduledDate: appointment.scheduledDate,
        oldStatus,
        newStatus: status
      }
    });
    
    console.log(`Status change notification created for worker ${appointment.worker._id}`);
  } catch (notificationError) {
    console.error('Error creating worker status change notification:', notificationError);
    // Don't fail the appointment update if notification creation fails
  }

  res.json({
    message: 'Appointment status updated successfully',
    appointment
  });
}));

// @route   GET /api/appointments/calendar
// @desc    Get appointments for calendar view
// @access  Private
router.get('/calendar', [
  authMiddleware,
  query('start').isISO8601().withMessage('Valid start date is required'),
  query('end').isISO8601().withMessage('Valid end date is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { start, end } = req.query;
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const filter = {
    scheduledDate: { $gte: startDate, $lte: endDate }
  };
  
  // Role-based filtering
  if (req.user.role === 'clinician') {
    filter.clinician = req.user._id;
  } else if (req.user.role === 'worker') {
    filter.worker = req.user._id;
  }

  const appointments = await Appointment.find(filter)
    .populate('case', 'caseNumber status')
    .populate('clinician', 'firstName lastName')
    .populate('worker', 'firstName lastName')
    .sort({ scheduledDate: 1 });

  // Format appointments for calendar
  const calendarEvents = appointments.map(appointment => ({
    id: appointment._id,
    title: `${appointment.appointmentType} - ${appointment.worker.firstName} ${appointment.worker.lastName}`,
    start: appointment.scheduledDate,
    end: new Date(appointment.scheduledDate.getTime() + (appointment.duration * 60000)),
    backgroundColor: getAppointmentColor(appointment.status),
    borderColor: getAppointmentColor(appointment.status),
    extendedProps: {
      appointmentType: appointment.appointmentType,
      status: appointment.status,
      location: appointment.location,
      isVirtual: appointment.isVirtual,
      caseNumber: appointment.case.caseNumber,
      worker: `${appointment.worker.firstName} ${appointment.worker.lastName}`,
      clinician: `${appointment.clinician.firstName} ${appointment.clinician.lastName}`
    }
  }));

  res.json(calendarEvents);
}));

// Helper function to get appointment color based on status
function getAppointmentColor(status) {
  switch (status) {
    case 'scheduled': return '#4285F4'; // Blue
    case 'confirmed': return '#0F9D58'; // Green
    case 'in_progress': return '#F4B400'; // Yellow
    case 'completed': return '#0F9D58'; // Green
    case 'cancelled': return '#DB4437'; // Red
    case 'no_show': return '#DB4437'; // Red
    default: return '#4285F4'; // Blue
  }
}

// @route   DELETE /api/appointments/:id
// @desc    Delete appointment
// @access  Private (Admin, Case Manager, Clinician)
router.delete('/:id', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'clinician'),
  isMongoId('id'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  // Check permissions
  const canDelete = 
    req.user.role === 'admin' ||
    req.user.role === 'case_manager' ||
    (appointment.clinician && appointment.clinician.toString() === req.user._id.toString());

  if (!canDelete) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Delete associated Zoom meeting if exists
  if (appointment.telehealthInfo?.zoomMeeting?.id) {
    try {
      await zoomService.deleteMeeting(appointment.telehealthInfo.zoomMeeting.id);
      console.log(`Deleted Zoom meeting: ${appointment.telehealthInfo.zoomMeeting.id}`);
    } catch (zoomError) {
      console.error('Error deleting Zoom meeting:', zoomError);
      // Continue with appointment deletion even if Zoom meeting deletion fails
    }
  }

  await Appointment.findByIdAndDelete(req.params.id);

  res.json({
    message: 'Appointment deleted successfully'
  });
}));

module.exports = router;