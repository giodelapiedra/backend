const express = require('express');
const { body, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Incident = require('../models/Incident');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const NotificationService = require('../services/NotificationService');
// Import centralized validators
const { 
  validateIncident,
  handleValidationErrors,
  isMongoId,
  validatePagination,
  validateDateRange 
} = require('../middleware/validators');

const router = express.Router();

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/incidents');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'incident-' + uniqueSuffix + extension);
  }
});

const fileFilter = (req, file, cb) => {
  // Define allowed MIME types explicitly
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, GIF, and WebP image files are allowed!'), false);
  }
  
  // Additional validation: check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error('Invalid file extension. Only .jpg, .jpeg, .png, .gif, .webp are allowed!'), false);
  }
  
  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// @route   GET /api/incidents
// @desc    Get all incidents (with filtering and pagination)
// @access  Private
router.get('/', [
  authMiddleware,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['reported', 'investigating', 'investigated', 'closed']),
  query('severity').optional().isIn(['near_miss', 'first_aid', 'medical_treatment', 'lost_time', 'fatality']),
  query('incidentType').optional().isIn(['slip_fall', 'struck_by', 'struck_against', 'overexertion', 'cut_laceration', 'burn', 'crush', 'other']),
  query('search').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const filter = {};
  
  // Role-based filtering
  switch (req.user.role) {
    case 'worker':
      filter.worker = req.user._id;
      break;
    case 'employer':
      filter.employer = req.user._id;
      break;
    case 'site_supervisor':
      // Site supervisors can see incidents from their employer (if assigned) or all incidents if not assigned
      if (req.user.employer) {
        const employer = await User.findById(req.user.employer);
        if (employer) {
          filter.employer = employer._id;
        }
      }
      // If no employer assigned, site supervisor can see all incidents
      break;
    // Admin, Case Manager, Clinician, and GP/Insurer can see all incidents
  }
  
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  if (req.query.severity) {
    filter.severity = req.query.severity;
  }
  
  if (req.query.incidentType) {
    filter.incidentType = req.query.incidentType;
  }
  
  if (req.query.search) {
    filter.$or = [
      { incidentNumber: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const incidents = await Incident.find(filter)
    .populate('reportedBy', 'firstName lastName email phone')
    .populate('worker', 'firstName lastName email phone')
    .populate('employer', 'firstName lastName email phone')
    .populate('closedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Incident.countDocuments(filter);

  res.json({
    incidents,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

// @route   GET /api/incidents/:id
// @desc    Get incident by ID
// @access  Private
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id)
    .populate('reportedBy', 'firstName lastName email phone')
    .populate('worker', 'firstName lastName email phone address')
    .populate('employer', 'firstName lastName email phone')
    .populate('closedBy', 'firstName lastName email');

  if (!incident) {
    return res.status(404).json({ message: 'Incident not found' });
  }

  // Check access permissions
  const hasAccess = 
    req.user.role === 'admin' ||
    req.user.role === 'case_manager' ||
    req.user.role === 'clinician' ||
    req.user.role === 'gp_insurer' ||
    incident.worker._id.toString() === req.user._id.toString() ||
    incident.employer._id.toString() === req.user._id.toString() ||
    incident.reportedBy._id.toString() === req.user._id.toString() ||
    (req.user.role === 'site_supervisor' && (
      !req.user.employer || // Site supervisor without employer can see all incidents
      incident.employer._id.toString() === req.user.employer?.toString()
    ));

  if (!hasAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ incident });
}));

// @route   POST /api/incidents/report
// @desc    Report incident with photo upload (Mobile App)
// @access  Private (All authenticated users)
router.post('/report', [
  authMiddleware,
  // Removed roleMiddleware('worker') - now all authenticated users can upload photos
  upload.single('image')
], asyncHandler(async (req, res) => {
  try {
    // Log incident report attempt (secure - no sensitive data)
    console.log('📝 Incident report submitted by role:', req.user?.role);
    
    const { feltUnsafe, hazards, comments } = req.body;
    
    // Validate required fields
    if (feltUnsafe === undefined || feltUnsafe === null) {
      return res.status(400).json({ message: 'Please answer if you felt unsafe today' });
    }
    
    if (feltUnsafe === 'true' && (!hazards || JSON.parse(hazards).length === 0)) {
      return res.status(400).json({ message: 'Please select at least one hazard' });
    }

    // Create incident data
    const incidentData = {
      reportedBy: req.user._id,
      worker: req.user._id,
      employer: req.user.employer, // Worker's employer
      incidentDate: new Date(),
      incidentType: 'other', // Default type for mobile reports
      severity: 'near_miss', // Default severity for mobile reports
      description: `Mobile incident report: ${feltUnsafe === 'true' ? 'Worker felt unsafe' : 'No safety concerns'}. ${comments || ''}`,
      location: {
        site: 'Mobile Report',
        department: 'Field',
        specificLocation: 'Mobile Device'
      },
      status: 'reported'
    };

    // Add photo if uploaded
    if (req.file) {
      incidentData.photos = [{
        url: `/uploads/incidents/${req.file.filename}`,
        caption: 'Incident photo from mobile report',
        uploadedAt: new Date()
      }];
    }

    // Create incident
    const incident = new Incident(incidentData);
    await incident.save();

    // Populate the incident
    await incident.populate([
      { path: 'reportedBy', select: 'firstName lastName email' },
      { path: 'worker', select: 'firstName lastName email' },
      { path: 'employer', select: 'firstName lastName email' }
    ]);

    // Create notification for employer/supervisor
    try {
      if (req.user.employer) {
        await NotificationService.createIncidentNotification(req.user.employer, incident._id, {
          reportedBy: req.user._id,
          incidentNumber: incident.incidentNumber,
          severity: incident.severity,
          incidentType: incident.incidentType,
          incidentDate: incident.incidentDate,
          hasPhoto: !!req.file
        });
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the incident creation if notification fails
    }

    // 🔔 NOTIFY CASE MANAGER: Send notification to case manager about new mobile incident
    try {
      const caseManager = await User.findOne({ role: 'case_manager', isActive: true });
      if (caseManager) {
        await NotificationService.createNotification({
          recipient: caseManager._id,
          sender: req.user._id,
          type: 'incident_reported',
          title: '📱 Mobile Incident Report',
          message: `${req.user.firstName} ${req.user.lastName} submitted a mobile incident report (${incident.incidentNumber}). Please review and create a case if needed.`,
          relatedEntity: {
            type: 'incident',
            id: incident._id
          },
          priority: 'medium',
          actionUrl: '/incidents',
          metadata: {
            incidentNumber: incident.incidentNumber,
            severity: incident.severity,
            incidentType: incident.incidentType,
            reportedBy: req.user._id,
            reportedByName: `${req.user.firstName} ${req.user.lastName}`,
            hasPhoto: !!req.file,
            isMobileReport: true
          }
        });
        
        console.log(`✅ Case Manager notified about mobile incident ${incident.incidentNumber}`);
      } else {
        console.log('⚠️ No case manager found to notify about mobile incident');
      }
    } catch (caseManagerNotificationError) {
      console.error('❌ Error notifying case manager about mobile incident:', caseManagerNotificationError);
      // Don't fail the incident creation if case manager notification fails
    }

    res.status(201).json({
      message: 'Incident report submitted successfully',
      incident: {
        id: incident._id,
        incidentNumber: incident.incidentNumber,
        status: incident.status,
        hasPhoto: !!req.file,
        photoUrl: req.file ? `/uploads/incidents/${req.file.filename}` : null
      }
    });

  } catch (error) {
    console.error('Error creating incident report:', error);
    
    // Clean up uploaded file if incident creation failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: 'Failed to submit incident report', 
      error: error.message 
    });
  }
}));

// @route   POST /api/incidents
// @desc    Create new incident
// @access  Private (Employer, Site Supervisor, Admin, Case Manager)
router.post('/', [
  authMiddleware,
  roleMiddleware('employer', 'site_supervisor', 'admin', 'case_manager'),
  upload.array('photos', 5), // Allow up to 5 photos
  // Note: Validation is handled manually in the route handler for form data
], asyncHandler(async (req, res) => {
  try {
    const { worker, incidentDate, incidentType, severity, description, location, immediateCause, rootCause, immediateActions, correctiveActions, preventiveActions } = req.body;

    // Manual validation for form data
    if (!worker) {
      return res.status(400).json({ message: 'Valid worker ID is required' });
    }
    if (!incidentDate) {
      return res.status(400).json({ message: 'Valid incident date is required' });
    }
    if (!incidentType || !['slip_fall', 'struck_by', 'struck_against', 'overexertion', 'cut_laceration', 'burn', 'crush', 'other'].includes(incidentType)) {
      return res.status(400).json({ message: 'Valid incident type is required' });
    }
    if (!severity || !['near_miss', 'first_aid', 'medical_treatment', 'lost_time', 'fatality'].includes(severity)) {
      return res.status(400).json({ message: 'Valid severity is required' });
    }
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Description is required' });
    }

    // Verify worker exists and is active
    const workerDoc = await User.findById(worker);
    if (!workerDoc || workerDoc.role !== 'worker' || !workerDoc.isActive) {
      return res.status(400).json({ message: 'Invalid worker' });
    }

    // Determine employer based on user role
    let employerId;
    if (req.user.role === 'employer') {
      employerId = req.user._id;
    } else if (req.user.role === 'site_supervisor') {
      // Site supervisor can report incidents directly
      // If they have an employer assigned, use that; otherwise, they can report for any employer
      if (req.user.employer) {
        employerId = req.user.employer;
      } else if (req.body.employer) {
        // Allow site supervisor to specify employer if not assigned to one
        const employerDoc = await User.findById(req.body.employer);
        if (!employerDoc || employerDoc.role !== 'employer' || !employerDoc.isActive) {
          return res.status(400).json({ message: 'Invalid employer' });
        }
        employerId = req.body.employer;
      } else {
        return res.status(400).json({ message: 'Employer ID is required for site supervisor incident reporting' });
      }
    } else {
      // Admin or Case Manager - need to specify employer
      if (!req.body.employer) {
        return res.status(400).json({ message: 'Employer ID is required' });
      }
      const employerDoc = await User.findById(req.body.employer);
      if (!employerDoc || employerDoc.role !== 'employer' || !employerDoc.isActive) {
        return res.status(400).json({ message: 'Invalid employer' });
      }
      employerId = req.body.employer;
    }

    // Handle photo uploads
    const photos = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        photos.push({
          url: `/uploads/incidents/${file.filename}`,
          caption: `Incident photo uploaded by ${req.user.firstName} ${req.user.lastName}`,
          uploadedAt: new Date()
        });
      });
    }

    // Parse array fields from form data
    const parseArrayField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      return [];
    };

    const incident = new Incident({
      reportedBy: req.user._id,
      worker,
      employer: employerId,
      incidentDate,
      incidentType,
      severity,
      description,
      location: location || {},
      immediateCause,
      rootCause,
      immediateActions: parseArrayField(immediateActions),
      correctiveActions: parseArrayField(correctiveActions),
      preventiveActions: parseArrayField(preventiveActions),
      photos: photos,
      status: 'reported'
    });

    await incident.save();

    // Populate the created incident
    await incident.populate([
      { path: 'reportedBy', select: 'firstName lastName email phone' },
      { path: 'worker', select: 'firstName lastName email phone' },
      { path: 'employer', select: 'firstName lastName email phone' }
    ]);

    // Automatically create case for ALL incidents to ensure workers can check in
    // This ensures proper tracking and follow-up for all workplace incidents
    try {
      console.log('Creating automatic case for incident:', incident._id);
      const Case = require('../models/Case');
      
      // Use auto-assignment service to find case manager and clinician
      const AutoAssignmentService = require('../services/AutoAssignmentService');
      const caseManager = await AutoAssignmentService.autoAssignCaseManager();
      
      if (caseManager) {
        // Determine priority based on severity using auto-assignment service
        const priority = AutoAssignmentService.autoAssignPriority({ severity, incidentType });
        
        const caseDoc = new Case({
          worker,
          employer: employerId,
          caseManager: caseManager._id,
          clinician: clinician ? clinician._id : undefined,
          incident: incident._id,
          priority: priority,
            injuryDetails: {
              bodyPart: incidentType === 'slip_fall' ? 'back' : 
                       incidentType === 'struck_by' ? 'head' :
                       incidentType === 'overexertion' ? 'back' :
                       incidentType === 'cut_laceration' ? 'hand' : 'multiple',
              injuryType: incidentType,
              severity: severity,
              description: description
            },
            workRestrictions: {
              lifting: {
                maxWeight: severity === 'fatality' ? 0 : 
                          severity === 'lost_time' ? 5 : 
                          severity === 'medical_treatment' ? 10 : 
                          severity === 'first_aid' ? 20 : 25,
                frequency: severity === 'near_miss' ? 'normal' : 'limited',
                duration: 'as tolerated'
              },
              standing: {
                maxDuration: severity === 'fatality' ? 0 : 
                            severity === 'lost_time' ? 15 : 
                            severity === 'medical_treatment' ? 30 : 
                            severity === 'first_aid' ? 45 : 60,
                breaks: severity === 'near_miss' ? 1 : 2
              },
              sitting: {
                maxDuration: severity === 'fatality' ? 30 : 
                            severity === 'lost_time' ? 45 : 60,
                breaks: 1
              },
              bending: severity === 'fatality' || severity === 'lost_time' || severity === 'medical_treatment',
              twisting: severity === 'fatality' || severity === 'lost_time' || severity === 'medical_treatment',
              climbing: severity === 'fatality' || severity === 'lost_time' || severity === 'medical_treatment',
              driving: severity === 'fatality' || severity === 'lost_time' || severity === 'medical_treatment',
              other: severity === 'near_miss' ? 'Monitor for symptoms' : 'Follow medical restrictions'
            },
            status: 'new'
          });

          await caseDoc.save();

          // Populate the case
          await caseDoc.populate([
            { path: 'worker', select: 'firstName lastName email phone' },
            { path: 'employer', select: 'firstName lastName email phone' },
            { path: 'caseManager', select: 'firstName lastName email phone' },
            { path: 'clinician', select: 'firstName lastName email phone' },
            { path: 'incident', select: 'incidentNumber incidentDate description' }
          ]);
          
          // Update the incident status to 'closed' after automatic case creation
          incident.status = 'closed';
          await incident.save();

          console.log(`Case automatically created for incident ${incident.incidentNumber}: ${caseDoc._id}`);
          console.log(`Updated incident ${incident.incidentNumber} status to 'closed' after automatic case creation`);
          console.log('Case details:', {
            worker: caseDoc.worker,
            employer: caseDoc.employer,
            caseManager: caseDoc.caseManager,
            incident: caseDoc.incident,
            priority: caseDoc.priority
          });
        } else {
          console.log('No case manager found, skipping case creation');
        }
      } catch (caseError) {
        console.error('Error creating automatic case:', caseError);
        console.error('Case creation error details:', caseError.message);
        // Don't fail the incident creation if case creation fails
      }

      // Create notification for the worker
      try {
        await NotificationService.createIncidentNotification(worker, incident._id, {
          reportedBy: req.user._id,
          incidentNumber: incident.incidentNumber,
          severity: severity,
          incidentType: incidentType,
          incidentDate: incidentDate
        });
        
        console.log(`Notification created for worker ${worker} regarding incident ${incident.incidentNumber}`);
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the incident creation if notification creation fails
      }

      // 🔔 NOTIFY CASE MANAGER: Send notification to case manager about new incident
      try {
        const caseManager = await User.findOne({ role: 'case_manager', isActive: true });
        if (caseManager) {
          await NotificationService.createNotification({
            recipient: caseManager._id,
            sender: req.user._id,
            type: 'incident_reported',
            title: '🚨 New Incident Reported',
            message: `Site Supervisor ${req.user.firstName} ${req.user.lastName} reported a new incident (${incident.incidentNumber}). Please review and create a case.`,
            relatedEntity: {
              type: 'incident',
              id: incident._id
            },
            priority: 'high',
            actionUrl: '/incidents',
            metadata: {
              incidentNumber: incident.incidentNumber,
              severity: severity,
              incidentType: incidentType,
              reportedBy: req.user._id,
              reportedByName: `${req.user.firstName} ${req.user.lastName}`,
              workerId: worker,
              employerId: employerId
            }
          });
          
          console.log(`✅ Case Manager notified about incident ${incident.incidentNumber}`);
        } else {
          console.log('⚠️ No case manager found to notify about incident');
        }
      } catch (caseManagerNotificationError) {
        console.error('❌ Error notifying case manager:', caseManagerNotificationError);
        // Don't fail the incident creation if case manager notification fails
      }

    res.status(201).json({
      message: 'Incident reported successfully',
      incident
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Incident number already exists. Please try again.' });
    }
    res.status(500).json({ message: 'Failed to create incident', error: error.message });
  }
}));

