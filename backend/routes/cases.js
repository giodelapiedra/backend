const express = require('express');
const { body, query } = require('express-validator');
const Case = require('../models/Case');
const Incident = require('../models/Incident');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { handleValidationErrors, asyncHandler } = require('../middleware/errorHandler');
const { sendNotificationUpdate } = require('./notifications');
const AutoAssignmentService = require('../services/AutoAssignmentService');

const router = express.Router();

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
], asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  console.log('Cases API called by user role:', req.user.role);
  
  const filter = {};
  
  // Role-based filtering
  switch (req.user.role) {
    case 'worker':
      filter.worker = req.user._id;
      console.log('Worker filter applied');
      break;
    case 'employer':
      filter.employer = req.user._id;
      break;
    case 'clinician':
      filter.clinician = req.user._id;
      break;
    case 'case_manager':
      filter.caseManager = req.user._id;
      break;
    case 'site_supervisor':
      // Site supervisors can see cases from their employer (if assigned) or all cases if not assigned
      if (req.user.employer) {
        const employer = await User.findById(req.user.employer);
        if (employer) {
          filter.employer = employer._id;
        }
      }
      // If no employer assigned, site supervisor can see all cases
      break;
    // Admin and GP/Insurer can see all cases
  }
  
  if (req.query.status) {
    filter.status = req.query.status;
  }
  // Note: Removed restriction that prevented workers from seeing closed cases
  // Workers should be able to see their case history including closed cases
  
  if (req.query.priority) {
    filter.priority = req.query.priority;
  }
  
  if (req.query.search) {
    filter.$or = [
      { caseNumber: { $regex: req.query.search, $options: 'i' } },
      { 'injuryDetails.description': { $regex: req.query.search, $options: 'i' } }
    ];
  }

  console.log('Query filter applied');
  
  const cases = await Case.find(filter)
    .populate('worker', 'firstName lastName email phone')
    .populate('employer', 'firstName lastName email phone')
    .populate('caseManager', 'firstName lastName email phone')
    .populate('clinician', 'firstName lastName email phone')
    .populate('incident', 'incidentNumber incidentDate description incidentType severity photos')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
  console.log('Found cases:', cases.length);

  // Add last check-in data to each case
  const CheckIn = require('../models/CheckIn');
  for (let caseDoc of cases) {
    const lastCheckIn = await CheckIn.findOne({ case: caseDoc._id })
      .sort({ checkInDate: -1 })
      .select('checkInDate painLevel workStatus functionalStatus');
    
    if (lastCheckIn) {
      caseDoc.lastCheckIn = lastCheckIn;
    }
  }

  const total = await Case.countDocuments(filter);

  res.json({
    cases,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

// @route   GET /api/cases/:id
// @desc    Get case by ID
// @access  Private
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const caseDoc = await Case.findById(req.params.id)
    .populate('worker', 'firstName lastName email phone address emergencyContact medicalInfo')
    .populate('employer', 'firstName lastName email phone')
    .populate('caseManager', 'firstName lastName email phone')
    .populate('clinician', 'firstName lastName email phone')
    .populate('incident', 'incidentNumber incidentDate description incidentType severity photos')
    .populate('notes.author', 'firstName lastName role');

  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Check access permissions
  const hasAccess = 
    req.user.role === 'admin' ||
    req.user.role === 'gp_insurer' ||
    caseDoc.worker._id.toString() === req.user._id.toString() ||
    caseDoc.employer._id.toString() === req.user._id.toString() ||
    caseDoc.caseManager._id.toString() === req.user._id.toString() ||
    (caseDoc.clinician && caseDoc.clinician._id.toString() === req.user._id.toString()) ||
    (req.user.role === 'site_supervisor' && caseDoc.employer._id.toString() === req.user.employer?.toString());

  if (!hasAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Workers can access closed cases but they are read-only
  // No additional restrictions needed - workers should see their case history

  res.json({ case: caseDoc });
}));

