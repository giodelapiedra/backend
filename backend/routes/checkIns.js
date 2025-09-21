const express = require('express');
const { body, query } = require('express-validator');
const CheckIn = require('../models/CheckIn');
const Case = require('../models/Case');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { handleValidationErrors, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @route   GET /api/check-ins
// @desc    Get check-ins for a worker
// @access  Private (Worker, Clinician, Case Manager)
router.get('/', [
  authMiddleware,
  query('case').optional().isMongoId(),
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
    filter.worker = req.user._id;
  } else if (req.user.role === 'clinician') {
    // Clinicians can see check-ins for their cases
    const cases = await Case.find({ clinician: req.user._id }).select('_id');
    if (cases.length === 0) {
      // No cases assigned, return empty result
      return res.json({
        checkIns: [],
        pagination: {
          current: page,
          pages: 0,
          total: 0
        }
      });
    }
    filter.case = { $in: cases.map(c => c._id) };
  } else if (req.user.role === 'case_manager') {
    // Case managers can see check-ins for their cases
    const cases = await Case.find({ caseManager: req.user._id }).select('_id');
    if (cases.length === 0) {
      // No cases assigned, return empty result
      return res.json({
        checkIns: [],
        pagination: {
          current: page,
          pages: 0,
          total: 0
        }
      });
    }
    filter.case = { $in: cases.map(c => c._id) };
  } else if (req.user.role === 'admin') {
    // Admins can see all check-ins (no filter applied)
  } else {
    // For other roles, return empty result
    return res.json({
      checkIns: [],
      pagination: {
        current: page,
        pages: 0,
        total: 0
      }
    });
  }
  
  if (req.query.case) {
    filter.case = req.query.case;
  }

  const checkIns = await CheckIn.find(filter)
    .populate('case', 'caseNumber status worker')
    .populate('worker', 'firstName lastName email')
    .populate('reviewedBy', 'firstName lastName role')
    .sort({ checkInDate: -1 })
    .skip(skip)
    .limit(limit);

  const total = await CheckIn.countDocuments(filter);

  res.json({
    checkIns,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

// @route   POST /api/check-ins
// @desc    Create a new check-in
// @access  Private (Worker)
router.post('/', [
  authMiddleware,
  roleMiddleware('worker'),
  body('case').isMongoId().withMessage('Valid case ID is required'),
  body('painLevel.current').isInt({ min: 0, max: 10 }).withMessage('Current pain level must be between 0-10'),
  body('painLevel.worst').optional().isInt({ min: 0, max: 10 }),
  body('painLevel.average').optional().isInt({ min: 0, max: 10 }),
  body('painLocation').optional().isArray(),
  body('painQuality').optional().isString(),
  body('painTriggers').optional().isArray(),
  body('functionalStatus.sleep').optional().isInt({ min: 0, max: 10 }),
  body('functionalStatus.mood').optional().isInt({ min: 0, max: 10 }),
  body('functionalStatus.energy').optional().isInt({ min: 0, max: 10 }),
  body('functionalStatus.mobility').optional().isInt({ min: 0, max: 10 }),
  body('functionalStatus.dailyActivities').optional().isInt({ min: 0, max: 10 }),
  body('medicationCompliance.taken').optional().isBoolean(),
  body('medicationCompliance.sideEffects').optional().isArray(),
  body('medicationCompliance.effectiveness').optional().isInt({ min: 0, max: 10 }),
  body('exerciseCompliance.completed').optional().isBoolean(),
  body('exerciseCompliance.exercises').optional().isArray(),
  body('exerciseCompliance.barriers').optional().isArray(),
  body('exerciseCompliance.modifications').optional().isString(),
  body('workStatus.workedToday').optional().isBoolean(),
  body('workStatus.hoursWorked').optional().isInt({ min: 0, max: 24 }),
  body('workStatus.tasksPerformed').optional().isArray(),
  body('workStatus.difficulties').optional().isArray(),
  body('workStatus.accommodations').optional().isArray(),
  body('workStatus.painAtWork').optional().isInt({ min: 0, max: 10 }),
  body('symptoms.swelling').optional().isBoolean(),
  body('symptoms.stiffness').optional().isBoolean(),
  body('symptoms.weakness').optional().isBoolean(),
  body('symptoms.numbness').optional().isBoolean(),
  body('symptoms.tingling').optional().isBoolean(),
  body('symptoms.other').optional().isString(),
  body('activities.household').optional().isString(),
  body('activities.social').optional().isString(),
  body('activities.recreational').optional().isString(),
  body('activities.other').optional().isString(),
  body('concerns').optional().isString(),
  body('questions').optional().isString(),
  body('goals').optional().isString(),
  body('notes').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { case: caseId, ...checkInData } = req.body;

  // Verify case exists and belongs to worker
  const caseDoc = await Case.findById(caseId).populate('clinician caseManager');
  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  if (caseDoc.worker.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Workers cannot create check-ins for closed cases
  if (caseDoc.status === 'closed') {
    return res.status(403).json({ 
      message: 'Cannot create check-ins for closed cases' 
    });
  }

  // Check if check-in already exists for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingCheckIn = await CheckIn.findOne({
    case: caseId,
    worker: req.user._id,
    checkInDate: {
      $gte: today,
      $lt: tomorrow
    }
  });

  if (existingCheckIn) {
    return res.status(400).json({ message: 'Check-in already exists for today' });
  }

  const checkIn = new CheckIn({
    case: caseId,
    worker: req.user._id,
    ...checkInData
  });

  await checkIn.save();

  // Populate the created check-in
  await checkIn.populate([
    { path: 'case', select: 'caseNumber status clinician caseManager worker' },
    { path: 'worker', select: 'firstName lastName email' }
  ]);

  // Try to find active rehabilitation plan for this case first
  let rehabilitationPlanId = null;
  try {
    const RehabilitationPlan = require('../models/RehabilitationPlan');
    const activePlan = await RehabilitationPlan.findOne({
      case: checkIn.case._id,
      status: 'active'
    });
    
    if (activePlan) {
      rehabilitationPlanId = activePlan._id;
    }
  } catch (error) {
    console.error('Error finding rehabilitation plan:', error);
  }

  // Create activity log for daily check-in
  const activityLog = new ActivityLog({
    worker: checkIn.worker._id,
    case: checkIn.case._id,
    clinician: checkIn.case.clinician?._id,
    rehabilitationPlan: rehabilitationPlanId, // Will be null if no active plan
    activityType: 'daily_check_in',
    title: `Daily Check-In - Case ${checkIn.case.caseNumber}`,
    description: `Worker completed daily check-in with pain level ${checkIn.painLevel?.current || 'N/A'}/10`,
    priority: checkIn.painLevel?.current >= 7 ? 'high' : checkIn.painLevel?.current >= 5 ? 'medium' : 'low',
    details: {
      checkIn: {
        painLevel: checkIn.painLevel?.current,
        sleepQuality: checkIn.functionalStatus?.sleep,
        mood: checkIn.functionalStatus?.mood,
        energy: checkIn.functionalStatus?.energy,
        mobility: checkIn.functionalStatus?.mobility,
        dailyActivities: checkIn.functionalStatus?.dailyActivities,
        workedToday: checkIn.workStatus?.workedToday,
        hoursWorked: checkIn.workStatus?.hoursWorked,
        difficulties: checkIn.workStatus?.difficulties,
        painAtWork: checkIn.workStatus?.painAtWork,
        symptoms: {
          swelling: checkIn.symptoms?.swelling,
          stiffness: checkIn.symptoms?.stiffness,
          weakness: checkIn.symptoms?.weakness,
          numbness: checkIn.symptoms?.numbness,
          tingling: checkIn.symptoms?.tingling,
          other: checkIn.symptoms?.other
        }
      }
    },
    tags: ['check-in', 'daily', 'pain', 'functional-status'],
    metadata: {
      checkInId: checkIn._id,
      caseNumber: checkIn.case.caseNumber,
      painLevel: checkIn.painLevel?.current
    }
  });

  await activityLog.save();

  // Alert triggers based on check-in data
  try {
    await createCheckInAlerts(checkIn, caseDoc);
  } catch (alertError) {
    console.error('Error creating alerts:', alertError);
    // Don't fail the check-in creation if alert creation fails
  }

  res.status(201).json({
    message: 'Check-in created successfully',
    checkIn
  });
}));

// @route   GET /api/check-ins/:id
// @desc    Get check-in by ID
// @access  Private
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const checkIn = await CheckIn.findById(req.params.id)
    .populate('case', 'caseNumber status worker')
    .populate('worker', 'firstName lastName email')
    .populate('reviewedBy', 'firstName lastName role');

  if (!checkIn) {
    return res.status(404).json({ message: 'Check-in not found' });
  }

  // Check access permissions
  const hasAccess = 
    req.user.role === 'admin' ||
    checkIn.worker._id.toString() === req.user._id.toString() ||
    (req.user.role === 'clinician' && checkIn.case.clinician?.toString() === req.user._id.toString()) ||
    (req.user.role === 'case_manager' && checkIn.case.caseManager?.toString() === req.user._id.toString());

  if (!hasAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ checkIn });
}));

