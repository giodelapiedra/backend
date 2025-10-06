const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { getAnalytics } = require('../controllers/clinicianController');

// @route   GET /api/clinicians/analytics
// @desc    Get analytics data for a clinician
// @access  Private (Clinician only)
router.get('/', authMiddleware, asyncHandler(getAnalytics));

module.exports = router;