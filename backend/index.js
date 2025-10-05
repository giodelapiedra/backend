// Complete working server for Vercel deployment
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();

// Basic security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
const cookieSecret = process.env.COOKIE_SECRET || 'your-cookie-secret-change-in-production';
app.use(cookieParser(cookieSecret));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Allow up to 1000 requests per 15 minutes per IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path.startsWith('/api/health') || 
           req.path.startsWith('/api/csrf-token') || 
           req.method === 'OPTIONS';
  }
});

app.use(limiter);

// Auth rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit to 20 auth attempts per 15 minutes per IP
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => {
    return !req.path.startsWith('/api/auth') || 
           req.method === 'OPTIONS' || 
           req.path.startsWith('/api/csrf-token');
  }
});

app.use(authLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Backend is working!'
  });
});

// CSRF token endpoint (simplified)
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: 'csrf-token-placeholder' });
});

// Try to load routes with error handling
try {
  // Load all routes with error handling
  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/users');
  const caseRoutes = require('./routes/cases');
  const assessmentRoutes = require('./routes/assessments');
  const appointmentRoutes = require('./routes/appointments');
  const checkInRoutes = require('./routes/checkIns');
  const rehabilitationPlanRoutes = require('./routes/rehabilitationPlans');
  const incidentRoutes = require('./routes/incidents');
  const clinicianRoutes = require('./routes/clinicians');
  const preventiveTaskRoutes = require('./routes/preventiveTasks');
  const { router: notificationRoutes } = require('./routes/notifications');
  const activityLogRoutes = require('./routes/activityLogs');
  const adminRoutes = require('./routes/admin');
  const clinicianAnalyticsRoutes = require('./routes/clinicianAnalytics');
  const teamLeaderRoutes = require('./routes/teamLeader');
  const workReadinessRoutes = require('./routes/workReadiness');
  const goalKpiRoutes = require('./routes/goalKpi');

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/cases', caseRoutes);
  app.use('/api/assessments', assessmentRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/check-ins', checkInRoutes);
  app.use('/api/rehabilitation-plans', rehabilitationPlanRoutes);
  app.use('/api/incidents', incidentRoutes);
  app.use('/api/clinicians', clinicianRoutes);
  app.use('/api/preventive-tasks', preventiveTaskRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/activity-logs', activityLogRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/clinician-analytics', clinicianAnalyticsRoutes);
  app.use('/api/team-leader', teamLeaderRoutes);
  app.use('/api/work-readiness', workReadinessRoutes);
  app.use('/api/goal-kpi', goalKpiRoutes);

  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  
  // Create fallback routes if main routes fail
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'Test endpoint working!',
      error: error.message,
      routes: 'Some routes may not be available'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Export for Vercel
module.exports = app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}
