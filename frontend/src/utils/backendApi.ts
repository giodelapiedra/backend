import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authClient } from '../lib/supabase';

// OPTIMIZATION: Request cache to prevent duplicate simultaneous requests
const requestCache = new Map<string, Promise<any>>();
const cacheTimeout = 5000; // Cache requests for 5 seconds

// Request metadata interface for performance tracking
interface RequestMetadata {
  startTime: number;
}

// Extend Axios config to include metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: RequestMetadata;
}

// Environment validation
if (!process.env.REACT_APP_API_URL) {
  console.warn('⚠️ Missing REACT_APP_API_URL. Falling back to localhost.');
}

// Create axios instance for backend API calls (appointments, etc.)
const backendApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://sociosystem.onrender.com/api',
  timeout: 15000, // OPTIMIZED: Reduced from 30s to 15s
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and performance tracking
backendApi.interceptors.request.use(
  async (config: ExtendedAxiosRequestConfig) => {
    const startTime = Date.now();
    config.metadata = { startTime };
    
    try {
      // Get the current session from Supabase
      const { data: { session } } = await authClient.auth.getSession();
      
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error: any) {
      console.error('Error getting auth token:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and performance tracking
backendApi.interceptors.response.use(
  (response) => {
    // OPTIMIZATION: Log performance
    const config = response.config as ExtendedAxiosRequestConfig;
    if (config.metadata?.startTime) {
      const duration = Date.now() - config.metadata.startTime;
      if (duration > 1000) {
        console.warn(`⚠️ Slow API request (${duration}ms):`, config.url);
      } else {
        console.log(`✅ API request completed (${duration}ms):`, config.url);
      }
    }
    
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as ExtendedAxiosRequestConfig;
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('❌ API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: config?.url,
        method: config?.method
      });
      
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        console.warn('🔒 Unauthorized request - token may have expired');
        // Optionally redirect to login or refresh token
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('📡 API No Response - Request sent but no response received');
      console.error('URL:', config?.url);
      console.error('Possible causes: Network error, CORS issue, or server down');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('⚠️ API Request Setup Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// OPTIMIZATION: Utility function for request caching
function cacheRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  if (requestCache.has(key)) {
    console.log('⚡ Using cached in-flight request:', key);
    return requestCache.get(key)!;
  }

  const promise = requestFn();
  requestCache.set(key, promise);

  // Auto-clear cache after timeout
  setTimeout(() => {
    requestCache.delete(key);
  }, cacheTimeout);

  // Also clear on error
  promise.catch(() => {
    requestCache.delete(key);
  });

  return promise;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AssignmentKPIResponse {
  success: boolean;
  kpi: {
    goal: number;
    completed: number;
    percentage: number;
    completionRate?: number;
    rating?: string;
    color?: string;
    description?: string;
    score?: number;
  };
  metrics: {
    totalAssignments: number;
    completedAssignments: number;
    overdueAssignments: number;
    onTimeSubmissions?: number;
    qualityScore?: number;
    onTimeRate?: number;
    lateRate?: number;
    completionRate?: number;
  };
  cycle: {
    cycleNumber: number;
    startDate: string;
    endDate: string;
  };
  message?: string;
  period?: {
    start: string;
    end: string;
    month?: string;
  };
  recentAssignments?: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string;
    assignedDate?: string;
    isOnTime?: boolean;
  }>;
}

export interface WorkerWeeklyProgressResponse {
  success: boolean;
  progress: {
    weekNumber: number;
    completed: number;
    total: number;
    percentage: number;
  };
  assignments: Array<{
    id: string;
    title: string;
    status: string;
    completedAt?: string;
  }>;
}

export interface TeamAssignmentSummaryResponse {
  success: boolean;
  message?: string;
  teamKPI: any;
  teamMetrics: any;
  individualKPIs: any[];
  period: {
    start: string;
    end: string;
    month: string;
  };
  summary?: {
    totalWorkers: number;
    totalAssignments: number;
    completedAssignments: number;
    overdueAssignments: number;
    averageCompletionRate: number;
  };
  workers?: Array<{
    id: string;
    name: string;
    completedAssignments: number;
    totalAssignments: number;
  }>;
}

export interface TeamWeeklySummaryResponse {
  success: boolean;
  weekly: {
    weekNumber: number;
    startDate: string;
    endDate: string;
    completedAssignments: number;
    totalAssignments: number;
  };
  trends: Array<{
    week: number;
    completed: number;
    total: number;
  }>;
}

export interface AssessmentPayload {
  workerId: string;
  assessmentData: {
    readiness_level: string;
    fatigue_level: number;
    mood: string;
    pain_discomfort: string;
    notes?: string;
  };
}

export interface SubmitAssessmentResponse {
  success: boolean;
  message: string;
  assessmentData?: any;
  assessment?: {
    id: string;
    workerId: string;
    score: number;
    createdAt: string;
  };
}

// ============================================================================
// KPI API METHODS
// ============================================================================

export const kpiAPI = {
  // Worker KPI methods
  async getWorkerAssignmentKPI(workerId: string): Promise<AssignmentKPIResponse> {
    const cacheKey = `getWorkerAssignmentKPI:${workerId}`;
    return cacheRequest(cacheKey, async () => {
      try {
        const response = await backendApi.get(`/goal-kpi/worker/assignment-kpi?workerId=${workerId}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching assignment KPI for worker ${workerId}:`, error);
        throw error;
      }
    });
  },

  async getWorkerWeeklyProgress(workerId: string): Promise<WorkerWeeklyProgressResponse> {
    const cacheKey = `getWorkerWeeklyProgress:${workerId}`;
    return cacheRequest(cacheKey, async () => {
      try {
        const response = await backendApi.get(`/goal-kpi/worker/${workerId}/weekly-progress`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching weekly progress for worker ${workerId}:`, error);
        throw error;
      }
    });
  },

  // Team Leader KPI methods
  async getTeamAssignmentSummary(teamLeaderId: string): Promise<TeamAssignmentSummaryResponse> {
    const cacheKey = `getTeamAssignmentSummary:${teamLeaderId}`;
    return cacheRequest(cacheKey, async () => {
      try {
        const response = await backendApi.get(`/goal-kpi/team-leader/${teamLeaderId}/assignment-summary`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching assignment summary for team leader ${teamLeaderId}:`, error);
        throw error;
      }
    });
  },

  async getTeamWeeklySummary(teamLeaderId: string): Promise<TeamWeeklySummaryResponse> {
    const cacheKey = `getTeamWeeklySummary:${teamLeaderId}`;
    return cacheRequest(cacheKey, async () => {
      try {
        const response = await backendApi.get(`/goal-kpi/team-leader/${teamLeaderId}/weekly-summary`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching weekly summary for team leader ${teamLeaderId}:`, error);
        throw error;
      }
    });
  },

  // Submit assessment (for work readiness)
  async submitAssessment(data: AssessmentPayload): Promise<SubmitAssessmentResponse> {
    try {
      const response = await backendApi.post(`/goal-kpi/submit-assessment`, data);
      return response.data;
    } catch (error) {
      console.error(`Error submitting assessment for worker ${data.workerId}:`, error);
      throw error;
    }
  },
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

export interface HealthCheckResponse {
  success: boolean;
  data?: any;
  error?: any;
}

export const testBackendConnection = async (): Promise<HealthCheckResponse> => {
  try {
    // Health check endpoint is at the root level, not under /api
    const response = await backendApi.get('/health', {
      baseURL: process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://sociosystem.onrender.com',
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Backend health check failed:', error);
    return { success: false, error };
  }
};

export default backendApi;