// @route   PUT /api/check-ins/:id
// @desc    Update check-in
// @access  Private (Worker, Clinician)
router.put('/:id', [
  authMiddleware,
  body('painLevel.current').optional().isInt({ min: 0, max: 10 }),
  body('painLevel.worst').optional().isInt({ min: 0, max: 10 }),
  body('painLevel.average').optional().isInt({ min: 0, max: 10 }),
  body('notes').optional().isString(),
  body('reviewNotes').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const checkIn = await CheckIn.findById(req.params.id);

  if (!checkIn) {
    return res.status(404).json({ message: 'Check-in not found' });
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'admin' ||
    checkIn.worker._id.toString() === req.user._id.toString() ||
    (req.user.role === 'clinician' && checkIn.case.clinician?.toString() === req.user._id.toString());

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Only workers can update their own check-ins, clinicians can add review notes
  if (req.user.role === 'clinician' && req.body.reviewNotes) {
    checkIn.reviewNotes = req.body.reviewNotes;
    checkIn.reviewedBy = req.user._id;
    checkIn.reviewDate = new Date();
  } else if (checkIn.worker._id.toString() === req.user._id.toString()) {
    // Worker can update their check-in data
    Object.assign(checkIn, req.body);
  }

  await checkIn.save();

  res.json({
    message: 'Check-in updated successfully',
    checkIn
  });
}));

