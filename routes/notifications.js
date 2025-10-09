const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, param, query } = require('express-validator');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { asyncHandler, handleValidationErrors } = require('../middleware/errorHandler');

// Skip MongoDB imports in production or if mongoose is not available
let Notification, User;
try {
  if (process.env.NODE_ENV !== 'production' && process.env.USE_SUPABASE !== 'true') {
    Notification = require('../models/Notification');
    User = require('../models/User');
  } else {
    console.log('⏭️ Skipping MongoDB imports in notifications routes - using Supabase only');
    Notification = {};
    User = {};
  }
} catch (error) {
  console.log('⏭️ Mongoose not available in notifications routes - using Supabase only');
  Notification = {};
  User = {};
}

const NotificationService = require('../services/NotificationService');

// Custom SSE authentication middleware
const sseAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// @route   GET /api/notifications/stream
// @desc    Server-Sent Events stream for real-time notifications
// @access  Private
router.get('/stream', sseAuthMiddleware, (req, res) => {
  const userId = req.user._id.toString();
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Register connection with NotificationService
  NotificationService.registerConnection(userId, res);
  
  // Handle client disconnect
  req.on('close', () => {
    NotificationService.removeConnection(userId, res);
  });
});

// @route   GET /api/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', [
  authMiddleware,
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const skip = parseInt(req.query.skip) || 0;

  const notifications = await Notification.getUserNotifications(req.user._id, limit, skip);
  const unreadCount = await Notification.getUnreadCount(req.user._id);

  res.json({
    notifications,
    unreadCount,
    pagination: {
      limit,
      skip,
      hasMore: notifications.length === limit
    }
  });
}));

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', [
  authMiddleware
], asyncHandler(async (req, res) => {
  const unreadCount = await Notification.getUnreadCount(req.user._id);
  res.json({ unreadCount });
}));

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', [
  authMiddleware,
  param('id').isMongoId().withMessage('Valid notification ID is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  
  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  // Check if user owns this notification
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await notification.markAsRead();

  // Send real-time update to user
  await NotificationService.sendNotificationUpdate(req.user._id);

  res.json({
    message: 'Notification marked as read',
    notification
  });
}));

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', [
  authMiddleware
], asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { 
      isRead: true, 
      readAt: new Date() 
    }
  );

  // Send real-time update to user
  await NotificationService.sendNotificationUpdate(req.user._id);

  res.json({
    message: 'All notifications marked as read',
    updatedCount: result.modifiedCount
  });
}));

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', [
  authMiddleware,
  param('id').isMongoId().withMessage('Valid notification ID is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  
  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  // Check if user owns this notification
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await Notification.findByIdAndDelete(req.params.id);

  // Send real-time update to user
  await NotificationService.sendNotificationUpdate(req.user._id);

  res.json({ message: 'Notification deleted successfully' });
}));

// @route   POST /api/notifications
// @desc    Create notification (Admin/Case Manager only)
// @access  Private (Admin, Case Manager)
router.post('/', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager'),
  body('recipient').isMongoId().withMessage('Valid recipient ID is required'),
  body('type').isIn(['incident_reported', 'case_created', 'appointment_scheduled', 'check_in_reminder', 'task_assigned', 'case_status_change', 'general', 'high_pain', 'rtw_review', 'fatigue_resource']).withMessage('Valid notification type is required'),
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('message').notEmpty().withMessage('Message is required').isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority is required'),
  body('actionUrl').optional().isString(),
  body('metadata').optional().isObject(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { recipient, type, title, message, priority, actionUrl, metadata } = req.body;

  // Verify recipient exists
  const recipientDoc = await User.findById(recipient);
  if (!recipientDoc || !recipientDoc.isActive) {
    return res.status(400).json({ message: 'Invalid recipient' });
  }

  const notificationData = {
    recipient,
    sender: req.user._id,
    type,
    title,
    message,
    priority: priority || 'medium',
    actionUrl,
    metadata: metadata || {}
  };

  // Use NotificationService to create notification
  const notification = await NotificationService.createNotification(notificationData);

  // Populate the created notification
  await notification.populate([
    { path: 'recipient', select: 'firstName lastName email' },
    { path: 'sender', select: 'firstName lastName email' }
  ]);

  res.status(201).json({
    message: 'Notification created successfully',
    notification
  });
}));

// @route   POST /api/notifications/batch
// @desc    Create multiple notifications in batch (Admin/Case Manager only)
// @access  Private (Admin, Case Manager)
router.post('/batch', [
  authMiddleware,
  roleMiddleware('admin', 'case_manager'),
  body('notifications').isArray().withMessage('Notifications must be an array'),
  body('notifications.*.recipient').isMongoId().withMessage('Valid recipient ID is required'),
  body('notifications.*.type').isIn(['incident_reported', 'case_created', 'appointment_scheduled', 'check_in_reminder', 'task_assigned', 'case_status_change', 'general', 'high_pain', 'rtw_review', 'fatigue_resource']).withMessage('Valid notification type is required'),
  body('notifications.*.title').notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('notifications.*.message').notEmpty().withMessage('Message is required').isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { notifications } = req.body;
  
  // Add sender to each notification
  const notificationsWithSender = notifications.map(notification => ({
    ...notification,
    sender: req.user._id
  }));
  
  // Use NotificationService to create batch notifications
  const createdNotifications = await NotificationService.createBatchNotifications(notificationsWithSender);
  
  res.status(201).json({
    message: `Successfully created ${createdNotifications.length} notifications`,
    count: createdNotifications.length
  });
}));

// @route   GET /api/notifications/stats
// @desc    Get notification statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', [
  authMiddleware,
  roleMiddleware('admin')
], asyncHandler(async (req, res) => {
  const totalNotifications = await Notification.countDocuments();
  const unreadNotifications = await Notification.countDocuments({ isRead: false });
  
  const notificationsByType = await Notification.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  const recentNotifications = await Notification.find()
    .populate('recipient', 'firstName lastName email')
    .populate('sender', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(10);

  // Get active connection stats
  const activeConnections = NotificationService.getActiveConnectionsCount();
  const activeUsers = NotificationService.getActiveUsersCount();

  res.json({
    totalNotifications,
    unreadNotifications,
    notificationsByType,
    recentNotifications,
    activeConnections,
    activeUsers
  });
}));

// Export router and sendNotificationUpdate for backward compatibility
module.exports = { 
  router, 
  sendNotificationUpdate: NotificationService.sendNotificationUpdate 
};