// @route   PUT /api/incidents/:id
// @desc    Update incident
// @access  Private
router.put('/:id', [
  authMiddleware,
  body('status').optional().isIn(['reported', 'investigating', 'investigated', 'closed']),
  body('investigationNotes').optional().isString(),
  body('immediateCause').optional().isString(),
  body('rootCause').optional().isString(),
  body('correctiveActions').optional().isArray(),
  body('preventiveActions').optional().isArray(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id);

  if (!incident) {
    return res.status(404).json({ message: 'Incident not found' });
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'admin' ||
    req.user.role === 'case_manager' ||
    incident.reportedBy._id.toString() === req.user._id.toString() ||
    incident.employer._id.toString() === req.user._id.toString() ||
    (req.user.role === 'site_supervisor' && incident.employer._id.toString() === req.user.employer?.toString());

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Set closed date and closed by if status is being changed to closed
  if (req.body.status === 'closed' && incident.status !== 'closed') {
    req.body.closedDate = new Date();
    req.body.closedBy = req.user._id;
  }

  const updatedIncident = await Incident.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate([
    { path: 'reportedBy', select: 'firstName lastName email phone' },
    { path: 'worker', select: 'firstName lastName email phone' },
    { path: 'employer', select: 'firstName lastName email phone' },
    { path: 'closedBy', select: 'firstName lastName email' }
  ]);

  res.json({
    message: 'Incident updated successfully',
    incident: updatedIncident
  });
}));

// @route   GET /api/incidents/dashboard/stats
// @desc    Get incident statistics for dashboard
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
    case 'site_supervisor':
      const employer = await User.findById(req.user.employer);
      if (employer) {
        filter.employer = employer._id;
      }
      break;
  }

  const statusStats = await Incident.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const severityStats = await Incident.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 }
      }
    }
  ]);

  const typeStats = await Incident.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$incidentType',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get recent incidents (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentIncidents = await Incident.countDocuments({
    ...filter,
    createdAt: { $gte: thirtyDaysAgo }
  });

  res.json({
    statusStats,
    severityStats,
    typeStats,
    recentIncidents
  });
}));

module.exports = router;