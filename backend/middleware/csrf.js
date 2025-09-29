const csrf = require('csrf');
const tokens = new csrf();

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and health checks only
  if (req.method === 'GET' || 
      req.path.startsWith('/api/health') ||
      req.path.startsWith('/api/csrf-token')) {
    return next();
  }

  // Skip CSRF for multipart requests (file uploads) - they will be handled by route-specific middleware
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }

  // Get CSRF token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!token) {
    return res.status(403).json({ 
      message: 'CSRF token missing' 
    });
  }

  // Verify CSRF token
  if (!tokens.verify(process.env.JWT_SECRET, token)) {
    return res.status(403).json({ 
      message: 'Invalid CSRF token' 
    });
  }

  next();
};

// Generate CSRF token
const generateCSRFToken = (req, res, next) => {
  const token = tokens.create(process.env.JWT_SECRET);
  res.locals.csrfToken = token;
  next();
};

// CSRF token endpoint handler
const getCSRFToken = (req, res) => {
  const token = tokens.create(process.env.JWT_SECRET);
  res.json({ csrfToken: token });
};

module.exports = {
  csrfProtection,
  generateCSRFToken,
  getCSRFToken
};
