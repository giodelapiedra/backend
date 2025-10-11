import axios from 'axios';
import { authClient } from '../lib/supabase';

// API Response Types
interface BaseAPIResponse {
  success: boolean;
  message?: string;
}

interface AssignmentKPIData {
  rating: string;
  color: string;
  description: string;
  score: number;
  completionRate: number;
  onTimeRate: number;
  lateRate: number;
  qualityScore: number;
  pendingBonus: number;
  overduePenalty: number;
  completedAssignments: number;
  pendingAssignments: number;
  overdueAssignments: number;
  totalAssignments: number;
}

interface AssignmentMetrics {
  totalAssignments: number;
  completedAssignments: number;
  onTimeSubmissions: number;
  pendingAssignments: number;
  overdueAssignments: number;
  qualityScore: number;
  completionRate: number;
  onTimeRate: number;
  lateRate: number;
  totalMembers: number;
}

interface RecentAssignment {
  id: string;
  assignedDate: string;
  status: string;
  dueTime: string;
  completedAt?: string;
  isOnTime: boolean;
}

export interface AssignmentKPIResponse extends BaseAPIResponse {
  kpi: AssignmentKPIData;
  metrics: AssignmentMetrics;
  recentAssignments: RecentAssignment[];
  period: {
    start: string;
    end: string;
    month: string;
  };
}

interface IndividualAssignmentKPI {
  workerId: string;
  workerName: string;
  workerEmail: string;
  kpi: AssignmentKPIData;
  assignments: {
    total: number;
    completed: number;
    onTime: number;
    pending: number;
    overdue: number;
  };
}

interface TeamAssignmentKPIResponse extends BaseAPIResponse {
  teamKPI: AssignmentKPIData;
  teamMetrics: AssignmentMetrics;
  individualKPIs: IndividualAssignmentKPI[];
  period: {
    start: string;
    end: string;
    month: string;
  };
}

interface AssessmentSubmissionResponse extends BaseAPIResponse {
  assessmentData: any;
  cycleInfo?: any;
  message: string; // Make message required since it's used in components
}

// Backend API base URL from environment variables
const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance for backend API
const backendApi = axios.create({
  baseURL: BACKEND_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token with refresh
backendApi.interceptors.request.use(
  async (config) => {
    try {
      // Get Supabase session token
      const { data: { session } } = await authClient.auth.getSession();
      
      if (session?.access_token) {
        config.headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('🔑 Token added to request:', session.access_token.substring(0, 20) + '...');
      } else {
        console.warn('⚠️ No access token found in session');
      }
      
      return config;
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors with token refresh
backendApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('🔐 401 Unauthorized - attempting token refresh...');
      originalRequest._retry = true;
      
      try {
        // Try to refresh the session
        const { data: { session }, error: refreshError } = await authClient.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          // Redirect to login
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        if (session?.access_token) {
          console.log('✅ Token refreshed successfully');
          // Update the original request with new token
          originalRequest.headers['Authorization'] = `Bearer ${session.access_token}`;
          // Retry the original request
          return backendApi(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Error during token refresh:', refreshError);
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    
    // Log network errors for debugging
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      console.error('🌐 Network error detected:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        method: error.config?.method
      });
    }
    
    return Promise.reject(error);
  }
);

// Retry helper function with proper generic typing
const retryRequest = async <T>(requestFn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw new Error('Retry function exhausted all attempts');
};

// KPI API helper functions
export const kpiAPI = {
  // Health check
  async checkHealth() {
    const response = await backendApi.get('/health');
    return response.data;
  },

  // Worker KPI endpoints
  async getWorkerWeeklyProgress(workerId: string): Promise<any> {
    return retryRequest(async () => {
      const response = await backendApi.get(`/goal-kpi/worker/weekly-progress?workerId=${workerId}`);
      return response.data;
    });
  },

  async getWorkerAssignmentKPI(workerId: string): Promise<AssignmentKPIResponse> {
    return retryRequest(async () => {
      const response = await backendApi.get(`/goal-kpi/worker/assignment-kpi?workerId=${workerId}`);
      return response.data;
    });
  },

  // Team Leader KPI endpoints
  async getTeamWeeklySummary(teamLeaderId: string): Promise<any> {
    return retryRequest(async () => {
      const response = await backendApi.get(`/goal-kpi/team-leader/weekly-summary?teamLeaderId=${teamLeaderId}`);
      return response.data;
    });
  },

  async getTeamAssignmentSummary(teamLeaderId: string): Promise<TeamAssignmentKPIResponse> {
    return retryRequest(async () => {
      const response = await backendApi.get(`/goal-kpi/team-leader/assignment-summary?teamLeaderId=${teamLeaderId}`);
      return response.data;
    });
  },

  async getTeamMonitoringDashboard(teamLeaderId: string): Promise<any> {
    return retryRequest(async () => {
      const response = await backendApi.get(`/goal-kpi/team-leader/monitoring-dashboard?teamLeaderId=${teamLeaderId}`);
      return response.data;
    });
  },

  async getMonthlyPerformanceTracking(teamLeaderId: string): Promise<any> {
    return retryRequest(async () => {
      const response = await backendApi.get(`/goal-kpi/team-leader/monthly-performance?teamLeaderId=${teamLeaderId}`);
      return response.data;
    });
  },

  // Assessment submission
  async submitAssessment(assessmentData: any): Promise<AssessmentSubmissionResponse> {
    return retryRequest(async () => {
      const response = await backendApi.post('/goal-kpi/submit-assessment', assessmentData);
      return response.data;
    });
  },

  // Login cycle tracking
  async trackLoginCycle(loginData: any): Promise<any> {
    return retryRequest(async () => {
      const response = await backendApi.post('/goal-kpi/login-cycle', loginData);
      return response.data;
    });
  },
};

// Test connection function
export async function testBackendConnection() {
  try {
    console.log('🔄 Testing backend connection...');
    
    // Test health endpoint
    const health = await kpiAPI.checkHealth();
    console.log('✅ Health check passed:', health);
    
    // Test API root endpoint to see all available endpoints
    const apiRoot = await backendApi.get('/');
    console.log('✅ API root endpoint:', apiRoot.data);
    
    return true;
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return false;
  }
}

export default backendApi;
