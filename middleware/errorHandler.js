/**
 * Error Handling Middleware
 * Provides comprehensive error handling and logging
 */

const logger = require('../utils/logger');

/**
 * Generate unique error ID for tracking
 * @returns {string} Error ID
 */
function generateErrorId() {
  return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Next middleware function
 */
const errorHandler = (err, req, res, next) => {
  const errorId = generateErrorId();
  
  // Log error details
  logger.error('API Error', {
    errorId,
    message: err.message,
    stack: err.stack,
    userId: req.user?.id,
    endpoint: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Determine error type and status code
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    details = err.details || err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.code === 'PGRST116') {
    // Supabase "no rows" error
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.code && err.code.startsWith('PGRST')) {
    // Supabase database errors
    statusCode = 400;
    message = 'Database error';
    details = err.message;
  } else if (err.message && err.message.includes('already exists')) {
    statusCode = 409;
    message = 'Resource already exists';
  } else if (err.message && err.message.includes('validation')) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.message;
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      id: errorId,
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        originalError: err.message 
      })
    },
    timestamp: new Date().toISOString()
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for undefined routes
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const notFoundHandler = (req, res) => {
  const errorId = generateErrorId();
  
  logger.warn('404 Not Found', {
    errorId,
    endpoint: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: {
      id: errorId,
      message: 'Endpoint not found',
      endpoint: req.path,
      method: req.method
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom error
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} name - Error name
 * @returns {Error} Custom error
 */
const createError = (message, statusCode = 500, name = 'CustomError') => {
  const error = new Error(message);
  error.name = name;
  error.statusCode = statusCode;
  return error;
};

/**
 * Validation error
 * @param {string} message - Error message
 * @param {any} details - Validation details
 * @returns {Error} Validation error
 */
const createValidationError = (message, details = null) => {
  const error = createError(message, 400, 'ValidationError');
  error.details = details;
  return error;
};

/**
 * Unauthorized error
 * @param {string} message - Error message
 * @returns {Error} Unauthorized error
 */
const createUnauthorizedError = (message = 'Unauthorized') => {
  return createError(message, 401, 'UnauthorizedError');
};

/**
 * Forbidden error
 * @param {string} message - Error message
 * @returns {Error} Forbidden error
 */
const createForbiddenError = (message = 'Forbidden') => {
  return createError(message, 403, 'ForbiddenError');
};

/**
 * Not found error
 * @param {string} message - Error message
 * @returns {Error} Not found error
 */
const createNotFoundError = (message = 'Resource not found') => {
  return createError(message, 404, 'NotFoundError');
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
  createValidationError,
  createUnauthorizedError,
  createForbiddenError,
  createNotFoundError,
  generateErrorId
};