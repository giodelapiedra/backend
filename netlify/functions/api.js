const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: './backend/env.supabase' });

// Import middleware
const { sanitizeInput } = require('../../backend/middleware/sanitization');
const { csrfProtection, getCSRFToken } = require('../../backend/middleware/csrf');
const { authMiddleware } = require('../../backend/middleware/auth');

// Import routes
const authRoutes = require('../../backend/routes/auth');
const userRoutes = require('../../backend/routes/users');
const caseRoutes = require('../../backend/routes/cases');
const assessmentRoutes = require('../../backend/routes/assessments');
const appointmentRoutes = require('../../backend/routes/appointments');
const checkInRoutes = require('../../backend/routes/checkIns');
const rehabilitationPlanRoutes = require('../../backend/routes/rehabilitationPlans');
const incidentRoutes = require('../../backend/routes/incidents');
const clinicianRoutes = require('../../backend/routes/clinicians');
const preventiveTaskRoutes = require('../../backend/routes/preventiveTasks');
const { router: notificationRoutes } = require('../../backend/routes/notifications');
const activityLogRoutes = require('../../backend/routes/activityLogs');
const adminRoutes = require('../../backend/routes/admin');
const clinicianAnalyticsRoutes = require('../../backend/routes/clinicianAnalytics');
const teamLeaderRoutes = require('../../backend/routes/teamLeader');
const workReadinessRoutes = require('../../backend/routes/workReadiness');
const goalKpiRoutes = require('../../backend/routes/goalKpi');

const app = express();

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

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow Netlify domains
    if (origin.includes('.netlify.app')) {
      return callback(null, true);
    }
    
    // Allow custom domain if set
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging middleware
app.use(morgan('combined'));

// Input sanitization middleware
app.use(sanitizeInput);

// CSRF protection middleware
app.use(csrfProtection);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// CSRF token endpoint
app.get('/api/csrf-token', getCSRFToken);

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export the serverless handler
module.exports.handler = serverless(app);