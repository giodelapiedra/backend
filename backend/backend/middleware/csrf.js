const csrf = require('csrf');
const tokens = new csrf();

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and health checks only
  if (req.method === 'GET' || 
      req.path.startsWith('/api/health') ||
      req.path.startsWith('/api/csrf-token') ||
      req.path.startsWith('/api/goal-kpi')) {  // Skip CSRF for goal-kpi routes
    console.log('🔄 CSRF: Skipping CSRF protection for:', req.method, req.path);
    return next();
  }

  // Skip CSRF for multipart requests (file uploads) - they will be handled by route-specific middleware
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }

  // Get CSRF token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  console.log('🔍 CSRF: Checking token for:', req.method, req.path);
  console.log('🔍 CSRF: Token from header:', req.headers['x-csrf-token'] ? 'present' : 'missing');
  console.log('🔍 CSRF: Token from body:', req.body._csrf ? 'present' : 'missing');
  
  if (!token) {
    console.log('❌ CSRF: Token missing for:', req.method, req.path);
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
