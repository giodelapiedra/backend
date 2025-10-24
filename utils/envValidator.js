/**
 * ✅ OPTIMIZATION: Environment Variable Validator
 * Validates required environment variables on startup
 */

const logger = require('./logger');

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

/**
 * Optional but recommended environment variables
 */
const RECOMMENDED_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'NODE_ENV',
  'PORT',
  'FRONTEND_URL'
];

/**
 * Validate environment variables
 * @returns {object} Validation result
 */
function validateEnv() {
  const missing = [];
  const warnings = [];
  const present = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  });

  // Check recommended variables
  RECOMMENDED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    } else {
      present.push(varName);
    }
  });

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
    present
  };
}

/**
 * Log validation results
 * @param {object} validation - Validation result
 */
function logValidation(validation) {
  if (validation.isValid) {
    logger.info('✅ Environment validation passed', {
      presentVars: validation.present.length,
      warningVars: validation.warnings.length
    });

    if (validation.warnings.length > 0) {
      logger.warn('⚠️ Recommended environment variables missing', {
        variables: validation.warnings,
        hint: 'Some features may not work properly'
      });
    }
  } else {
    logger.error('❌ Environment validation failed', {
      missingVars: validation.missing,
      hint: 'Check your .env file or environment configuration'
    });
  }
}

/**
 * Validate environment on startup
 * Throws error if required variables are missing
 */
function validateEnvironment() {
  const validation = validateEnv();
  logValidation(validation);

  if (!validation.isValid) {
    throw new Error(
      `Missing required environment variables: ${validation.missing.join(', ')}`
    );
  }

  return validation;
}

/**
 * Get safe environment config (without sensitive data)
 * @returns {object} Safe environment configuration
 */
function getSafeConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5001,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    logLevel: process.env.LOG_LEVEL || 'info',
    scheduledJobsEnabled: process.env.ENABLE_SCHEDULED_JOBS === 'true',
    cacheEnabled: process.env.ENABLE_CACHE === 'true' || !!process.env.REDIS_URL
  };
}

module.exports = {
  validateEnvironment,
  getSafeConfig,
  validateEnv
};

