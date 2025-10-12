/**
 * Debug Utilities
 * Centralized logging that respects environment
 */

const DEBUG = process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEBUG === 'true';

/**
 * Conditional console.log that only runs in development
 */
export const debugLog = (...args: any[]): void => {
  if (DEBUG) {
    console.log(...args);
  }
};

/**
 * Conditional console.warn that only runs in development
 */
export const debugWarn = (...args: any[]): void => {
  if (DEBUG) {
    console.warn(...args);
  }
};

/**
 * Conditional console.error that only runs in development
 */
export const debugError = (...args: any[]): void => {
  if (DEBUG) {
    console.error(...args);
  }
};

/**
 * Conditional console.info that only runs in development
 */
export const debugInfo = (...args: any[]): void => {
  if (DEBUG) {
    console.info(...args);
  }
};

/**
 * Always logs errors (use for production error tracking)
 */
export const logError = (...args: any[]): void => {
  console.error(...args);
};

