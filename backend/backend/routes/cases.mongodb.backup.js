const express = require('express');
const { body, query } = require('express-validator');
const mongoose = require('mongoose');
const Case = require('../models/Case');
const Incident = require('../models/Incident');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const NotificationService = require('../services/NotificationService');
const AutoAssignmentService = require('../services/AutoAssignmentService');
const { getMyCases, getCases, getCaseById } = require('../controllers/caseController');
// Import centralized validators
const { 
  validateCaseCreate,
  validateCaseUpdate,
  handleValidationErrors,
  isMongoId,
  isMongoIdBody,
  validatePagination 
} = require('../middleware/validators');

const router = express.Router();

// Middleware to log request details
router.use((req, res, next) => {
  console.log('Case API Request:', {
    method: req.method,
    url: req.url,
    userId: req?.user?._id,
    userRole: req?.user?.role,
    params: req.params,
    query: req.query,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  });
  next();
});

// @route   GET /api/cases/my-cases
// @desc    Get cases assigned to the current user
// @access  Private
router.get('/my-cases', [
  authMiddleware
], asyncHandler(getMyCases));

// @route   GET /api/cases/diagnostic/:id
// @desc    Get diagnostic information about a case
// @access  Private (Admin only) - LOCALHOST ONLY
router.get('/diagnostic/:id', [
  authMiddleware,
  roleMiddleware('admin')
], asyncHandler(async (req, res) => {
  try {
    // Security: Only allow from localhost
    const clientIP = req.ip || req.connection.remoteAddress;
    if (clientIP !== '127.0.0.1' && clientIP !== '::1' && clientIP !== '::ffff:127.0.0.1') {
      return res.status(403).json({ message: 'Access denied - diagnostic endpoint only available from localhost' });
    }

    // Get database information
    const dbInfo = {
      databaseName: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      collections: await mongoose.connection.db.listCollections().toArray().then(cols => cols.map(c => c.name))
    };

    // Try to find the case in the current database
    const caseDoc = await Case.findById(req.params.id).lean();
    
    // Try to find the case directly in the cases collection
    const rawCase = await mongoose.connection.db.collection('cases').findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
    
    // Get the Case model information
    const caseModelInfo = {
      collectionName: Case.collection.name,
      schema: Object.keys(Case.schema.paths),
      modelName: Case.modelName
    };
    
    res.json({
      dbInfo,
      caseExists: !!caseDoc,
      rawCaseExists: !!rawCase,
      caseDetails: caseDoc,
      caseModelInfo,
      caseId: req.params.id
    });
  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({ 
      message: 'Error running diagnostics',
      error: error.message,
      stack: error.stack
    });
  }
}));

