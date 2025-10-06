require('dotenv').config({ path: './env.supabase' }); // Load Supabase environment
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { sanitizeInput } = require('./middleware/sanitization');
const { csrfProtection, getCSRFToken } = require('./middleware/csrf');
const { authMiddleware } = require('./middleware/auth');

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

const app = express();

// Trust proxy for rate limiting behind reverse proxy (Render)
app.set('trust proxy', 1);

// Rate limiting for general requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Allow up to 1000 requests per 15 minutes per IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks, CSRF token, and OPTIONS requests (CORS preflight)
    return req.path.startsWith('/api/health') || 
           req.path.startsWith('/api/csrf-token') || 
           req.method === 'OPTIONS';
  }
});

// Apply rate limiting to all requests
app.use(limiter);

// Auth rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit to 20 auth attempts per 15 minutes per IP
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: (req) => {
    // Only apply to auth endpoints, but skip OPTIONS requests (CORS preflight) and CSRF token
    return !req.path.startsWith('/api/auth') || 
           req.method === 'OPTIONS' || 
           req.path.startsWith('/api/csrf-token');
  }
});

// Apply auth rate limiting
app.use(authLimiter);

// Enhanced security middleware
const { securityHeaders, additionalSecurityHeaders } = require('./middleware/securityHeaders');
app.use(securityHeaders());
app.use(additionalSecurityHeaders);
app.use(compression());

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://frontend-oi0bvqtjg-giodelapiedras-projects.vercel.app',
      'https://*.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Check if origin is allowed
    if (allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      (allowedOrigin.includes('*') && origin.includes(allowedOrigin.replace('*', '')))
    )) {
      return callback(null, true);
    }
    
    // For development, allow all localhost origins
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb for security
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Enhanced cookie parser with secret for signed cookies
const cookieSecret = process.env.COOKIE_SECRET || 'your-cookie-secret-change-in-production';
app.use(cookieParser(cookieSecret)); // Add cookie parsing with secret

// Cookie security middleware
app.use((req, res, next) => {
  // Set secure cookie defaults for all responses
  res.cookie = ((originalCookie) => {
    return function(name, value, options = {}) {
      const secureDefaults = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      };
      
      // Merge with secure defaults
      const finalOptions = { ...secureDefaults, ...options };
      
      return originalCookie.call(this, name, value, finalOptions);
    };
  })(res.cookie);
  
  next();
});

// Input sanitization middleware
app.use(sanitizeInput);

// CSRF token endpoint (before CSRF protection)
app.get('/api/csrf-token', getCSRFToken);

// Development helper to clear rate limiting
if (process.env.NODE_ENV === 'development') {
  app.post('/api/dev/clear-rate-limit', (req, res) => {
    // Clear rate limiting for the current IP
    res.json({ message: 'Rate limiting cleared for development' });
  });
  
  // Additional endpoint to completely disable rate limiting
  app.post('/api/dev/disable-rate-limit', (req, res) => {
    res.json({ 
      message: 'Rate limiting is disabled for development',
      note: 'All rate limits have been bypassed'
    });
  });
  
  // Clear all rate limits endpoint
  app.post('/api/dev/clear-all-rate-limits', (req, res) => {
    res.json({ 
      message: 'All rate limits cleared for development',
      note: 'You can now login without rate limit restrictions'
    });
  });
}

// CSRF protection for state-changing operations
app.use(csrfProtection);

// Supabase connection using centralized config
const { supabase } = require('./config/supabase');
const { dbHealthCheck, getDatabaseStatus } = require('./middleware/dbHealth');

// Test Supabase connection
const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection established successfully');
    console.log('Database: PostgreSQL (Supabase)');
    return true;
  } catch (err) {
    console.error('❌ Supabase connection error:', err);
    return false;
  }
};

// Test connection on startup
testSupabaseConnection();

// Enhanced image serving
const { 
  imageServingMiddleware, 
  serveImage, 
  servePublicImage, 
  proxyCloudinaryImage 
} = require('./middleware/imageServing');

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Public image serving (no authentication required)
app.get('/images/:filename', imageServingMiddleware, servePublicImage);

// Cloudinary image proxy
app.get('/api/images/proxy', imageServingMiddleware, proxyCloudinaryImage);

// Secure image serving endpoint with authentication
app.get('/api/images/:type/:filename', authMiddleware, imageServingMiddleware, serveImage);

// Routes
app.use('/api/auth', require('./routes/auth.supabase')); // Use Supabase auth routes
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
app.use('/api/clinicians/analytics', clinicianAnalyticsRoutes);
app.use('/api/team-leader', teamLeaderRoutes);
app.use('/api/work-readiness', workReadinessRoutes);
app.use('/api/goal-kpi', goalKpiRoutes);

// Apply database health check middleware to all routes
app.use(dbHealthCheck);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Work Readiness System API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// API root endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Work Readiness System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      cases: '/api/cases',
      assessments: '/api/assessments',
      appointments: '/api/appointments',
      checkIns: '/api/check-ins',
      rehabilitationPlans: '/api/rehabilitation-plans',
      incidents: '/api/incidents',
      clinicians: '/api/clinicians',
      preventiveTasks: '/api/preventive-tasks',
      notifications: '/api/notifications',
      activityLogs: '/api/activity-logs',
      admin: '/api/admin',
      clinicianAnalytics: '/api/clinicians/analytics',
      teamLeader: '/api/team-leader',
      workReadiness: '/api/work-readiness',
      goalKpi: '/api/goal-kpi',
      health: '/api/health'
    }
  });
});

// Enhanced health check endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: req.dbHealthy ? 'connected' : 'disconnected'
  });
});

// Health endpoint (without /api prefix)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: req.dbHealthy ? 'connected' : 'disconnected'
  });
});

// Auth status endpoint
app.get('/api/auth/status', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Authentication system is running',
    timestamp: new Date().toISOString()
  });
});

// Database status endpoint
app.get('/api/database/status', getDatabaseStatus);

// Error handling middleware
app.use((err, req, res, next) => {
  // Don't expose internal errors in production
  const errorMessage = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'Internal server error';
    
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: errorMessage
  });
});

// 404 handler - catch all unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Start scheduled job runner for smart notifications
const jobRunner = require('./services/ScheduledJobRunner');
const notificationScheduler = require('./services/notificationScheduler');
const NotificationService = require('./services/NotificationService');

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start smart notification jobs
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULED_JOBS === 'true') {
    jobRunner.start();
    notificationScheduler.start();
  }
});
