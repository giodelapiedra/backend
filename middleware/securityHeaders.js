const helmet = require('helmet');

// Enhanced security headers middleware
const securityHeaders = () => {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", process.env.SUPABASE_URL].filter(Boolean),
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    
    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },
    
    // Expect-CT
    expectCt: {
      maxAge: 86400,
      enforce: true
    },
    
    // Frameguard - Prevent clickjacking
    frameguard: {
      action: 'deny'
    },
    
    // Hide Powered-By header
    hidePoweredBy: true,
    
    // HSTS - Force HTTPS
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    
    // IE No Open
    ieNoOpen: true,
    
    // NoSniff - Prevent MIME type sniffing
    noSniff: true,
    
    // Origin Agent Cluster
    originAgentCluster: true,
    
    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: false,
    
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },
    
    // XSS Filter
    xssFilter: true
  });
};

// Additional security headers
const additionalSecurityHeaders = (req, res, next) => {
  // Prevent caching of sensitive data
  if (req.path.includes('/api/auth') || 
      req.path.includes('/api/users') || 
      req.path.includes('/api/cases')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }
  
  // Add security headers for API responses
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// Enhanced secure cookie settings
const secureCookieSettings = {
  httpOnly: true, // Prevents XSS attacks by blocking JavaScript access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict', // Prevents CSRF attacks
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/', // Cookie available for entire site
  domain: process.env.COOKIE_DOMAIN || undefined, // Set domain if needed
  signed: false // Can be set to true if using signed cookies
};

// Session cookie settings (for shorter-lived sessions)
const sessionCookieSettings = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/'
};

// Remember me cookie settings (for longer sessions)
const rememberMeCookieSettings = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/'
};

module.exports = {
  securityHeaders,
  additionalSecurityHeaders,
  secureCookieSettings,
  sessionCookieSettings,
  rememberMeCookieSettings
};
