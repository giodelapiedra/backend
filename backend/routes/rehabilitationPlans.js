const express = require('express');
const { body, query } = require('express-validator');
const RehabilitationPlan = require('../models/RehabilitationPlan');
const Case = require('../models/Case');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { handleValidationErrors, asyncHandler } = require('../middleware/errorHandler');
const NotificationService = require('../services/NotificationService');

const router = express.Router();

// @route   GET /api/rehabilitation-plans
// @desc    Get rehabilitation plans for user
// @access  Private
router.get('/', [
  authMiddleware,
  query('case').optional().isMongoId(),
  query('status').optional().isIn(['active', 'paused', 'completed', 'cancelled']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const filter = {};
  
  // Role-based filtering
  if (req.user.role === 'worker') {
    filter.worker = req.user._id;
  } else if (req.user.role === 'clinician') {
    filter.clinician = req.user._id;
  } else if (req.user.role === 'case_manager') {
    // Case managers can see plans for their cases
    const cases = await Case.find({ caseManager: req.user._id }).select('_id');
    filter.case = { $in: cases.map(c => c._id) };
  }
  
  if (req.query.case) {
    filter.case = req.query.case;
  }
  
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const plans = await RehabilitationPlan.find(filter)
    .populate('case', 'caseNumber status worker')
    .populate('worker', 'firstName lastName email')
    .populate('clinician', 'firstName lastName email')
    .sort({ createdAt: -1 });

  // Filter out plans where the case is closed
  const filteredPlans = plans.filter(plan => 
    plan.case && plan.case.status !== 'closed'
  );

  res.json({
    plans: filteredPlans,
    count: filteredPlans.length
  });
}));

// @route   GET /api/rehabilitation-plans/dashboard/stats
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

  const activePlans = await RehabilitationPlan.find({ ...filter, status: 'active' })
    .populate('case', 'status');
  const completedPlans = await RehabilitationPlan.find({ ...filter, status: 'completed' })
    .populate('case', 'status');

  // Filter out plans where the case is closed
  const filteredActivePlans = activePlans.filter(plan => 
    plan.case && plan.case.status !== 'closed'
  );
  const filteredCompletedPlans = completedPlans.filter(plan => 
    plan.case && plan.case.status !== 'closed'
  );

  const totalGoals = filteredActivePlans.reduce((sum, plan) => sum + (plan.goals?.length || 0), 0);
  const completedGoals = filteredActivePlans.reduce((sum, plan) => 
    sum + (plan.goals?.filter(goal => goal.status === 'completed').length || 0), 0
  );

  const totalExercises = filteredActivePlans.reduce((sum, plan) => sum + (plan.exercises?.length || 0), 0);
  const completedExercises = filteredActivePlans.reduce((sum, plan) => 
    sum + (plan.exercises?.filter(exercise => exercise.status === 'completed').length || 0), 0
  );

  // Get active cases count
  const activeCases = await Case.find({ 
    ...filter, 
    status: { $in: ['new', 'triaged', 'assessed', 'in_rehab'] } 
  }).countDocuments();

  res.json({
    activePlans: filteredActivePlans.length,
    completedPlans: filteredCompletedPlans.length,
    totalGoals,
    completedGoals,
    goalCompletionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
    totalExercises,
    completedExercises,
    exerciseCompletionRate: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0,
    activeCases,
    upcomingAppointments: 0
  });
}));

// @route   GET /api/rehabilitation-plans/:id
// @desc    Get rehabilitation plan by ID
// @access  Private
router.get('/:id', [
  authMiddleware,
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const plan = await RehabilitationPlan.findById(req.params.id)
    .populate('case', 'caseNumber status worker')
    .populate('worker', 'firstName lastName email')
    .populate('clinician', 'firstName lastName email');

  if (!plan) {
    return res.status(404).json({ message: 'Rehabilitation plan not found' });
  }

  // Check access permissions
  const canAccess = 
    req.user.role === 'admin' ||
    plan.worker._id.toString() === req.user._id.toString() ||
    plan.clinician._id.toString() === req.user._id.toString() ||
    (req.user.role === 'case_manager' && plan.case.caseManager?.toString() === req.user._id.toString());

  if (!canAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ plan });
}));

