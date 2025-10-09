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
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://sociosystem.onrender.com',
    /\.onrender\.com$/
  ],
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Manual CORS headers as backup
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://sociosystem.onrender.com'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || origin?.includes('.onrender.com')) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint with memory info
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({ 
    status: 'ok', 
    message: 'KPI API is running',
    memory: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    },
    uptime: `${Math.round(process.uptime())}s`
  });
});

// Memory cleanup endpoint
app.post('/cleanup', (req, res) => {
  const memBefore = process.memoryUsage();
  
  if (global.gc) {
    global.gc();
    const memAfter = process.memoryUsage();
    
    res.json({
      success: true,
      message: 'Memory cleanup completed',
      memoryBefore: {
        heapUsed: `${Math.round(memBefore.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memBefore.heapTotal / 1024 / 1024)}MB`
      },
      memoryAfter: {
        heapUsed: `${Math.round(memAfter.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memAfter.heapTotal / 1024 / 1024)}MB`
      },
      freed: `${Math.round((memBefore.heapUsed - memAfter.heapUsed) / 1024 / 1024)}MB`
    });
  } else {
    res.json({
      success: false,
      message: 'Garbage collection not available. Start with --expose-gc flag.'
    });
  }
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
const shiftRoutes = require('./routes/shifts');
logger.info('All route modules loaded successfully');

// Mount API routes
app.use('/api/goal-kpi', goalKpiRoutes);
app.use('/api/work-readiness-assignments', workReadinessAssignmentRoutes);
app.use('/api/multi-team-analytics', multiTeamAnalyticsRoutes);
app.use('/api/shifts', shiftRoutes);
logger.info('API routes mounted successfully', {
  routes: ['/api/goal-kpi', '/api/work-readiness-assignments', '/api/multi-team-analytics', '/api/shifts', '/api/cases', '/api/appointments', '/api/clinicians', '/api/team-leaders']
});

// Supabase-compatible routes (no MongoDB dependencies)
const caseRoutes = require('./routes/cases');
const appointmentRoutes = require('./routes/appointments');
const clinicianRoutes = require('./routes/clinicians');
const teamLeaderRoutes = require('./routes/teamLeader');

// Mount Supabase-compatible routes
app.use('/api/cases', caseRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/clinicians', clinicianRoutes);
app.use('/api/team-leaders', teamLeaderRoutes);

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

// ✅ PERFORMANCE: Add periodic memory monitoring
setInterval(() => {
  const memUsage = process.memoryUsage();
  const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  
  if (memMB > 800) { // Alert if memory usage exceeds 800MB
    logger.warn('High memory usage detected', {
      memoryUsage: `${memMB}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    });
    
    // Trigger garbage collection if available
    if (global.gc && memMB > 1000) {
      global.gc();
      logger.info('Emergency garbage collection triggered');
    }
  }
}, 30000); // Check every 30 seconds

// ✅ PERFORMANCE: Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// ✅ PERFORMANCE: Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