// @route   GET /api/cases/clinician-cases
// @desc    Get cases assigned to the logged-in clinician
// @access  Private (Clinician only)
router.get('/clinician-cases', [
  authMiddleware,
  roleMiddleware('clinician')
], asyncHandler(async (req, res) => {
  try {
    // Get the clinician's ID
    const clinicianId = req.user._id;
    
    // Find all cases assigned to this clinician
    const assignedCases = await Case.find({ clinician: clinicianId })
      .select('_id caseNumber status priority worker incident createdAt')
      .populate('worker', 'firstName lastName')
      .populate('incident', 'incidentNumber incidentDate incidentType severity')
      .sort({ createdAt: -1 });
    
    // Return the cases
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
  authMiddleware,
  isMongoId('id')
], asyncHandler(getCaseById));

// @route   POST /api/cases
// @desc    Create new case
// @access  Private (Admin, Case Manager)
router.post('/', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager'),
  validateCaseCreate,
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { worker, employer, incident, injuryDetails, priority, status, clinician } = req.body;

  // Verify worker exists and is active
  const workerDoc = await User.findById(worker);
  if (!workerDoc || workerDoc.role !== 'worker' || !workerDoc.isActive) {
    return res.status(400).json({ message: 'Invalid worker' });
  }

  // Verify employer exists and is active
  const employerDoc = await User.findById(employer);
  if (!employerDoc || employerDoc.role !== 'employer' || !employerDoc.isActive) {
    return res.status(400).json({ message: 'Invalid employer' });
  }

  // Verify incident exists if provided
  if (incident) {
    const incidentDoc = await Incident.findById(incident);
    if (!incidentDoc) {
      return res.status(400).json({ message: 'Invalid incident' });
    }
  }

  // Verify clinician exists and is active if provided
  let clinicianDoc = null;
  if (clinician) {
    clinicianDoc = await User.findById(clinician);
    if (!clinicianDoc || clinicianDoc.role !== 'clinician' || !clinicianDoc.isActive) {
      return res.status(400).json({ message: 'Invalid clinician' });
    }
  }

  // Use auto-assignment service for priority if not provided
  const AutoAssignmentService = require('../services/AutoAssignmentService');
  const assignedPriority = priority || AutoAssignmentService.autoAssignPriority({ 
    severity: injuryDetails?.severity, 
    incidentType: incident?.incidentType 
  });

  // Set status to 'triaged' if clinician is assigned
  const assignedStatus = clinician ? 'triaged' : (status || 'new');

  // Create case
  const caseDoc = new Case({
    worker,
    employer,
    caseManager: req.user._id, // Case manager who creates the case is assigned to it
    incident,
    injuryDetails,
    priority: assignedPriority,
    status: assignedStatus,
    clinician: clinician || undefined
  });

  await caseDoc.save();

  // Populate the created case
  await caseDoc.populate([
    { path: 'worker', select: 'firstName lastName email phone' },
    { path: 'employer', select: 'firstName lastName email phone' },
    { path: 'caseManager', select: 'firstName lastName email phone' },
    { path: 'clinician', select: 'firstName lastName email phone specialty' },
    { path: 'incident', select: 'incidentNumber incidentDate description' }
  ]);

  // Create notification for the worker
  try {
    await NotificationService.createNotification({
      recipient: worker,
      sender: req.user._id,
      type: 'case_created',
      title: 'New Case Created',
      message: `A new case (${caseDoc.caseNumber}) has been created for you. Please check your dashboard for details.`,
      relatedEntity: {
        type: 'case',
        id: caseDoc._id
      },
      priority: priority || 'medium',
      actionUrl: '/cases',
      metadata: {
        caseNumber: caseDoc.caseNumber,
        priority: priority || 'medium'
      }
    });
    
    // Send real-time update to worker
    console.log(`Notification created for worker ${worker} regarding case ${caseDoc.caseNumber}`);
  } catch (notificationError) {
    console.error('Error creating worker notification:', notificationError);
    // Don't fail the case creation if notification creation fails
  }

  // Create notification for the employer
  try {
    await NotificationService.createNotification({
      recipient: employer,
      sender: req.user._id,
      type: 'case_created',
      title: 'New Case Created',
      message: `A new case (${caseDoc.caseNumber}) has been created for your worker ${workerDoc.firstName} ${workerDoc.lastName}. Please check your dashboard for details.`,
      relatedEntity: {
        type: 'case',
        id: caseDoc._id
      },
      priority: priority || 'medium',
      actionUrl: '/cases',
      metadata: {
        caseNumber: caseDoc.caseNumber,
        priority: priority || 'medium',
        workerName: `${workerDoc.firstName} ${workerDoc.lastName}`
      }
    });
    
    // Send real-time update to employer
    console.log(`Notification created for employer ${employer} regarding case ${caseDoc.caseNumber}`);
  } catch (notificationError) {
    console.error('Error creating employer notification:', notificationError);
    // Don't fail the case creation if notification creation fails
  }
  
  // Create notification for the clinician if one was assigned
  if (clinician) {
    try {
      await NotificationService.createClinicianAssignmentNotification(
        clinician, 
        caseDoc._id, 
        {
          caseNumber: caseDoc.caseNumber,
          priority: caseDoc.priority,
          workerName: `${workerDoc.firstName} ${workerDoc.lastName}`,
          injuryType: caseDoc.injuryDetails?.injuryType || 'Not specified'
        },
        req.user._id
      );
      
      console.log(`Notification created for clinician ${clinician} regarding case assignment ${caseDoc.caseNumber}`);
    } catch (notificationError) {
      console.error('Error creating clinician notification:', notificationError);
      // Don't fail the case creation if notification creation fails
    }
  }

  res.status(201).json({
    message: 'Case created successfully',
    case: caseDoc
  });
}));