// @route   POST /api/rehabilitation-plans
// @desc    Create new rehabilitation plan
// @access  Private (Clinician, Case Manager, Admin)
router.post('/', [
  authMiddleware,
  roleMiddleware('clinician', 'case_manager', 'admin'),
  body('case').isMongoId().withMessage('Valid case ID is required'),
  body('worker').isMongoId().withMessage('Valid worker ID is required'),
  body('planName').optional().isString(),
  body('planDescription').optional().isString(),
  body('exercises').isArray().withMessage('Exercises array is required'),
  body('exercises.*.name').isString().withMessage('Exercise name is required'),
  body('exercises.*.duration').isInt({ min: 1 }).withMessage('Exercise duration must be at least 1 minute'),
  body('exercises.*.category').optional().isIn(['stretching', 'strengthening', 'cardio', 'flexibility', 'balance', 'other']),
  body('exercises.*.difficulty').optional().isIn(['easy', 'medium', 'hard']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { case: caseId, worker, planName, planDescription, exercises, settings } = req.body;

  // Verify case exists and user has access
  const caseDoc = await Case.findById(caseId)
    .populate('worker', 'firstName lastName email')
    .populate('clinician', 'firstName lastName email');

  if (!caseDoc) {
    return res.status(404).json({ message: 'Case not found' });
  }

  // Check if user can create plan for this case
  const canCreate = 
    req.user.role === 'admin' ||
    (req.user.role === 'clinician' && caseDoc.clinician?._id.toString() === req.user._id.toString()) ||
    (req.user.role === 'case_manager' && caseDoc.caseManager?.toString() === req.user._id.toString());

  if (!canCreate) {
    return res.status(403).json({ message: 'You can only create plans for your assigned cases' });
  }

  // Verify worker exists
  const workerDoc = await User.findById(worker);
  if (!workerDoc || workerDoc.role !== 'worker') {
    return res.status(400).json({ message: 'Invalid worker ID' });
  }

  // Create rehabilitation plan
  const planData = {
    case: caseId,
    worker: worker,
    clinician: req.user.role === 'clinician' ? req.user._id : caseDoc.clinician?._id,
    planName: planName || 'Recovery Plan',
    planDescription: planDescription || 'Daily recovery exercises and activities',
    exercises: exercises,
    settings: settings || {}
  };

  const plan = new RehabilitationPlan(planData);
  await plan.save();

  // Populate the created plan
  await plan.populate([
    { path: 'case', select: 'caseNumber status worker' },
    { path: 'worker', select: 'firstName lastName email' },
    { path: 'clinician', select: 'firstName lastName email' }
  ]);

  // Create notification for worker
  const notification = new Notification({
    recipient: worker,
    sender: req.user._id,
    type: 'rehab_plan_assigned',
    title: 'New Recovery Plan Assigned',
    message: `A new recovery plan has been assigned to you. Check your dashboard to view today's exercises.`,
    priority: 'medium',
    actionUrl: `/worker/rehabilitation-plan/${plan._id}`,
    metadata: {
      planId: plan._id,
      caseNumber: caseDoc.caseNumber,
      exerciseCount: exercises.length
    }
  });

  await notification.save();

  res.status(201).json({
    message: 'Rehabilitation plan created successfully',
    plan
  });
}));

// @route   GET /api/rehabilitation-plans/:id/today
// @desc    Get today's exercises for a rehabilitation plan
// @access  Private
router.get('/:id/today', [
  authMiddleware,
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const plan = await RehabilitationPlan.findById(req.params.id)
    .populate('case', 'caseNumber status')
    .populate('worker', 'firstName lastName email');

  if (!plan) {
    return res.status(404).json({ message: 'Rehabilitation plan not found' });
  }

  // Check access permissions
  const canAccess = 
    req.user.role === 'admin' ||
    plan.worker._id.toString() === req.user._id.toString() ||
    (req.user.role === 'clinician' && plan.clinician.toString() === req.user._id.toString());

  if (!canAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const todaysExercises = plan.getTodaysExercises();
  const todaysCompletion = plan.todaysCompletion;

  // Ensure progress stats are properly initialized and updated
  plan.ensureProgressStats();

  console.log('API: Getting today\'s exercises for plan:', plan._id);
  console.log('API: Today\'s completion:', todaysCompletion);
  console.log('API: Progress stats:', plan.progressStats);

  res.json({
    plan: {
      _id: plan._id,
      planName: plan.planName,
      planDescription: plan.planDescription,
      case: plan.case,
      worker: plan.worker
    },
    exercises: todaysExercises,
    completion: todaysCompletion,
    progressStats: plan.progressStats
  });
}));

