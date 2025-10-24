/**
 * UUID Validation Middleware
 * Validates UUID format for route parameters
 */

const { param, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate UUID parameter
 * @param {string} paramName - Name of the parameter to validate
 * @returns {Array} Express validator middleware array
 */
const validateUUID = (paramName) => [
  param(paramName)
    .isUUID(4)
    .withMessage(`Invalid ${paramName} format. Must be a valid UUID v4.`)
    .custom((value) => {
      if (!UUID_REGEX.test(value)) {
        throw new Error(`Invalid ${paramName} format. Must be a valid UUID v4.`);
      }
      return true;
    })
];

/**
 * Handle validation errors for UUID validation
 */
const handleUUIDValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.logSecurity('Invalid UUID format', {
      param: req.params,
      errors: errors.array(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid parameter format',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Validate multiple UUID parameters
 * @param {Array} paramNames - Array of parameter names to validate
 * @returns {Array} Express validator middleware array
 */
const validateMultipleUUIDs = (paramNames) => {
  const validators = paramNames.map(name => validateUUID(name));
  return [...validators.flat(), handleUUIDValidationErrors];
};

/**
 * Validate UUID in query parameters
 * @param {string} paramName - Name of the query parameter to validate
 * @returns {Array} Express validator middleware array
 */
const validateQueryUUID = (paramName) => [
  param(paramName)
    .optional()
    .isUUID(4)
    .withMessage(`Invalid ${paramName} format. Must be a valid UUID v4.`)
    .custom((value) => {
      if (value && !UUID_REGEX.test(value)) {
        throw new Error(`Invalid ${paramName} format. Must be a valid UUID v4.`);
      }
      return true;
    })
];

module.exports = {
  validateUUID,
  validateMultipleUUIDs,
  validateQueryUUID,
  handleUUIDValidationErrors,
  UUID_REGEX
};
