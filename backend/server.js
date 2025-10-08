const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { db } = require('./config/supabase.local');
const asyncHandler = require('./middleware/asyncHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { securityHeaders, additionalSecurityHeaders } = require('./middleware/securityHeaders');
const { performanceMonitor } = require('./middleware/performance');
const { requestIdMiddleware } = require('./middleware/requestId');
const logger = require('./utils/logger');
const { validateEnvironment, getSafeConfig } = require('./utils/envValidator');

// ✅ OPTIMIZATION: Load and validate environment variables
const loaded = dotenv.config();
if (loaded.error) {
  // Fallback to legacy env.supabase if .env not present
  dotenv.config({ path: './env.supabase' });
}

// ✅ Validate environment variables on startup
try {
  validateEnvironment();
  const config = getSafeConfig();
  logger.info('Configuration loaded successfully', config);
} catch (error) {
  logger.error('Failed to load configuration', { error: error.message });
  process.exit(1);
}

const app = express();

// Security middleware (must be first)
app.use(securityHeaders());
app.use(additionalSecurityHeaders);

// Request ID for correlation
app.use(requestIdMiddleware);

// Rate limiting
app.use(generalLimiter);

// Performance monitoring
app.use(performanceMonitor);

// CORS and JSON parsing (no cookies if using bearer tokens only)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'KPI API is running' });
});

// Test endpoint for debugging
app.get('/api/test-trends', async (req, res) => {
  try {
    const { getTeamLeaderPerformanceTrends } = require('./controllers/multiTeamAnalyticsController');
    await getTeamLeaderPerformanceTrends(req, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ OPTIMIZATION: Use structured logging instead of console.log
logger.info('Loading API routes...');
const goalKpiRoutes = require('./routes/goalKpi');
const workReadinessAssignmentRoutes = require('./routes/workReadinessAssignments');
const multiTeamAnalyticsRoutes = require('./routes/multiTeamAnalytics');
logger.info('All route modules loaded successfully');

// Mount API routes
app.use('/api/goal-kpi', goalKpiRoutes);
app.use('/api/work-readiness-assignments', workReadinessAssignmentRoutes);
app.use('/api/multi-team-analytics', multiTeamAnalyticsRoutes);
logger.info('API routes mounted successfully', {
  routes: ['/api/goal-kpi', '/api/work-readiness-assignments', '/api/multi-team-analytics']
});

// TODO: Enable other routes after fixing controller issues
// const authRoutes = require('./routes/auth.supabase');
// const userRoutes = require('./routes/users');
// const caseRoutes = require('./routes/cases');
// const incidentRoutes = require('./routes/incidents');
// const appointmentRoutes = require('./routes/appointments');
// const notificationRoutes = require('./routes/notifications');
// const assessmentRoutes = require('./routes/assessments');
// const rehabilitationRoutes = require('./routes/rehabilitationPlans');
// const checkInRoutes = require('./routes/checkIns');
// const activityLogRoutes = require('./routes/activityLogs');
// const adminRoutes = require('./routes/admin');
// const clinicianRoutes = require('./routes/clinicians');
// const teamLeaderRoutes = require('./routes/teamLeader');
// const preventiveTaskRoutes = require('./routes/preventiveTasks');
// const clinicianAnalyticsRoutes = require('./routes/clinicianAnalytics');

// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/cases', caseRoutes);
// app.use('/api/incidents', incidentRoutes);
// app.use('/api/appointments', appointmentRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/assessments', assessmentRoutes);
// app.use('/api/rehabilitation', rehabilitationRoutes);
// app.use('/api/check-ins', checkInRoutes);
// app.use('/api/activity-logs', activityLogRoutes);
// app.use('/api/admin', adminRoutes);
// app.use('/api/clinicians', clinicianRoutes);
// app.use('/api/team-leaders', teamLeaderRoutes);
// app.use('/api/preventive-tasks', preventiveTaskRoutes);
// app.use('/api/clinician-analytics', clinicianAnalyticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.logError(err, { 
    path: req.path, 
    method: req.method, 
    userId: req.user?.id,
    requestId: req.requestId 
  });
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    requestId: req.requestId
  });
});

const PORT = process.env.PORT || 5001;

// Start scheduled job runner for smart notifications
const jobRunner = require('./services/ScheduledJobRunner');
const notificationScheduler = require('./services/notificationScheduler');

// ✅ OPTIMIZATION: Enhanced server startup with proper logging
app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
  });
  
  // Start smart notification jobs
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULED_JOBS === 'true') {
    logger.info('Starting scheduled jobs...');
    jobRunner.start();
    notificationScheduler.start();
    logger.info('Scheduled jobs started successfully');
  } else {
    logger.info('Scheduled jobs disabled', {
      hint: 'Set ENABLE_SCHEDULED_JOBS=true to enable'
    });
  }
});
