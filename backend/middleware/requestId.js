/**
 * Request ID Middleware
 * Adds unique request ID for correlation across logs and services
 */

const crypto = require('crypto');

/**
 * Generate and attach request ID to each request
 */
const requestIdMiddleware = (req, res, next) => {
  // Generate unique request ID using crypto.randomUUID (Node.js 14.17+)
  const requestId = crypto.randomUUID();
  
  // Attach to request object
  req.requestId = requestId;
  
  // Add to response headers for client correlation
  res.set('X-Request-ID', requestId);
  
  // Add to logger context
  req.logger = {
    info: (message, meta = {}) => {
      const logger = require('../utils/logger');
      logger.info(message, { requestId, ...meta });
    },
    error: (error, meta = {}) => {
      const logger = require('../utils/logger');
      logger.logError(error, { requestId, ...meta });
    },
    warn: (message, meta = {}) => {
      const logger = require('../utils/logger');
      logger.warn(message, { requestId, ...meta });
    },
    logBusiness: (event, data = {}) => {
      const logger = require('../utils/logger');
      logger.logBusiness(event, { requestId, ...data });
    },
    logSecurity: (event, details = {}) => {
      const logger = require('../utils/logger');
      logger.logSecurity(event, { requestId, ...details });
    }
  };
  
  next();
};

module.exports = {
  requestIdMiddleware
};
