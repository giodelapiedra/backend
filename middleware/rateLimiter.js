const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// DISABLED: Rate limiter for authentication endpoints
const authLimiter = (req, res, next) => {
  // Skip rate limiting completely
  next();
};

// DISABLED: Registration rate limiter
const registrationLimiter = (req, res, next) => {
  // Skip rate limiting completely
  next();
};

// DISABLED: Password reset rate limiter
const passwordResetLimiter = (req, res, next) => {
  // Skip rate limiting completely
  next();
};

// DISABLED: Admin operations rate limiter
const adminLimiter = (req, res, next) => {
  // Skip rate limiting completely
  next();
};

module.exports = {
  generalLimiter,
  authLimiter,
  registrationLimiter,
  passwordResetLimiter,
  adminLimiter
};
