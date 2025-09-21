const xss = require('xss');
const validator = require('validator');

// XSS sanitization options
const xssOptions = {
  whiteList: {
    p: [],
    br: [],
    strong: [],
    em: [],
    ul: [],
    ol: [],
    li: []
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script']
};

// Sanitize input middleware
const sanitizeInput = (req, res, next) => {
  // Skip sanitization for multipart requests (file uploads)
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }
  
  // Sanitize all string fields in body
  if (req.body) {
    sanitizeObject(req.body);
  }
  
  // Sanitize all string fields in query
  if (req.query) {
    sanitizeObject(req.query);
  }
  
  next();
};

// Recursively sanitize object properties
const sanitizeObject = (obj) => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (typeof obj[key] === 'string') {
        // Escape HTML and remove XSS
        obj[key] = xss(validator.escape(obj[key]), xssOptions);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Recursively sanitize nested objects
        sanitizeObject(obj[key]);
      }
    }
  }
};

// Sanitize specific fields
const sanitizeField = (fieldName) => {
  return (req, res, next) => {
    if (req.body && req.body[fieldName]) {
      req.body[fieldName] = xss(validator.escape(req.body[fieldName]), xssOptions);
    }
    next();
  };
};

// Validate and sanitize email
const sanitizeEmail = (req, res, next) => {
  if (req.body && req.body.email) {
    req.body.email = validator.normalizeEmail(req.body.email);
    if (!validator.isEmail(req.body.email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
  }
  next();
};

// Validate and sanitize MongoDB ObjectId
const sanitizeObjectId = (fieldName) => {
  return (req, res, next) => {
    if (req.body && req.body[fieldName]) {
      if (!validator.isMongoId(req.body[fieldName])) {
        return res.status(400).json({ message: `Invalid ${fieldName} format` });
      }
    }
    next();
  };
};

module.exports = {
  sanitizeInput,
  sanitizeField,
  sanitizeEmail,
  sanitizeObjectId
};