// @route   PUT /api/cases/:id/assign-clinician
// @desc    Assign clinician to case
// @access  Private (Admin, Case Manager)
router.put('/:id/assign-clinician', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager'),
  isMongoId('id'),
  isMongoIdBody('clinicianId'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { clinicianId } = req.body;

  // Verify clinician exists and is active
  const clinician = await User.findById(clinicianId);
  if (!clinician || clinician.role !== 'clinician' || !clinician.isActive) {
    return res.status(400).json({ message: 'Invalid clinician' });
  }

  // Find case
  const caseDoc = await Case.findById(req.params.id);
  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Check if user is the case manager or admin
  if (req.user.role !== 'admin' && caseDoc.caseManager.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Update case with clinician
  caseDoc.clinician = clinicianId;
  
  // Update status to triaged if currently new
  if (caseDoc.status === 'new') {
    caseDoc.status = 'triaged';
    caseDoc.statusHistory.push({
      status: 'triaged',
      changedBy: req.user._id,
      changedAt: new Date(),
      notes: 'Clinician assigned'
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

  // Create notification for the clinician
  try {
    await NotificationService.createClinicianAssignmentNotification(
      clinicianId, 
      caseDoc._id, 
      {
        caseNumber: caseDoc.caseNumber,
        priority: caseDoc.priority,
        workerName: `${caseDoc.worker.firstName} ${caseDoc.worker.lastName}`,
        injuryType: caseDoc.injuryDetails?.injuryType || 'Not specified'
      },
      req.user._id
    );
    
    console.log(`Notification created for clinician ${clinicianId} regarding case assignment ${caseDoc.caseNumber}`);
  } catch (notificationError) {
    console.error('Error creating clinician notification:', notificationError);
    // Don't fail the case update if notification creation fails
  }

  res.json({
    message: 'Clinician assigned successfully',
    case: caseDoc
  });
}));

// @route   PUT /api/cases/:id/status
// @desc    Update case status
// @access  Private (Admin, Case Manager, Clinician)
router.put('/:id/status', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'clinician'),
  isMongoId('id'),
  body('status').isIn(['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed']).withMessage('Valid status is required'),
  body('notes').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  // Find case
  const caseDoc = await Case.findById(req.params.id);
  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Check permissions
  const canUpdateStatus = 
    req.user.role === 'admin' ||
    (req.user.role === 'case_manager' && caseDoc.caseManager.toString() === req.user._id.toString()) ||
    (req.user.role === 'clinician' && caseDoc.clinician?.toString() === req.user._id.toString());

  if (!canUpdateStatus) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Validate status transition - allowing bidirectional movement
  const validTransitions = {
    'new': ['triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed'],
    'triaged': ['new', 'assessed', 'in_rehab', 'return_to_work', 'closed'],
    'assessed': ['new', 'triaged', 'in_rehab', 'return_to_work', 'closed'],
    'in_rehab': ['new', 'triaged', 'assessed', 'return_to_work', 'closed'],
    'return_to_work': ['new', 'triaged', 'assessed', 'in_rehab', 'closed'],
    'closed': ['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work']
  };

  if (!validTransitions[caseDoc.status].includes(status) && caseDoc.status !== status) {
    return res.status(400).json({ 
      message: `Invalid status transition from ${caseDoc.status} to ${status}`,
      validTransitions: validTransitions[caseDoc.status]
    });
  }

  // Store the old status before updating
  const oldStatus = caseDoc.status;
  
  try {
    // Update case status
    caseDoc.status = status;
    
    // Add status history entry
    caseDoc.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedAt: new Date(),
      notes: notes || `Status changed from ${oldStatus} to ${status}`
    });

    // Set closed date if status is closed
    if (status === 'closed') {
      caseDoc.closedDate = new Date();
      caseDoc.closedBy = req.user._id;
    }

    await caseDoc.save();
  } catch (error) {
    console.error('Error updating case status:', error);
    return res.status(500).json({
      message: 'Failed to update case status',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }

  // Populate the updated case
  try {
    await caseDoc.populate([
      { path: 'worker', select: 'firstName lastName email phone' },
      { path: 'employer', select: 'firstName lastName email phone' },
      { path: 'caseManager', select: 'firstName lastName email phone' },
      { path: 'clinician', select: 'firstName lastName email phone' },
      { path: 'incident', select: 'incidentNumber incidentDate description' }
    ]);
  } catch (error) {
    console.error('Error populating case data:', error);
    // Continue without populated data rather than failing
    console.log('Continuing with unpopulated case data');
  }

  // Create notifications for status change
  try {
    // Verify required data is available
    if (!caseDoc.worker || !caseDoc.worker._id) {
      console.error('Cannot create notifications: Worker data missing');
      throw new Error('Worker data missing');
    }
    
    // Batch notifications for all stakeholders
    const notifications = [];
    
    // Worker notification
    notifications.push({
      recipient: caseDoc.worker._id,
      sender: req.user._id,
      type: 'case_status_change',
      title: 'Case Status Updated',
      message: `Your case (${caseDoc.caseNumber}) status has been updated from ${oldStatus} to ${status}.`,
      relatedEntity: {
        type: 'case',
        id: caseDoc._id
      },
      priority: 'medium',
      actionUrl: '/cases',
      metadata: {
        caseNumber: caseDoc.caseNumber,
        oldStatus,
        newStatus: status
      }
    });
    
    // Employer notification
    if (caseDoc.employer && caseDoc.employer._id) {
      notifications.push({
        recipient: caseDoc.employer._id,
        sender: req.user._id,
        type: 'case_status_change',
        title: 'Case Status Updated',
        message: `Case #${caseDoc.caseNumber} status has been updated from ${oldStatus} to ${status}.`,
        relatedEntity: {
          type: 'case',
          id: caseDoc._id
        },
        priority: 'medium',
        actionUrl: '/cases',
        metadata: {
          caseNumber: caseDoc.caseNumber,
          oldStatus,
          newStatus: status,
          workerName: caseDoc.worker.firstName && caseDoc.worker.lastName ? 
            `${caseDoc.worker.firstName} ${caseDoc.worker.lastName}` : 'Worker'
        }
      });
    }
    
    // Case manager notification (if not the one who made the change)
    if (caseDoc.caseManager && caseDoc.caseManager._id.toString() !== req.user._id.toString()) {
      notifications.push({
        recipient: caseDoc.caseManager._id,
        sender: req.user._id,
        type: 'case_status_change',
        title: 'Case Status Updated',
        message: `Case #${caseDoc.caseNumber} status has been updated from ${oldStatus} to ${status}.`,
        relatedEntity: {
          type: 'case',
          id: caseDoc._id
        },
        priority: 'medium',
        actionUrl: `/cases/${caseDoc._id}`,
        metadata: {
          caseNumber: caseDoc.caseNumber,
          oldStatus,
          newStatus: status,
          workerName: `${caseDoc.worker.firstName} ${caseDoc.worker.lastName}`
        }
      });
    }
    
    // Clinician notification (if assigned and not the one who made the change)
    if (caseDoc.clinician && caseDoc.clinician._id.toString() !== req.user._id.toString()) {
      notifications.push({
        recipient: caseDoc.clinician._id,
        sender: req.user._id,
        type: 'case_status_change',
        title: 'Case Status Updated',
        message: `Case #${caseDoc.caseNumber} status has been updated from ${oldStatus} to ${status}.`,
        relatedEntity: {
          type: 'case',
          id: caseDoc._id
        },
        priority: 'medium',
        actionUrl: `/cases/${caseDoc._id}`,
        metadata: {
          caseNumber: caseDoc.caseNumber,
          oldStatus,
          newStatus: status,
          workerName: `${caseDoc.worker.firstName} ${caseDoc.worker.lastName}`
        }
      });
    }
    
    // Send batch notifications if there are any
    if (notifications.length > 0) {
      await NotificationService.createBatchNotifications(notifications);
      console.log(`Created ${notifications.length} notifications for case status change`);
    } else {
      console.log('No notifications to send for case status change');
    }
  } catch (notificationError) {
    console.error('Error creating status change notifications:', notificationError);
    // Don't fail the case update if notification creation fails
  }

  res.json({
    message: 'Case status updated successfully',
    case: caseDoc
  });
}));

