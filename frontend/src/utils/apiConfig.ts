// API configuration utility
export const getApiBaseUrl = () => {
  // In production (Netlify), use relative URLs
  if (process.env.NODE_ENV === 'production') {
    return ''; // Empty string means relative URLs
  }
  
  // In development, use the environment variable or localhost
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string) => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
  },
  USERS: {
    PROFILE: '/api/users/profile',
    UPDATE: '/api/users/update',
  },
  CASES: {
    LIST: '/api/cases',
    CREATE: '/api/cases',
    UPDATE: (id: string) => `/api/cases/${id}`,
    DELETE: (id: string) => `/api/cases/${id}`,
  },
  GOAL_KPI: {
    TEAM_LEADER_WEEKLY: '/api/goal-kpi/team-leader/weekly-summary',
    WORKER_WEEKLY: '/api/goal-kpi/worker/weekly-progress',
    LOGIN_CYCLE: '/api/goal-kpi/login-cycle',
  },
  WORK_READINESS: {
    LIST: '/api/work-readiness',
    CREATE: '/api/work-readiness',
    UPDATE: (id: string) => `/api/work-readiness/${id}`,
  },
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: (id: string) => `/api/notifications/${id}/read`,
  },
} as const;
