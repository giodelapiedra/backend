/**
 * Theme Utilities
 * Central configuration for color logic across the application
 */

export type StatusColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

/**
 * Get color for case status
 */
export const getStatusColor = (status: string): StatusColor => {
  const colors: { [key: string]: StatusColor } = {
    'new': 'info',
    'in_progress': 'warning',
    'pending_review': 'warning',
    'assigned': 'primary',
    'completed': 'success',
    'closed': 'default',
  };
  return colors[status.toLowerCase()] || 'default';
};

/**
 * Get color for case priority
 */
export const getPriorityColor = (priority: string): StatusColor => {
  const colors: { [key: string]: StatusColor } = {
    'urgent': 'error',
    'high': 'warning',
    'medium': 'info',
    'low': 'success',
  };
  return colors[priority.toLowerCase()] || 'default';
};

/**
 * Get color for incident severity
 */
export const getSeverityColor = (severity: string): StatusColor => {
  const colors: { [key: string]: StatusColor } = {
    'critical': 'error',
    'severe': 'error',
    'major': 'warning',
    'moderate': 'warning',
    'minor': 'info',
    'minimal': 'success',
  };
  return colors[severity.toLowerCase().replace('_', '')] || 'default';
};

/**
 * Get color for availability score
 */
export const getAvailabilityScoreColor = (score: number): StatusColor => {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
};

/**
 * Get color based on availability status
 */
export const getAvailabilityStatusColor = (status: string): StatusColor => {
  const colors: { [key: string]: StatusColor } = {
    'available': 'success',
    'moderate': 'warning',
    'busy': 'error',
    'unavailable': 'default',
  };
  return colors[status.toLowerCase()] || 'default';
};