// @route   PUT /api/cases/:id
// @desc    Update case
// @access  Private (Admin, Case Manager, Clinician)
router.put('/:id', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'clinician'),
  isMongoId('id'),
  validateCaseUpdate,
  handleValidationErrors
], asyncHandler(async (req, res) => {
  // Find case
  const caseDoc = await Case.findById(req.params.id);
  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'admin' ||
    (req.user.role === 'case_manager' && caseDoc.caseManager.toString() === req.user._id.toString()) ||
    (req.user.role === 'clinician' && caseDoc.clinician?.toString() === req.user._id.toString());

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Don't allow updating worker, employer, or incident
  const { worker, employer, incident, status, ...updateData } = req.body;

  // Status updates should use the dedicated endpoint
  if (status && status !== caseDoc.status) {
    return res.status(400).json({ 
      message: 'Use the /api/cases/:id/status endpoint to update case status' 
    });
  }

  // Update case
  Object.assign(caseDoc, updateData);
  await caseDoc.save();

  // Populate the updated case
  await caseDoc.populate([
    { path: 'worker', select: 'firstName lastName email phone' },
    { path: 'employer', select: 'firstName lastName email phone' },
    { path: 'caseManager', select: 'firstName lastName email phone' },
    { path: 'clinician', select: 'firstName lastName email phone' },
    { path: 'incident', select: 'incidentNumber incidentDate description' }
  ]);

  res.json({
    message: 'Case updated successfully',
    case: caseDoc
  });
}));

