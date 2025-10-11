/**
 * Extract a user-friendly error message from various error types
 */
export const extractErrorMessage = (error: any): string => {
  if (!error) return 'Unknown error occurred';
  
  // String error
  if (typeof error === 'string') return error;
  
  // Standard Error object
  if (error.message) return error.message;
  
  // Supabase error format
  if (error.error_description) return error.error_description;
  
  // API error format
  if (error.data && typeof error.data === 'object') {
    if (error.data.message) return error.data.message;
    if (error.data.error) return error.data.error;
  }
  
  // RTK Query error format
  if (error.status && error.data) {
    return `Error ${error.status}: ${JSON.stringify(error.data)}`;
  }
  
  // Fallback: stringify the error
  try {
    return JSON.stringify(error);
  } catch {
    return 'An unexpected error occurred';
  }
};

/**
 * Categorize errors for better handling
 */
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  DATABASE = 'database',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown',
}

/**
 * Categorize an error based on its properties
 */
export const categorizeError = (error: any): ErrorCategory => {
  const message = extractErrorMessage(error).toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || error.status === 0) {
    return ErrorCategory.NETWORK;
  }
  
  if (message.includes('auth') || message.includes('unauthorized') || error.status === 401) {
    return ErrorCategory.AUTHENTICATION;
  }
  
  if (message.includes('validation') || message.includes('invalid') || error.status === 400) {
    return ErrorCategory.VALIDATION;
  }
  
  if (message.includes('database') || message.includes('postgres') || error.status === 500) {
    return ErrorCategory.DATABASE;
  }
  
  if (message.includes('permission') || message.includes('forbidden') || error.status === 403) {
    return ErrorCategory.PERMISSION;
  }
  
  return ErrorCategory.UNKNOWN;
};

/**
 * Get user-friendly error message based on category
 */
export const getUserFriendlyErrorMessage = (error: any): string => {
  const category = categorizeError(error);
  const originalMessage = extractErrorMessage(error);
  
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Network connection error. Please check your internet connection and try again.';
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication failed. Please log in again.';
    case ErrorCategory.VALIDATION:
      return `Validation error: ${originalMessage}`;
    case ErrorCategory.DATABASE:
      return 'Database error. Please try again later or contact support.';
    case ErrorCategory.PERMISSION:
      return 'You do not have permission to perform this action.';
    default:
      return originalMessage;
  }
};