// @route   POST /api/cases
// @desc    Create new case
// @access  Private (Case Manager, Admin)
router.post('/', [
  authMiddleware,
  roleMiddleware('case_manager', 'admin'),
  body('worker').isMongoId().withMessage('Valid worker ID is required'),
  body('employer').isMongoId().withMessage('Valid employer ID is required'),
  body('incident').isMongoId().withMessage('Valid incident ID is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('injuryDetails.bodyPart')
    .notEmpty().withMessage('Body part is required')
    .isString().withMessage('Body part must be text'),
  body('injuryDetails.injuryType')
    .notEmpty().withMessage('Injury type is required')
    .isString().withMessage('Injury type must be text'),
  body('injuryDetails.severity')
    .notEmpty().withMessage('Severity is required')
    .isIn(['minor', 'moderate', 'severe']).withMessage('Severity must be minor, moderate, or severe'),
  body('injuryDetails.description').optional().isString(),
  body('injuryDetails.dateOfInjury').optional().isISO8601(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  try {
    console.log('Creating new case');
    console.log('User making request:', req.user.role);
    
    const { worker, employer, incident, priority, injuryDetails, workRestrictions } = req.body;

    // Verify worker exists and is active
    const workerDoc = await User.findById(worker);
    if (!workerDoc) {
      return res.status(400).json({ message: 'Worker not found' });
    }
    if (workerDoc.role !== 'worker') {
      return res.status(400).json({ message: 'Invalid worker role: ' + workerDoc.role });
    }
    if (!workerDoc.isActive) {
      return res.status(400).json({ message: 'Worker is not active' });
    }

    // Verify employer exists and is active
    const employerDoc = await User.findById(employer);
    if (!employerDoc) {
      return res.status(400).json({ message: 'Employer not found' });
    }
    if (employerDoc.role !== 'employer') {
      return res.status(400).json({ message: 'Invalid employer role: ' + employerDoc.role });
    }
    if (!employerDoc.isActive) {
      return res.status(400).json({ message: 'Employer is not active' });
    }

    // Verify case manager exists
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required. Please log in again.' });
    }
    
    if (!req.user._id) {
      console.error('User object missing _id');
      return res.status(400).json({ 
        message: 'Case manager ID is missing'
      });
    }
    
    // Verify role is case_manager or admin
    if (req.user.role !== 'case_manager' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Only case managers or admins can create cases',
        role: req.user.role
      });
    }

    // Verify incident exists and has required information
    const incidentDoc = await Incident.findById(incident)
      .populate('worker', 'firstName lastName email phone')
      .populate('employer', 'firstName lastName email phone');
    
    if (!incidentDoc) {
      return res.status(400).json({ message: 'Invalid incident' });
    }
    
    // Validate that incident has required employer information
    if (!incidentDoc.employer) {
      return res.status(400).json({ 
        message: 'Incident is missing employer information. Please ensure the incident was properly reported with employer details.',
        error: 'MISSING_EMPLOYER_INFO'
      });
    }

    // Check if case already exists for this incident
    const existingCase = await Case.findOne({ incident });
    if (existingCase) {
      return res.status(400).json({ message: 'Case already exists for this incident' });
    }

    // Find a clinician to assign the case
    const clinician = await User.findOne({ role: 'clinician', isActive: true });

    // Validate injury details
    if (!injuryDetails) {
      return res.status(400).json({ 
        message: 'Injury details are required',
        error: 'MISSING_INJURY_DETAILS'
      });
    }

    // Validate required injury fields
    const missingFields = [];
    if (!injuryDetails.bodyPart) missingFields.push('Body part');
    if (!injuryDetails.injuryType) missingFields.push('Injury type');
    if (!injuryDetails.severity) missingFields.push('Severity');

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
        error: 'MISSING_REQUIRED_FIELDS',
        fields: missingFields
      });
    }

    // Validate severity enum
    if (!['minor', 'moderate', 'severe'].includes(injuryDetails.severity)) {
      return res.status(400).json({
        message: 'Invalid severity value. Must be minor, moderate, or severe.',
        error: 'INVALID_SEVERITY'
      });
    }

    // 🤖 AUTO-ASSIGNMENT: Perform smart auto-assignment
    console.log('🤖 Starting auto-assignment process...');
    let autoAssignments = null;
    
    try {
      // Prepare case data for auto-assignment
      const caseDataForAssignment = {
        worker,
        employer,
        incident: incidentDoc,
        injuryDetails,
        priority
      };
      
      // Perform auto-assignment
      autoAssignments = await AutoAssignmentService.performAutoAssignment(caseDataForAssignment);
      console.log('✅ Auto-assignment completed:', autoAssignments);
      
    } catch (error) {
      console.error('❌ Auto-assignment failed, using manual assignment:', error);
      // Continue with manual assignment if auto-assignment fails
    }

    // Create the case document with complete structure
    const caseDoc = new Case({
      worker,
      employer,
      caseManager: req.user._id, // Use current user as case manager
      clinician: req.body.clinician || (autoAssignments?.clinician) || (clinician ? clinician._id : undefined),
      incident,
      priority: priority || autoAssignments?.priority || 'medium',
      injuryDetails: injuryDetails || {
        bodyPart: 'Not specified',
        injuryType: 'Not specified',
        severity: 'moderate',
        description: 'No description provided'
      },
      workRestrictions: workRestrictions || {
        lifting: { 
          maxWeight: 0,
          frequency: 'as needed',
          duration: 'short'
        },
        standing: { 
          maxDuration: 0,
          breaks: 0
        },
        sitting: {
          maxDuration: 0,
          breaks: 0
        },
        bending: false,
        twisting: false,
        climbing: false,
        driving: false,
        other: ''
      },
      // If clinician is provided in the request, set status to triaged
      status: req.body.clinician ? 'triaged' : (req.body.status || 'new')
    });
    
    // Update the incident status to 'closed' when a case is created
    // This will remove it from the "Incident Reports Awaiting Case Creation" list
    if (incidentDoc) {
      incidentDoc.status = 'closed';
      await incidentDoc.save();
      console.log(`Updated incident ${incidentDoc.incidentNumber} status to 'closed' after case creation`);
    }

    // Add a note about clinician assignment if applicable
    if (req.body.clinician) {
      const clinician = await User.findById(req.body.clinician);
      if (clinician) {
        caseDoc.notes.push({
          author: req.user._id,
          content: `Clinician assigned: Dr. ${clinician.firstName} ${clinician.lastName}`,
          type: 'assignment'
        });
      }
    }
    
    // Add case manager's initial notes if provided
    if (req.body.initialNotes && req.body.initialNotes.trim()) {
      caseDoc.notes.push({
        author: req.user._id,
        content: req.body.initialNotes.trim(),
        type: 'case_manager_note'
      });
    }

    console.log('Saving case document');
    
    // Ensure caseNumber is set before saving
    if (!caseDoc.caseNumber) {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      caseDoc.caseNumber = `CASE-${year}-${timestamp}-${random}`;
      console.log('Manually set case number');
    }
    
    await caseDoc.save();
    console.log('Case saved successfully');

    // Populate the created case
    await caseDoc.populate([
      { path: 'worker', select: 'firstName lastName email phone' },
      { path: 'employer', select: 'firstName lastName email phone' },
      { path: 'caseManager', select: 'firstName lastName email phone' },
      { path: 'clinician', select: 'firstName lastName email phone' },
      { path: 'incident', select: 'incidentNumber incidentDate description' }
    ]);
    
    // Create notification for clinician if assigned
    if (caseDoc.clinician) {
      try {
        const Notification = require('../models/Notification');
        const clinician = await User.findById(caseDoc.clinician);
        const worker = await User.findById(caseDoc.worker);
        
        // Create notification data
        const notificationData = {
          caseNumber: caseDoc.caseNumber,
          priority: caseDoc.priority,
          workerName: `${worker.firstName} ${worker.lastName}`,
          injuryType: caseDoc.injuryDetails.injuryType
        };
        
        // Send notification to clinician
        await Notification.createClinicianAssignmentNotification(
          caseDoc.clinician,
          caseDoc._id,
          notificationData,
          req.user._id
        );
        
        // Send real-time update to clinician
        await sendNotificationUpdate(caseDoc.clinician);
        
        console.log(`Notification sent to clinician for case`);
      } catch (notificationError) {
        console.error('Error sending notification to clinician:', notificationError);
        // Continue execution even if notification fails
      }
    }

    // 🤖 AUTO-ASSIGNMENT NOTIFICATIONS: Send notifications for auto-assigned users
    if (autoAssignments) {
      try {
        console.log('📧 Sending auto-assignment notifications...');
        
        const assignedUsers = {
          caseManager: req.user._id, // Current user is the case manager
          clinician: autoAssignments.clinician,
          worker: worker
        };
        
        await AutoAssignmentService.sendAssignmentNotification(
          caseDoc._id,
          assignedUsers,
          {
            caseNumber: caseDoc.caseNumber,
            worker: worker
          }
        );
        
        console.log('✅ Auto-assignment notifications sent');
        
      } catch (error) {
        console.error('❌ Error sending auto-assignment notifications:', error);
        // Don't fail the case creation if notifications fail
      }
    }

    res.status(201).json({
      message: 'Case created successfully',
      case: caseDoc,
      autoAssignments: autoAssignments ? {
        priority: autoAssignments.priority,
        clinicianAssigned: !!autoAssignments.clinician
      } : null
    });
  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({ 
      message: 'Error creating case',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}));