// @route   GET /api/rehabilitation-plans/:id/progress
// @desc    Get detailed progress monitoring for clinicians
// @access  Private (Clinician, Case Manager, Admin)
router.get('/:id/progress', [
  authMiddleware,
  roleMiddleware('clinician', 'case_manager', 'admin'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const plan = await RehabilitationPlan.findById(req.params.id)
    .populate('case', 'caseNumber status worker')
    .populate('worker', 'firstName lastName email')
    .populate('clinician', 'firstName lastName email');

  if (!plan) {
    return res.status(404).json({ message: 'Rehabilitation plan not found' });
  }

  // Check access permissions
  const canAccess = 
    req.user.role === 'admin' ||
    (req.user.role === 'clinician' && plan.clinician._id.toString() === req.user._id.toString()) ||
    (req.user.role === 'case_manager' && plan.case.caseManager?.toString() === req.user._id.toString());

  if (!canAccess) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Get detailed progress data
  const todaysExercises = plan.getTodaysExercises();
  const todaysCompletion = plan.todaysCompletion;
  
  // Calculate daily progress for last 7 days
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const dayCompletion = plan.dailyCompletions.find(completion => {
      const completionDate = new Date(completion.date);
      completionDate.setHours(0, 0, 0, 0);
      return completionDate.getTime() === date.getTime();
    });
    
    const completedExercises = dayCompletion ? 
      dayCompletion.exercises.filter(e => e.status === 'completed').length : 0;
    const skippedExercises = dayCompletion ? 
      dayCompletion.exercises.filter(e => e.status === 'skipped').length : 0;
    
    last7Days.push({
      date: date.toISOString().split('T')[0],
      completedExercises,
      skippedExercises,
      totalExercises: plan.exercises.length,
      overallStatus: dayCompletion?.overallStatus || 'not_started',
      exercises: dayCompletion?.exercises || []
    });
  }

  // Get exercise-specific progress
  const exerciseProgress = plan.exercises.map(exercise => {
    const completions = plan.dailyCompletions.map(day => {
      const exerciseCompletion = day.exercises.find(e => 
        e.exerciseId.toString() === exercise._id.toString()
      );
      return {
        date: day.date,
        status: exerciseCompletion?.status || 'not_started',
        completedAt: exerciseCompletion?.completedAt,
        skippedReason: exerciseCompletion?.skippedReason,
        skippedNotes: exerciseCompletion?.skippedNotes
      };
    });
    
    const completedCount = completions.filter(c => c.status === 'completed').length;
    const skippedCount = completions.filter(c => c.status === 'skipped').length;
    
    return {
      _id: exercise._id,
      name: exercise.name,
      description: exercise.description,
      duration: exercise.duration,
      category: exercise.category,
      difficulty: exercise.difficulty,
      totalDays: completions.length,
      completedCount,
      skippedCount,
      completionRate: completions.length > 0 ? (completedCount / completions.length) * 100 : 0,
      recentCompletions: completions.slice(-7) // Last 7 days
    };
  });

  res.json({
    plan: {
      _id: plan._id,
      planName: plan.planName,
      planDescription: plan.planDescription,
      status: plan.status,
      startDate: plan.startDate,
      endDate: plan.endDate,
      case: plan.case,
      worker: plan.worker,
      clinician: plan.clinician
    },
    today: {
      exercises: todaysExercises,
      completion: todaysCompletion,
      overallStatus: todaysCompletion?.overallStatus || 'not_started'
    },
    progressStats: plan.progressStats,
    last7Days,
    exerciseProgress,
    alerts: plan.alerts.filter(alert => !alert.isRead)
  });
}));