// @route   PUT /api/cases/:id/work-restrictions
// @desc    Update case work restrictions
// @access  Private (Admin, Case Manager, Clinician)
router.put('/:id/work-restrictions', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager', 'clinician'),
  isMongoId('id'),
  body('workRestrictions').isObject().withMessage('Work restrictions object is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { workRestrictions } = req.body;

  // Find case
  const caseDoc = await Case.findById(req.params.id);
  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'admin' ||
    (req.user.role === 'case_manager' && caseDoc.caseManager.toString() === req.user._id.toString()) ||
    (req.user.role === 'clinician' && caseDoc.clinician?.toString() === req.user._id.toString());

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Store old restrictions for notification
  const oldRestrictions = { ...caseDoc.workRestrictions };

  // Update work restrictions
  caseDoc.workRestrictions = workRestrictions;
  
  // Add to work restrictions history
  caseDoc.workRestrictionsHistory.push({
    restrictions: workRestrictions,
    updatedBy: req.user._id,
    updatedAt: new Date(),
    notes: 'Work restrictions updated'
  });

  await caseDoc.save();

  // Populate the updated case
  await caseDoc.populate([
    { path: 'worker', select: 'firstName lastName email phone' },
    { path: 'employer', select: 'firstName lastName email phone' },
    { path: 'caseManager', select: 'firstName lastName email phone' },
    { path: 'clinician', select: 'firstName lastName email phone' }
  ]);

  // Create notifications for work restriction updates
  try {
    // Batch notifications for stakeholders
    const notifications = [];
    
    // Worker notification
    notifications.push({
      recipient: caseDoc.worker._id,
      sender: req.user._id,
      type: 'case_status_change',
      title: 'Work Restrictions Updated',
      message: `Your work restrictions for case #${caseDoc.caseNumber} have been updated. Please review the changes.`,
      relatedEntity: {
        type: 'case',
        id: caseDoc._id
      },
      priority: 'high',
      actionUrl: '/cases',
      metadata: {
        caseNumber: caseDoc.caseNumber,
        oldRestrictions,
        newRestrictions: workRestrictions
      }
    });
    
    // Employer notification
    notifications.push({
      recipient: caseDoc.employer._id,
      sender: req.user._id,
      type: 'case_status_change',
      title: 'Worker Restrictions Updated',
      message: `Work restrictions for ${caseDoc.worker.firstName} ${caseDoc.worker.lastName} (Case #${caseDoc.caseNumber}) have been updated. Please review the changes.`,
      relatedEntity: {
        type: 'case',
        id: caseDoc._id
      },
      priority: 'high',
      actionUrl: '/cases',
      metadata: {
        caseNumber: caseDoc.caseNumber,
        workerName: `${caseDoc.worker.firstName} ${caseDoc.worker.lastName}`,
        oldRestrictions,
        newRestrictions: workRestrictions
      }
    });
    
    // Send batch notifications
    await NotificationService.createBatchNotifications(notifications);
    
    console.log(`Created ${notifications.length} notifications for work restriction updates`);
  } catch (notificationError) {
    console.error('Error creating work restriction update notifications:', notificationError);
    // Don't fail the case update if notification creation fails
  }

  res.json({
    message: 'Work restrictions updated successfully',
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
      if (req.user.employer) {
        filter.employer = req.user.employer;
      }
      break;
  }

  const statusStats = await Case.aggregate([
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

  // Get recent cases (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentCases = await Case.countDocuments({
    ...filter,
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Get active cases (not closed)
  const activeCases = await Case.countDocuments({
    ...filter,
    status: { $ne: 'closed' }
  });

  res.json({
    statusStats,
    priorityStats,
    recentCases,
    activeCases
  });
}));

// @route   GET /api/cases/auto-assignment
// @desc    Get auto-assignment suggestions
// @access  Private (Admin, Case Manager)
router.get('/auto-assignment', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager')
], asyncHandler(async (req, res) => {
  // Get case managers with workload stats
  const caseManagerStats = await AutoAssignmentService.getCaseManagerWorkloadStats();
  
  // Get clinicians with workload stats
  const clinicianStats = await AutoAssignmentService.getClinicianWorkloadStats();

  res.json({
    caseManagers: caseManagerStats,
    clinicians: clinicianStats
  });
}));

module.exports = router;