// @route   PUT /api/cases/:id
// @desc    Update case
// @access  Private
router.put('/:id', [
  authMiddleware,
  body('status').optional().isIn(['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('clinician').optional().isMongoId(),
  body('expectedReturnDate').optional().isISO8601(),
  body('actualReturnDate').optional().isISO8601(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const caseDoc = await Case.findById(req.params.id);

  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'admin' ||
    req.user.role === 'case_manager' ||
    (req.user.role === 'clinician' && caseDoc.clinician?.toString() === req.user._id.toString());

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Only case managers and admins can assign clinicians
  if (req.body.clinician && !['admin', 'case_manager'].includes(req.user.role)) {
    delete req.body.clinician;
  }

  // Verify clinician if provided
  if (req.body.clinician) {
    const clinician = await User.findById(req.body.clinician);
    if (!clinician || clinician.role !== 'clinician' || !clinician.isActive) {
      return res.status(400).json({ message: 'Invalid clinician' });
    }
  }

  const updatedCase = await Case.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate([
    { path: 'worker', select: 'firstName lastName email phone' },
    { path: 'employer', select: 'firstName lastName email phone' },
    { path: 'caseManager', select: 'firstName lastName email phone' },
    { path: 'clinician', select: 'firstName lastName email phone' },
    { path: 'incident', select: 'incidentNumber incidentDate description' }
  ]);

  res.json({
    message: 'Case updated successfully',
    case: updatedCase
  });
}));

// @route   POST /api/cases/:id/notes
// @desc    Add note to case
// @access  Private
router.post('/:id/notes', [
  authMiddleware,
  body('content').notEmpty().withMessage('Note content is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const caseDoc = await Case.findById(req.params.id);

  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Check access permissions
  const hasAccess = 
    req.user.role === 'admin' ||
    caseDoc.worker._id.toString() === req.user._id.toString() ||
    caseDoc.employer._id.toString() === req.user._id.toString() ||
    caseDoc.caseManager._id.toString() === req.user._id.toString() ||
    (caseDoc.clinician && caseDoc.clinician._id.toString() === req.user._id.toString());

  if (!hasAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  caseDoc.notes.push({
    author: req.user._id,
    content: req.body.content
  });

  await caseDoc.save();

  res.json({ message: 'Note added successfully' });
}));

// @route   PUT /api/cases/:id/assign-clinician
// @desc    Assign clinician to case
// @access  Private (Case Manager, Admin)
router.put('/:id/assign-clinician', [
  authMiddleware,
  roleMiddleware('case_manager', 'admin'),
  body('clinician').isMongoId().withMessage('Valid clinician ID is required'),
  body('assignmentDate').optional().isISO8601(),
  body('notes').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const caseDoc = await Case.findById(req.params.id);

  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Verify clinician exists and is active
  const clinician = await User.findById(req.body.clinician);
  if (!clinician || clinician.role !== 'clinician' || !clinician.isActive) {
    return res.status(400).json({ message: 'Invalid clinician' });
  }

  // Update case with clinician assignment
  caseDoc.clinician = req.body.clinician;
  caseDoc.status = 'triaged'; // Move to triaged status when clinician is assigned
  
  // Add assignment note
  if (req.body.notes) {
    caseDoc.notes.push({
      author: req.user._id,
      content: `Clinician assigned: ${req.body.notes}`,
      type: 'assignment'
    });
  }

  await caseDoc.save();

  // Populate the updated case
  await caseDoc.populate([
    { path: 'worker', select: 'firstName lastName email phone' },
    { path: 'employer', select: 'firstName lastName email phone' },
    { path: 'caseManager', select: 'firstName lastName email phone' },
    { path: 'clinician', select: 'firstName lastName email phone' },
    { path: 'incident', select: 'incidentNumber incidentDate description' }
  ]);

  // 🔔 NOTIFICATION: Send notification to assigned clinician
  try {
    const Notification = require('../models/Notification');
    const { sendNotificationUpdate } = require('./notifications');
    
    console.log('🔔 Clinician assigned - sending notification...');
    
    // Create notification for the assigned clinician
    const notification = await Notification.create({
      user: req.body.clinician,
      type: 'case_assigned',
      title: 'New Case Assignment',
      message: `You have been assigned to case ${caseDoc.caseNumber} for worker ${caseDoc.worker.firstName} ${caseDoc.worker.lastName}`,
      case: caseDoc._id,
      isRead: false,
      priority: 'high'
    });
    
    // Send real-time update to clinician
    await sendNotificationUpdate(req.body.clinician);
    
    console.log('✅ Clinician assignment notification sent');
    
  } catch (notificationError) {
    console.error('❌ Error sending clinician assignment notification:', notificationError);
    // Don't fail the assignment if notification fails
  }

  res.json({
    message: 'Clinician assigned successfully',
    case: caseDoc
  });
}));

// @route   PUT /api/cases/:id/update-status
// @desc    Update case status
// @access  Private (Case Manager, Clinician, Admin)
router.put('/:id/update-status', [
  authMiddleware,
  body('status').isIn(['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed']).withMessage('Valid status is required'),
  body('notes').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const caseDoc = await Case.findById(req.params.id);

  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'admin' ||
    req.user.role === 'case_manager' ||
    (req.user.role === 'clinician' && caseDoc.clinician?.toString() === req.user._id.toString());

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Update case status
  const oldStatus = caseDoc.status;
  caseDoc.status = req.body.status;
  
  // Add status change note
  if (req.body.notes) {
    caseDoc.notes.push({
      author: req.user._id,
      content: `Status changed from ${oldStatus} to ${req.body.status}: ${req.body.notes}`,
      type: 'status_change'
    });
  }

  // Set dates based on status
  if (req.body.status === 'return_to_work' && !caseDoc.actualReturnDate) {
    caseDoc.actualReturnDate = new Date();
  }

  await caseDoc.save();

  // Populate the updated case
  await caseDoc.populate([
    { path: 'worker', select: 'firstName lastName email phone' },
    { path: 'employer', select: 'firstName lastName email phone' },
    { path: 'caseManager', select: 'firstName lastName email phone' },
    { path: 'clinician', select: 'firstName lastName email phone' },
    { path: 'incident', select: 'incidentNumber incidentDate description' }
  ]);

  // 🔔 NOTIFICATION: Send notification for important status changes
  if (req.body.status === 'closed' || req.body.status === 'return_to_work') {
    try {
      const Notification = require('../models/Notification');
      const { sendNotificationUpdate } = require('./notifications');
      
      console.log(`🔔 Case status changed to ${req.body.status} - sending notifications...`);
      
      const notifications = [];
      const statusType = req.body.status === 'closed' ? 'case_closed' : 'return_to_work';
      const statusTitle = req.body.status === 'closed' ? 'Case Closed' : 'Return to Work';
      
      // Notify Case Manager
      if (caseDoc.caseManager) {
        const message = req.body.status === 'closed' 
          ? `Case ${caseDoc.caseNumber} has been closed by ${req.user.firstName} ${req.user.lastName}`
          : `Worker ${caseDoc.worker.firstName} ${caseDoc.worker.lastName} has returned to work for case ${caseDoc.caseNumber}`;
          
        notifications.push({
          user: caseDoc.caseManager._id,
          type: statusType,
          title: statusTitle,
          message: message,
          case: caseDoc._id,
          isRead: false,
          priority: 'medium'
        });
      }
      
      // Notify Worker
      if (caseDoc.worker) {
        const message = req.body.status === 'closed' 
          ? `Your rehabilitation case ${caseDoc.caseNumber} has been closed. Thank you for your cooperation.`
          : `Congratulations! You have successfully returned to work. Case ${caseDoc.caseNumber} is now complete.`;
          
        notifications.push({
          user: caseDoc.worker._id,
          type: statusType,
          title: statusTitle,
          message: message,
          case: caseDoc._id,
          isRead: false,
          priority: 'medium'
        });
      }
      
      // Notify Employer
      if (caseDoc.employer) {
        const message = req.body.status === 'closed' 
          ? `Case ${caseDoc.caseNumber} for worker ${caseDoc.worker.firstName} ${caseDoc.worker.lastName} has been closed`
          : `Great news! Worker ${caseDoc.worker.firstName} ${caseDoc.worker.lastName} has returned to work. Case ${caseDoc.caseNumber} is complete.`;
          
        notifications.push({
          user: caseDoc.employer._id,
          type: statusType,
          title: statusTitle,
          message: message,
          case: caseDoc._id,
          isRead: false,
          priority: 'medium'
        });
      }
      
      // Notify Clinician (if different from the one updating)
      if (caseDoc.clinician && caseDoc.clinician._id.toString() !== req.user._id.toString()) {
        const message = req.body.status === 'closed' 
          ? `Case ${caseDoc.caseNumber} has been closed by ${req.user.firstName} ${req.user.lastName}`
          : `Worker ${caseDoc.worker.firstName} ${caseDoc.worker.lastName} has returned to work for case ${caseDoc.caseNumber}`;
          
        notifications.push({
          user: caseDoc.clinician._id,
          type: statusType,
          title: statusTitle,
          message: message,
          case: caseDoc._id,
          isRead: false,
          priority: 'medium'
        });
      }
      
      // Create notifications
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        console.log(`✅ Sent ${notifications.length} case status notifications`);
        
        // Send real-time updates
        for (const notification of notifications) {
          await sendNotificationUpdate(notification.user);
        }
      }
      
    } catch (notificationError) {
      console.error('❌ Error sending case status notifications:', notificationError);
      // Don't fail the case update if notifications fail
    }
  }

  res.json({
    message: 'Case status updated successfully',
    case: caseDoc
  });
}));

// @route   GET /api/cases/dashboard/stats
// @desc    Get case statistics for dashboard
// @access  Private
router.get('/dashboard/stats', authMiddleware, asyncHandler(async (req, res) => {
  const filter = {};
  
  // Role-based filtering
  switch (req.user.role) {
    case 'worker':
      filter.worker = req.user._id;
      break;
    case 'employer':
      filter.employer = req.user._id;
      break;
    case 'clinician':
      filter.clinician = req.user._id;
      break;
    case 'case_manager':
      filter.caseManager = req.user._id;
      break;
    case 'site_supervisor':
      const employer = await User.findById(req.user.employer);
      if (employer) {
        filter.employer = employer._id;
      }
      break;
  }

  const stats = await Case.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const priorityStats = await Case.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    statusStats: stats,
    priorityStats: priorityStats
  });
}));

module.exports = router;