// @route   GET /api/check-ins/dashboard/stats
// @desc    Get check-in statistics for dashboard
// @access  Private
router.get('/dashboard/stats', authMiddleware, asyncHandler(async (req, res) => {
  const filter = {};
  
  if (req.user.role === 'worker') {
    filter.worker = req.user._id;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayCheckIn = await CheckIn.findOne({
    ...filter,
    checkInDate: {
      $gte: today,
      $lt: tomorrow
    }
  });

  const last7Days = await CheckIn.find({
    ...filter,
    checkInDate: {
      $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      $lt: tomorrow
    }
  }).sort({ checkInDate: -1 });

  const avgPainLevel = last7Days.length > 0 
    ? last7Days.reduce((sum, checkIn) => sum + checkIn.painLevel.current, 0) / last7Days.length
    : 0;

  const exerciseCompliance = last7Days.filter(checkIn => 
    checkIn.exerciseCompliance.completed
  ).length / Math.max(last7Days.length, 1) * 100;

  res.json({
    todayCheckIn: !!todayCheckIn,
    lastCheckIn: last7Days[0] || null,
    avgPainLevel: Math.round(avgPainLevel * 10) / 10,
    exerciseCompliance: Math.round(exerciseCompliance),
    totalCheckIns: last7Days.length,
    streak: calculateStreak(last7Days)
  });
}));

// Helper function to calculate check-in streak
function calculateStreak(checkIns) {
  if (checkIns.length === 0) return 0;
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < checkIns.length; i++) {
    const checkInDate = new Date(checkIns[i].checkInDate);
    checkInDate.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    expectedDate.setHours(0, 0, 0, 0);
    
    if (checkInDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

// Function to create alerts based on check-in data
async function createCheckInAlerts(checkIn, caseDoc) {
  const alerts = [];
  
  console.log('Creating alerts for check-in:', {
    painLevel: checkIn.painLevel.current,
    workedToday: checkIn.workStatus?.workedToday,
    sleepQuality: checkIn.functionalStatus?.sleep,
    caseClinician: caseDoc.clinician,
    caseManager: caseDoc.caseManager
  });

  // 1. If Pain ≥ 7 → Trigger alert to clinician and case manager dashboard
  if (checkIn.painLevel.current >= 7) {
    const painAlert = {
      type: 'high_pain',
      title: 'High Pain Level Alert',
      message: `Worker ${checkIn.worker.firstName} ${checkIn.worker.lastName} reported pain level ${checkIn.painLevel.current}/10 in case ${caseDoc.caseNumber}. Immediate attention may be required.`,
      priority: 'high',
      actionUrl: `/cases/${caseDoc._id}`,
      metadata: {
        caseNumber: caseDoc.caseNumber,
        painLevel: checkIn.painLevel.current,
        workerName: `${checkIn.worker.firstName} ${checkIn.worker.lastName}`,
        checkInDate: checkIn.checkInDate
      }
    };

    // Send to clinician if assigned
    if (caseDoc.clinician) {
      alerts.push({
        ...painAlert,
        recipient: caseDoc.clinician,
        sender: checkIn.worker._id
      });
    }

    // Send to case manager if assigned
    if (caseDoc.caseManager) {
      alerts.push({
        ...painAlert,
        recipient: caseDoc.caseManager,
        sender: checkIn.worker._id
      });
    }
  }

  // 2. If "No" to job duties → Auto-flag for RTW review
  if (checkIn.workStatus && !checkIn.workStatus.workedToday) {
    const rtwAlert = {
      type: 'rtw_review',
      title: 'Return to Work Review Required',
      message: `Worker ${checkIn.worker.firstName} ${checkIn.worker.lastName} reported inability to perform job duties in case ${caseDoc.caseNumber}. Return to work assessment may be needed.`,
      priority: 'medium',
      actionUrl: `/cases/${caseDoc._id}`,
      metadata: {
        caseNumber: caseDoc.caseNumber,
        workerName: `${checkIn.worker.firstName} ${checkIn.worker.lastName}`,
        checkInDate: checkIn.checkInDate,
        workStatus: checkIn.workStatus
      }
    };

    // Send to case manager
    if (caseDoc.caseManager) {
      alerts.push({
        ...rtwAlert,
        recipient: caseDoc.caseManager,
        sender: checkIn.worker._id
      });
    }

    // Send to clinician if assigned
    if (caseDoc.clinician) {
      alerts.push({
        ...rtwAlert,
        recipient: caseDoc.clinician,
        sender: checkIn.worker._id
      });
    }
  }

  // 3. If Poor sleep 2+ days in a row → Suggest fatigue resource
  if (checkIn.functionalStatus && checkIn.functionalStatus.sleep <= 2) {
    // Check for consecutive poor sleep days
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get check-ins from the last 2 days
    const recentCheckIns = await CheckIn.find({
      case: caseDoc._id,
      worker: checkIn.worker._id,
      checkInDate: {
        $gte: twoDaysAgo,
        $lt: today
      }
    }).sort({ checkInDate: -1 });

    // Check if there are 2+ consecutive days of poor sleep
    let consecutivePoorSleepDays = 0;
    let currentDate = new Date(today);
    
    for (let i = 0; i < recentCheckIns.length; i++) {
      const checkInDate = new Date(recentCheckIns[i].checkInDate);
      checkInDate.setHours(0, 0, 0, 0);
      
      if (checkInDate.getTime() === currentDate.getTime()) {
        if (recentCheckIns[i].functionalStatus && recentCheckIns[i].functionalStatus.sleep <= 2) {
          consecutivePoorSleepDays++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (consecutivePoorSleepDays >= 2) {
      const fatigueAlert = {
        type: 'fatigue_resource',
        title: 'Fatigue Resource Recommendation',
        message: `Worker ${checkIn.worker.firstName} ${checkIn.worker.lastName} has reported poor sleep quality for ${consecutivePoorSleepDays} consecutive days in case ${caseDoc.caseNumber}. Consider suggesting fatigue management resources.`,
        priority: 'medium',
        actionUrl: `/cases/${caseDoc._id}`,
        metadata: {
          caseNumber: caseDoc.caseNumber,
          workerName: `${checkIn.worker.firstName} ${checkIn.worker.lastName}`,
          consecutivePoorSleepDays,
          checkInDate: checkIn.checkInDate,
          sleepQuality: checkIn.functionalStatus.sleep
        }
      };

      // Send to clinician if assigned
      if (caseDoc.clinician) {
        alerts.push({
          ...fatigueAlert,
          recipient: caseDoc.clinician,
          sender: checkIn.worker._id
        });
      }

      // Send to case manager
      if (caseDoc.caseManager) {
        alerts.push({
          ...fatigueAlert,
          recipient: caseDoc.caseManager,
          sender: checkIn.worker._id
        });
      }
    }
  }

  // Create all alerts
  console.log(`Creating ${alerts.length} alerts...`);
  for (const alertData of alerts) {
    try {
      const notification = new Notification(alertData);
      await notification.save();
      console.log(`Alert created for ${alertData.type}: ${alertData.title} to ${alertData.recipient}`);
    } catch (error) {
      console.error(`Error creating alert ${alertData.type}:`, error);
    }
  }
}

// @route   POST /api/check-ins/test-alerts
// @desc    Test alert creation (for debugging)
// @access  Private (Admin, Clinician)
router.post('/test-alerts', [
  authMiddleware,
  roleMiddleware('admin', 'clinician'),
  body('caseId').isMongoId().withMessage('Valid case ID is required'),
  body('painLevel').isInt({ min: 0, max: 10 }).withMessage('Pain level must be between 0-10'),
  body('canDoJob').isIn(['yes', 'modified', 'no']).withMessage('Valid job status required'),
  body('sleepQuality').isIn(['good', 'ok', 'poor']).withMessage('Valid sleep quality required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { caseId, painLevel, canDoJob, sleepQuality } = req.body;

  // Get case with populated fields
  const caseDoc = await Case.findById(caseId).populate('clinician caseManager worker');
  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Check if clinician is trying to test alerts for their own case
  if (req.user.role === 'clinician' && caseDoc.clinician?._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only test alerts for cases assigned to you' });
  }

  // Create mock check-in data
  const mockCheckIn = {
    painLevel: { current: painLevel },
    workStatus: { workedToday: canDoJob !== 'no' },
    functionalStatus: { 
      sleep: sleepQuality === 'good' ? 8 : sleepQuality === 'ok' ? 5 : 2 
    },
    worker: caseDoc.worker
  };

  try {
    await createCheckInAlerts(mockCheckIn, caseDoc);
    res.json({ message: 'Test alerts created successfully' });
  } catch (error) {
    console.error('Error creating test alerts:', error);
    res.status(500).json({ message: 'Failed to create test alerts', error: error.message });
  }
}));

module.exports = router;