/**
 * Production-safe logger utility
 * Prevents sensitive data from being logged in production environments
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Safe logger that only logs in development mode
 * In production, it silently skips logging to prevent information disclosure
 */
export const logger = {
  /**
   * Log general information (disabled in production)
   */
  log: (...args: any[]) => {
    if (!isProduction) {
      console.log(...args);
    }
  },

  /**
   * Log informational messages (disabled in production)
   */
  info: (...args: any[]) => {
    if (!isProduction) {
      console.info(...args);
    }
  },

  /**
   * Log warnings (enabled in production but sanitized)
   */
  warn: (...args: any[]) => {
    if (!isProduction) {
      console.warn(...args);
    } else {
      // In production, only log generic warning without details
      console.warn('A warning occurred. Check logs for details.');
    }
  },

  /**
   * Log errors (always enabled but sanitized in production)
   */
  error: (...args: any[]) => {
    if (!isProduction) {
      console.error(...args);
    } else {
      // In production, sanitize error messages
      const sanitizedArgs = args.map(arg => {
        if (arg instanceof Error) {
          return { message: arg.message, name: arg.name };
        }
        if (typeof arg === 'object') {
          return '[Object]';
        }
        return arg;
      });
      console.error(...sanitizedArgs);
    }
  },

  /**
   * Log debug information (disabled in production)
   */
  debug: (...args: any[]) => {
    if (!isProduction) {
      console.debug(...args);
    }
  },

  /**
   * Create a namespaced logger for specific modules
   */
  namespace: (namespace: string) => ({
    log: (...args: any[]) => logger.log(`[${namespace}]`, ...args),
    info: (...args: any[]) => logger.info(`[${namespace}]`, ...args),
    warn: (...args: any[]) => logger.warn(`[${namespace}]`, ...args),
    error: (...args: any[]) => logger.error(`[${namespace}]`, ...args),
    debug: (...args: any[]) => logger.debug(`[${namespace}]`, ...args),
  })
};

/**
 * Helper to sanitize sensitive data from objects before logging
 */
export const sanitizeForLog = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'auth',
    'jwt',
    'sessionId',
    'session_id',
    'ssn',
    'social_security',
    'credit_card',
    'cvv',
    'pin'
  ];

  const sanitized = { ...obj };

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  });

  return sanitized;
};

export default logger;




