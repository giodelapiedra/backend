/**
 * Cache Service
 * Handles caching for improved performance
 * Falls back gracefully if Redis is not available
 */

class CacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new Map();
    this.memoryCacheExpiry = new Map();
    this.enabled = process.env.REDIS_URL || process.env.ENABLE_CACHE === 'true';
    
    // Initialize Redis if available
    if (this.enabled && process.env.REDIS_URL) {
      try {
        const redis = require('redis');
        this.redis = redis.createClient({
          url: process.env.REDIS_URL
        });
        
        this.redis.on('error', (err) => {
          console.warn('Redis connection error, falling back to memory cache:', err.message);
          this.redis = null;
        });
        
        this.redis.connect().catch(() => {
          console.warn('Redis connection failed, falling back to memory cache');
          this.redis = null;
        });
      } catch (error) {
        console.warn('Redis not available, using memory cache:', error.message);
        this.redis = null;
      }
    }
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {any} Cached data or null
   */
  async get(key) {
    try {
      if (this.redis) {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      } else {
        // Fallback to memory cache
        const expiry = this.memoryCacheExpiry.get(key);
        if (expiry && Date.now() > expiry) {
          this.memoryCache.delete(key);
          this.memoryCacheExpiry.delete(key);
          return null;
        }
        return this.memoryCache.get(key) || null;
      }
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
   */
  async set(key, data, ttl = 300) {
    try {
      if (this.redis) {
        await this.redis.setEx(key, ttl, JSON.stringify(data));
      } else {
        // Fallback to memory cache
        this.memoryCache.set(key, data);
        this.memoryCacheExpiry.set(key, Date.now() + (ttl * 1000));
        
        // Clean up expired entries periodically
        if (this.memoryCache.size > 1000) {
          this.cleanupMemoryCache();
        }
      }
    } catch (error) {
      console.warn('Cache set error:', error.message);
    }
  }

  /**
   * Delete cached data
   * @param {string} key - Cache key
   */
  async del(key) {
    try {
      if (this.redis) {
        await this.redis.del(key);
      } else {
        this.memoryCache.delete(key);
        this.memoryCacheExpiry.delete(key);
      }
    } catch (error) {
      console.warn('Cache delete error:', error.message);
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      if (this.redis) {
        await this.redis.flushAll();
      } else {
        this.memoryCache.clear();
        this.memoryCacheExpiry.clear();
      }
    } catch (error) {
      console.warn('Cache clear error:', error.message);
    }
  }

  /**
   * Clean up expired memory cache entries
   */
  cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, expiry] of this.memoryCacheExpiry.entries()) {
      if (now > expiry) {
        this.memoryCache.delete(key);
        this.memoryCacheExpiry.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStats() {
    if (this.redis) {
      return {
        type: 'redis',
        enabled: true
      };
    } else {
      return {
        type: 'memory',
        enabled: true,
        size: this.memoryCache.size,
        maxSize: 1000
      };
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