// @route   POST /api/rehabilitation-plans/:id/exercises/:exerciseId/complete
// @desc    Mark exercise as completed
// @access  Private (Worker only)
router.post('/:id/exercises/:exerciseId/complete', [
  authMiddleware,
  roleMiddleware('worker'),
  body('duration').optional().isInt({ min: 1 }),
  body('painLevel').optional().isInt({ min: 0, max: 10 }).withMessage('Pain level must be between 0 and 10'),
  body('painNotes').optional().isString().withMessage('Pain notes must be a string'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { duration, painLevel, painNotes } = req.body;
  const { id: planId, exerciseId } = req.params;

  const plan = await RehabilitationPlan.findById(planId);
  if (!plan) {
    return res.status(404).json({ message: 'Rehabilitation plan not found' });
  }

  // Check if worker owns this plan
  if (plan.worker.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Find the exercise
  const exercise = plan.exercises.id(exerciseId);
  if (!exercise) {
    return res.status(404).json({ message: 'Exercise not found' });
  }

  // Check if the exercise is already skipped
  const todaysCompletion = plan.dailyCompletions.find(completion => {
    const completionDate = new Date(completion.date);
    completionDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return completionDate.getTime() === today.getTime();
  });

  const exerciseCompletion = todaysCompletion?.exercises.find(e => 
    e.exerciseId.toString() === exerciseId.toString()
  );

  if (exerciseCompletion?.status === 'skipped') {
    return res.status(400).json({ 
      message: 'Cannot complete a skipped exercise. Please contact your clinician if you need to modify your plan.' 
    });
  }

  // Mark exercise as completed with pain level
  await plan.markExerciseCompleted(exerciseId, duration || exercise.duration, painLevel, painNotes);

  // Create activity log for exercise completion
  const activityLog = new ActivityLog({
    worker: plan.worker,
    case: plan.case,
    clinician: plan.clinician,
    rehabilitationPlan: plan._id,
    activityType: 'exercise_completed',
    title: `Exercise Completed: ${exercise.name}`,
    description: painLevel !== undefined ? 
      `Worker completed "${exercise.name}" exercise for ${duration || exercise.duration} minutes with pain level ${painLevel}/10` :
      `Worker completed "${exercise.name}" exercise for ${duration || exercise.duration} minutes`,
    priority: painLevel && painLevel >= 7 ? 'high' : 'low',
    details: {
      exercise: {
        name: exercise.name,
        duration: duration || exercise.duration,
        difficulty: exercise.difficulty,
        category: exercise.category,
        painLevel: painLevel,
        painNotes: painNotes
      }
    },
    tags: ['exercise', 'completed', 'rehabilitation', ...(painLevel ? ['pain'] : [])],
    metadata: {
      exerciseId: exercise._id,
      completedDuration: duration || exercise.duration,
      planName: plan.planName,
      painLevel: painLevel,
      painNotes: painNotes
    }
  });

  await activityLog.save();

  console.log('Exercise completed successfully:', exercise.name);
  console.log('Updated progress stats:', plan.progressStats);

  // Check for milestone alerts and send encouraging messages
  const alerts = await plan.checkForAlerts();
  
  // Send high pain notification to clinician if pain level is 7 or higher
  if (painLevel && painLevel >= 7) {
    try {
      // Create notification for clinician using the dedicated method
      await NotificationService.createHighPainNotification(
        plan.clinician,
        req.user._id,
        plan._id,
        exercise.name,
        painLevel,
        painNotes
      );
      
      console.log(`High pain notification sent to clinician: Pain level ${painLevel}/10`);
    } catch (notifyError) {
      console.error('Error sending pain notification to clinician:', notifyError);
      // Don't throw the error, just log it - we don't want to fail the whole request
    }
  }
  
  // Send milestone notifications to worker
  for (const alert of alerts) {
    if (alert.type.includes('milestone')) {
      const milestoneNotification = new Notification({
        recipient: plan.worker,
        sender: plan.clinician,
        type: 'progress_encouragement',
        title: '🎉 Milestone Achieved!',
        message: alert.message,
        priority: 'medium',
        actionUrl: `/worker/rehabilitation-plan`,
        metadata: {
          planId: plan._id,
          milestone: alert.metadata.milestone,
          consecutiveCompletedDays: alert.metadata.consecutiveCompletedDays,
          alertId: alert._id
        }
      });

      await milestoneNotification.save();
      console.log('Milestone notification sent to worker:', alert.type);
    }
  }

  // Send notification to clinician about exercise completion
  const notification = new Notification({
    recipient: plan.clinician,
    sender: plan.worker,
    type: 'exercise_completed',
    title: 'Exercise Completed',
    message: `Worker completed "${exercise.name}" exercise (${exercise.duration} min)`,
    priority: 'low',
    actionUrl: `/clinician/rehabilitation-plans/${plan._id}/progress`,
    metadata: {
      planId: plan._id,
      exerciseId: exercise._id,
      exerciseName: exercise.name,
      workerId: plan.worker,
      caseId: plan.case,
      completedAt: new Date(),
      activityLogId: activityLog._id
    }
  });

  await notification.save();

  res.json({
    message: 'Exercise marked as completed',
    exercise: {
      _id: exercise._id,
      name: exercise.name,
      status: 'completed',
      completedAt: new Date(),
      painLevel: painLevel,
      painNotes: painNotes
    },
    success: true
  });
}));

// @route   POST /api/rehabilitation-plans/:id/exercises/:exerciseId/skip
// @desc    Mark exercise as skipped
// @access  Private (Worker only)
router.post('/:id/exercises/:exerciseId/skip', [
  authMiddleware,
  roleMiddleware('worker'),
  body('reason').isIn(['pain', 'fatigue', 'time_constraint', 'equipment', 'other']).withMessage('Valid skip reason is required'),
  body('notes').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { reason, notes } = req.body;
  const { id: planId, exerciseId } = req.params;

  const plan = await RehabilitationPlan.findById(planId);
  if (!plan) {
    return res.status(404).json({ message: 'Rehabilitation plan not found' });
  }

  // Check if worker owns this plan
  if (plan.worker.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Find the exercise
  const exercise = plan.exercises.id(exerciseId);
  if (!exercise) {
    return res.status(404).json({ message: 'Exercise not found' });
  }

  // Mark exercise as skipped
  await plan.markExerciseSkipped(exerciseId, reason, notes);

  // Check for alerts
  const alerts = await plan.checkForAlerts();

  // Create activity log for exercise skip
  const activityLog = new ActivityLog({
    worker: plan.worker,
    case: plan.case,
    clinician: plan.clinician,
    rehabilitationPlan: plan._id,
    activityType: 'exercise_skipped',
    title: `Exercise Skipped: ${exercise.name}`,
    description: `Worker skipped "${exercise.name}" exercise. Reason: ${reason}${notes ? `. Notes: ${notes}` : ''}`,
    priority: reason === 'pain' ? 'high' : 'medium',
    details: {
      exercise: {
        name: exercise.name,
        duration: exercise.duration,
        difficulty: exercise.difficulty,
        category: exercise.category
      }
    },
    tags: ['exercise', 'skipped', 'rehabilitation', reason],
    metadata: {
      exerciseId: exercise._id,
      skippedReason: reason,
      skippedNotes: notes,
      planName: plan.planName
    }
  });

  await activityLog.save();

  // Send notification to clinician about exercise skip
  const skipNotification = new Notification({
    recipient: plan.clinician,
    sender: plan.worker,
    type: 'exercise_skipped',
    title: 'Exercise Skipped',
    message: `Worker skipped "${exercise.name}" exercise. Reason: ${reason}`,
    priority: reason === 'pain' ? 'high' : 'medium',
    actionUrl: `/clinician/rehabilitation-plans/${plan._id}/progress`,
    metadata: {
      planId: plan._id,
      exerciseId: exercise._id,
      exerciseName: exercise.name,
      workerId: plan.worker,
      caseId: plan.case,
      skippedReason: reason,
      skippedNotes: notes,
      skippedAt: new Date(),
      activityLogId: activityLog._id
    }
  });

  await skipNotification.save();

  // If consecutive skips threshold reached, notify clinician
  if (alerts.length > 0) {
    const alert = alerts.find(a => a.type === 'skipped_sessions');
    if (alert) {
      const alertNotification = new Notification({
        recipient: plan.clinician,
        sender: req.user._id,
        type: 'rehab_plan_review',
        title: 'Rehabilitation Plan Review Needed',
        message: alert.message,
        priority: 'high',
        actionUrl: `/clinician/rehabilitation-plans/${plan._id}`,
        metadata: {
          planId: plan._id,
          workerId: plan.worker,
          caseId: plan.case,
          consecutiveSkippedDays: alert.metadata.consecutiveSkippedDays
        }
      });

      await alertNotification.save();
    }
  }

  res.json({
    message: 'Exercise marked as skipped',
    exercise: {
      _id: exercise._id,
      name: exercise.name,
      status: 'skipped',
      skippedReason: reason,
      skippedNotes: notes
    }
  });
}));

// @route   POST /api/rehabilitation-plans/:id/complete-all
// @desc    Mark all exercises as completed for today
// @access  Private (Worker only)
router.post('/:id/complete-all', [
  authMiddleware,
  roleMiddleware('worker'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { id: planId } = req.params;

  const plan = await RehabilitationPlan.findById(planId);
  if (!plan) {
    return res.status(404).json({ message: 'Rehabilitation plan not found' });
  }

  // Check if worker owns this plan
  if (plan.worker.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Mark all exercises as completed
  for (const exercise of plan.exercises) {
    await plan.markExerciseCompleted(exercise._id, exercise.duration);
  }

  // Check for milestone alerts and send encouraging messages
  const alerts = await plan.checkForAlerts();
  
  // Send milestone notifications to worker
  for (const alert of alerts) {
    if (alert.type.includes('milestone')) {
      const milestoneNotification = new Notification({
        recipient: plan.worker,
        sender: plan.clinician,
        type: 'progress_encouragement',
        title: '🎉 Milestone Achieved!',
        message: alert.message,
        priority: 'medium',
        actionUrl: `/worker/rehabilitation-plan`,
        metadata: {
          planId: plan._id,
          milestone: alert.metadata.milestone,
          consecutiveCompletedDays: alert.metadata.consecutiveCompletedDays,
          alertId: alert._id
        }
      });

      await milestoneNotification.save();
      console.log('Milestone notification sent to worker:', alert.type);
    }
  }

  res.json({
    message: 'All exercises marked as completed',
    progressStats: plan.progressStats
  });
}));

// @route   PUT /api/rehabilitation-plans/:id
// @desc    Update rehabilitation plan
// @access  Private (Clinician, Case Manager, Admin)
router.put('/:id', [
  authMiddleware,
  roleMiddleware('clinician', 'case_manager', 'admin'),
  body('planName').optional().isString(),
  body('planDescription').optional().isString(),
  body('status').optional().isIn(['active', 'paused', 'completed', 'cancelled']),
  body('exercises').optional().isArray(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const plan = await RehabilitationPlan.findById(req.params.id);
  if (!plan) {
    return res.status(404).json({ message: 'Rehabilitation plan not found' });
  }

  // Check if user can update this plan
  const canUpdate = 
    req.user.role === 'admin' ||
    (req.user.role === 'clinician' && plan.clinician.toString() === req.user._id.toString()) ||
    (req.user.role === 'case_manager');

  if (!canUpdate) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Update plan
  const { planName, planDescription, status, exercises, settings } = req.body;
  
  if (planName) plan.planName = planName;
  if (planDescription) plan.planDescription = planDescription;
  if (status) plan.status = status;
  if (exercises) plan.exercises = exercises;
  if (settings) plan.settings = { ...plan.settings, ...settings };

  await plan.save();

  res.json({
    message: 'Rehabilitation plan updated successfully',
    plan
  });
}));

// @route   DELETE /api/rehabilitation-plans/:id
// @desc    Delete rehabilitation plan
// @access  Private (Admin only)
router.delete('/:id', [
  authMiddleware,
  roleMiddleware('admin'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const plan = await RehabilitationPlan.findById(req.params.id);
  if (!plan) {
    return res.status(404).json({ message: 'Rehabilitation plan not found' });
  }

  await RehabilitationPlan.findByIdAndDelete(req.params.id);

  res.json({
    message: 'Rehabilitation plan deleted successfully'
  });
}));

module.exports = router;
