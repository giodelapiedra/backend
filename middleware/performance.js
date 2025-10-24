const logger = require('../utils/logger');

/**
 * Performance monitoring middleware
 * Tracks request/response times and logs slow operations
 */

// Configuration
const SLOW_REQUEST_THRESHOLD = 1000; // 1 second
const VERY_SLOW_REQUEST_THRESHOLD = 5000; // 5 seconds

/**
 * Performance monitoring middleware
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Next middleware function
 */
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage();
    
    // Calculate memory usage
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external
    };
    
    // Log request performance
    logRequestPerformance(req, res, responseTime, memoryDelta);
    
    // Call original end method
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Log request performance metrics
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {number} responseTime - Response time in milliseconds
 * @param {object} memoryDelta - Memory usage delta
 */
function logRequestPerformance(req, res, responseTime, memoryDelta) {
  const performanceData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    memoryDelta: `${Math.round(memoryDelta.heapUsed / 1024 / 1024)}MB`,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  };
  
  // Determine log level based on response time
  if (responseTime >= VERY_SLOW_REQUEST_THRESHOLD) {
    logger.error('Very slow request detected', performanceData);
  } else if (responseTime >= SLOW_REQUEST_THRESHOLD) {
    logger.warn('Slow request detected', performanceData);
  } else {
    logger.http('Request completed', performanceData);
  }
  
  // Log business metrics for specific endpoints
  if (req.path.includes('/kpi') || req.path.includes('/work-readiness')) {
    logger.logPerformance('API_CALL', responseTime, {
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      userId: req.user?.id
    });
  }
}

/**
 * Database query performance monitor
 * Wraps database operations to track performance
 * @param {Function} queryFunction - Database query function
 * @param {string} operation - Operation name for logging
 * @returns {Function} Wrapped function
 */
const monitorDatabaseQuery = (queryFunction, operation) => {
  return async (...args) => {
    const startTime = Date.now();
    
    try {
      const result = await queryFunction(...args);
      const duration = Date.now() - startTime;
      
      // Log database performance
      logger.logPerformance('DATABASE_QUERY', duration, {
        operation,
        success: true
      });
      
      // Warn about slow queries
      if (duration > 1000) {
        logger.warn('Slow database query', {
          operation,
          duration: `${duration}ms`,
          args: args.length
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.logPerformance('DATABASE_QUERY', duration, {
        operation,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  };
};

/**
 * Cache performance monitor
 * Tracks cache hit/miss rates and performance
 * @param {Function} cacheFunction - Cache function
 * @param {string} operation - Operation name
 * @returns {Function} Wrapped function
 */
const monitorCacheOperation = (cacheFunction, operation) => {
  return async (...args) => {
    const startTime = Date.now();
    
    try {
      const result = await cacheFunction(...args);
      const duration = Date.now() - startTime;
      
      logger.logPerformance('CACHE_OPERATION', duration, {
        operation,
        success: true,
        cacheHit: result !== null
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.logPerformance('CACHE_OPERATION', duration, {
        operation,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  };
};

/**
 * Business operation performance monitor
 * Tracks business logic performance
 * @param {Function} businessFunction - Business function
 * @param {string} operation - Operation name
 * @returns {Function} Wrapped function
 */
const monitorBusinessOperation = (businessFunction, operation) => {
  return async (...args) => {
    const startTime = Date.now();
    
    try {
      const result = await businessFunction(...args);
      const duration = Date.now() - startTime;
      
      logger.logPerformance('BUSINESS_OPERATION', duration, {
        operation,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.logPerformance('BUSINESS_OPERATION', duration, {
        operation,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  };
};

/**
 * Memory usage monitor
 * Tracks memory usage and alerts on high usage
 */
const monitorMemoryUsage = () => {
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024)
  };
  
  // Alert on high memory usage
  if (memoryUsageMB.heapUsed > 500) { // 500MB
    logger.warn('High memory usage detected', memoryUsageMB);
  }
  
  return memoryUsageMB;
};

/**
 * Performance metrics collector
 * Collects and aggregates performance metrics
 */
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        slow: 0,
        verySlow: 0,
        errors: 0
      },
      database: {
        queries: 0,
        slowQueries: 0,
        errors: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        errors: 0
      }
    };
  }
  
  recordRequest(responseTime, statusCode) {
    this.metrics.requests.total++;
    
    if (statusCode >= 400) {
      this.metrics.requests.errors++;
    }
    
    if (responseTime >= SLOW_REQUEST_THRESHOLD) {
      this.metrics.requests.slow++;
    }
    
    if (responseTime >= VERY_SLOW_REQUEST_THRESHOLD) {
      this.metrics.requests.verySlow++;
    }
  }
  
  recordDatabaseQuery(duration, success) {
    this.metrics.database.queries++;
    
    if (!success) {
      this.metrics.database.errors++;
    }
    
    if (duration > 1000) {
      this.metrics.database.slowQueries++;
    }
  }
  
  recordCacheOperation(hit, success) {
    if (success) {
      if (hit) {
        this.metrics.cache.hits++;
      } else {
        this.metrics.cache.misses++;
      }
    } else {
      this.metrics.cache.errors++;
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      memoryUsage: monitorMemoryUsage()
    };
  }
  
  reset() {
    this.metrics = {
      requests: { total: 0, slow: 0, verySlow: 0, errors: 0 },
      database: { queries: 0, slowQueries: 0, errors: 0 },
      cache: { hits: 0, misses: 0, errors: 0 }
    };
  }
}

// Create global metrics instance
const performanceMetrics = new PerformanceMetrics();

// Log metrics every 5 minutes
setInterval(() => {
  const metrics = performanceMetrics.getMetrics();
  logger.info('Performance metrics', metrics);
}, 5 * 60 * 1000);

module.exports = {
  performanceMonitor,
  monitorDatabaseQuery,
  monitorCacheOperation,
  monitorBusinessOperation,
  monitorMemoryUsage,
  performanceMetrics
};
