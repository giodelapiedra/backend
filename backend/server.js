require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
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
const rehabPlanRoutes = require('./routes/rehabPlans');
const appointmentRoutes = require('./routes/appointments');
const checkInRoutes = require('./routes/checkIns');
const rehabilitationPlanRoutes = require('./routes/rehabilitationPlans');
const incidentRoutes = require('./routes/incidents');
const clinicianRoutes = require('./routes/clinicians');
const preventiveTaskRoutes = require('./routes/preventiveTasks');
const { router: notificationRoutes } = require('./routes/notifications');
const activityLogRoutes = require('./routes/activityLogs');
const adminRoutes = require('./routes/admin');

const app = express();

// Rate limiting (DISABLED FOR DEVELOPMENT)
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 200, // Allow up to 200 requests per 15 minutes
//   message: 'Too many requests from this IP, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Apply rate limiting to all requests (DISABLED)
// app.use(limiter);

// Auth rate limiting (DISABLED FOR DEVELOPMENT)
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10, // Limit to 10 auth attempts per 15 minutes
//   message: 'Too many authentication attempts, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   skipSuccessfulRequests: true, // Don't count successful requests
// });

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb for security
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser()); // Add cookie parsing middleware

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

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/data5', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully to database: data5'))
.catch(err => console.error('MongoDB connection error:', err));

// Simple static file serving for testing
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Secure image serving endpoint with authentication
app.get('/api/images/:type/:filename', authMiddleware, async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    // Validate type parameter
    if (!['users', 'incidents'].includes(type)) {
      return res.status(400).json({ message: 'Invalid image type' });
    }
    
    // Prevent path traversal
    if (filename.includes('..') || filename.includes('~') || filename.includes('\\')) {
      return res.status(403).json({ message: 'Access denied - invalid filename' });
    }
    
    // Validate file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = path.extname(filename).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(403).json({ message: 'Access denied - invalid file type' });
    }
    
    // For user images, check ownership
    if (type === 'users') {
      const userId = req.user._id.toString();
      
      // Check if the filename contains the user's ID
      if (!filename.includes(userId) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied - you can only access your own files' });
      }
    }
    
    const filePath = path.join(__dirname, 'uploads', type, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Set security headers
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('Cache-Control', 'private, max-age=3600');
    
    // Send the file
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ message: 'Error serving image' });
  }
});

// Routes
app.use('/api/auth', authRoutes); // Removed authLimiter
app.use('/api/users', userRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/rehab-plans', rehabPlanRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/check-ins', checkInRoutes);
app.use('/api/rehabilitation-plans', rehabilitationPlanRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/clinicians', clinicianRoutes);
app.use('/api/preventive-tasks', preventiveTaskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start smart notification jobs
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULED_JOBS === 'true') {
    jobRunner.start();
    console.log('🤖 Smart notification jobs started');
  } else {
    console.log('⏸️ Scheduled jobs disabled in development mode');
    console.log('   Set ENABLE_SCHEDULED_JOBS=true to enable in development');
  }
});
