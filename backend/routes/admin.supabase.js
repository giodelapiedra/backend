const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authSupabase');
const { asyncHandler } = require('../middleware/errorHandler');
const { adminLimiter } = require('../middleware/rateLimiter');
const {
  getAdminAnalytics,
  getAuthLogs,
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  testAdmin,
  testUserCreation
} = require('../controllers/adminController');

console.log('🔍 Admin routes (Supabase) loaded');

// Test route to verify admin routes are working
router.get('/test', adminLimiter, authenticateToken, requireRole('admin'), testAdmin);

// Test user creation endpoint
router.post('/test-user', adminLimiter, authenticateToken, requireRole('admin'), asyncHandler(testUserCreation));

// User management endpoints
router.get('/users', adminLimiter, authenticateToken, requireRole('admin'), asyncHandler(getUsers));
router.post('/users', adminLimiter, authenticateToken, requireRole('admin'), asyncHandler(createUser));
router.put('/users/:id', adminLimiter, authenticateToken, requireRole('admin'), asyncHandler(updateUser));
router.delete('/users/:id', adminLimiter, authenticateToken, requireRole('admin'), asyncHandler(deleteUser));

// Analytics endpoint for admin
router.get('/analytics', adminLimiter, authenticateToken, requireRole('admin'), asyncHandler(getAdminAnalytics));

// Authentication logs endpoint
router.get('/auth-logs', adminLimiter, authenticateToken, requireRole('admin'), asyncHandler(getAuthLogs));

module.exports = router;

