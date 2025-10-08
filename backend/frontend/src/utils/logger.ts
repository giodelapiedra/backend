/**
 * ✅ OPTIMIZATION: Development-Only Logger
 * Prevents console.log in production builds
 * Provides structured logging in development
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  context?: string;
  data?: any;
  timestamp?: boolean;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Check if logging is enabled
   */
  private isEnabled(): boolean {
    return this.isDevelopment;
  }

  /**
   * Format log message with context and timestamp
   */
  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const parts: string[] = [];

    if (options?.timestamp !== false) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    if (options?.context) {
      parts.push(`[${options.context}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  /**
   * General log
   */
  log(message: string, options?: LogOptions): void {
    if (!this.isEnabled()) return;
    
    const formatted = this.formatMessage('log', message, options);
    console.log(formatted, options?.data || '');
  }

  /**
   * Info log
   */
  info(message: string, options?: LogOptions): void {
    if (!this.isEnabled()) return;
    
    const formatted = this.formatMessage('info', message, options);
    console.info('ℹ️', formatted, options?.data || '');
  }

  /**
   * Warning log
   */
  warn(message: string, options?: LogOptions): void {
    if (!this.isEnabled()) return;
    
    const formatted = this.formatMessage('warn', message, options);
    console.warn('⚠️', formatted, options?.data || '');
  }

  /**
   * Error log (always enabled, even in production)
   */
  error(message: string, error?: Error | any, options?: LogOptions): void {
    // ✅ Errors are logged even in production for debugging
    const formatted = this.formatMessage('error', message, options);
    
    if (this.isDevelopment) {
      console.error('❌', formatted, error, options?.data || '');
    } else {
      // In production, log to external service (e.g., Sentry)
      // For now, just console.error without sensitive data
      console.error('Error:', message);
      // TODO: Send to error tracking service
    }
  }

  /**
   * Debug log (verbose, development only)
   */
  debug(message: string, options?: LogOptions): void {
    if (!this.isEnabled()) return;
    
    const formatted = this.formatMessage('debug', message, options);
    console.debug('🐛', formatted, options?.data || '');
  }

  /**
   * Performance measurement
   */
  time(label: string): void {
    if (!this.isEnabled()) return;
    console.time(label);
  }

  timeEnd(label: string): void {
    if (!this.isEnabled()) return;
    console.timeEnd(label);
  }

  /**
   * Group logs together
   */
  group(label: string): void {
    if (!this.isEnabled()) return;
    console.group(label);
  }

  groupEnd(): void {
    if (!this.isEnabled()) return;
    console.groupEnd();
  }

  /**
   * Table display for arrays/objects
   */
  table(data: any): void {
    if (!this.isEnabled()) return;
    console.table(data);
  }
}

// ✅ Export singleton instance
export const logger = new Logger();

// ✅ Export for testing
export default logger;

// ✅ Usage examples:
/*
import { logger } from '@/utils/logger';

// Simple log
logger.log('User logged in');

// With context
logger.info('Fetching data', {
  context: 'API',
  data: { userId: '123' }
});

// Error logging
logger.error('Failed to fetch', error, {
  context: 'UserService'
});

// Performance measurement
logger.time('API Call');
// ... do something
logger.timeEnd('API Call');
*/

