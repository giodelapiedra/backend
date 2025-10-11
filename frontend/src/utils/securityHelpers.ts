/**
 * Security utilities for validating events and sanitizing data
 */

/**
 * Allowed event reasons for custom events
 */
const ALLOWED_EVENT_REASONS = ['case_assignment', 'notification_update', 'plan_update'] as const;

type AllowedEventReason = typeof ALLOWED_EVENT_REASONS[number];

/**
 * Validate custom event to prevent malicious event dispatching
 */
export const validateCustomEvent = (event: CustomEvent, expectedReasons: AllowedEventReason[] = ['case_assignment']): boolean => {
  try {
    const detail = event.detail;
    
    // Check if event has detail
    if (!detail || typeof detail !== 'object') {
      console.warn('[SECURITY] Invalid event: missing or invalid detail');
      return false;
    }
    
    // Check if reason is allowed
    if (!detail.reason || !expectedReasons.includes(detail.reason)) {
      console.warn('[SECURITY] Invalid event: unauthorized reason', detail.reason);
      return false;
    }
    
    // Check timestamp to prevent replay attacks (within last 5 minutes)
    if (detail.timestamp) {
      const eventAge = Date.now() - detail.timestamp;
      const FIVE_MINUTES = 5 * 60 * 1000;
      
      if (eventAge > FIVE_MINUTES || eventAge < 0) {
        console.warn('[SECURITY] Invalid event: timestamp out of range');
        return false;
      }
    }
    
    // Event is valid
    return true;
  } catch (error) {
    console.error('[SECURITY] Error validating event:', error);
    return false;
  }
};

/**
 * Validate that IDs are in UUID format
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Sanitize string input to prevent XSS
 * Note: For HTML content, use DOMPurify instead
 */
export const sanitizeString = (input: string): string => {
  if (!input) return '';
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if user has access to a specific resource
 */
export const validateUserAccess = (userId: string, resourceUserId: string): boolean => {
  if (!userId || !resourceUserId) {
    console.warn('[SECURITY] Missing user IDs for access validation');
    return false;
  }
  
  if (!isValidUUID(userId) || !isValidUUID(resourceUserId)) {
    console.warn('[SECURITY] Invalid UUID format');
    return false;
  }
  
  return userId === resourceUserId;
};

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number;
  private windowMs: number;
  
  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }
  
  /**
   * Check if action is allowed for given key
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      console.warn(`[SECURITY] Rate limit exceeded for ${key}`);
      return false;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return true;
  }
  
  /**
   * Reset attempts for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

