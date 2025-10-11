/**
 * Debug logging utility
 * Only logs in development environment
 */
export const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG]:', ...args);
  }
};

/**
 * Error logging utility
 * Always logs errors
 */
export const errorLog = (...args: any[]) => {
  console.error('[ERROR]:', ...args);
};

/**
 * Warning logging utility
 */
export const warnLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[WARN]:', ...args);
  }
};

/**
 * Success logging utility
 */
export const successLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[SUCCESS]:', ...args);
  }
};

