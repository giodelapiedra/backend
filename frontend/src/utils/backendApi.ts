import axios from 'axios';
import { authClient } from '../lib/supabase';

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

// Request interceptor - add auth token
backendApi.interceptors.request.use(
  async (config) => {
    try {
      // Get Supabase session token
      const { data: { session } } = await authClient.auth.getSession();
      
      if (session?.access_token) {
        config.headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      return config;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
backendApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('Unauthorized - redirecting to login');
      // Redirect to login if needed
      window.location.href = '/login';
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

// Retry helper function
const retryRequest = async (requestFn: () => Promise<any>, maxRetries = 3, delay = 1000) => {
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
};

// KPI API helper functions
export const kpiAPI = {
  // Health check
  async checkHealth() {
    const response = await backendApi.get('/health');
    return response.data;
  },

  // Worker KPI endpoints
  async getWorkerWeeklyProgress(workerId: string) {
    return retryRequest(async () => {
      const response = await backendApi.get(`/goal-kpi/worker/weekly-progress?workerId=${workerId}`);
      return response.data;
    });
  },

  async getWorkerAssignmentKPI(workerId: string) {
    return retryRequest(async () => {
      const response = await backendApi.get(`/goal-kpi/worker/assignment-kpi?workerId=${workerId}`);
      return response.data;
    });
  },

  // Team Leader KPI endpoints
  async getTeamWeeklySummary(teamLeaderId: string) {
    return retryRequest(async () => {
      const response = await backendApi.get(`/goal-kpi/team-leader/weekly-summary?teamLeaderId=${teamLeaderId}`);
      return response.data;
    });
  },

  async getTeamAssignmentSummary(teamLeaderId: string) {
    return retryRequest(async () => {
      const response = await backendApi.get(`/goal-kpi/team-leader/assignment-summary?teamLeaderId=${teamLeaderId}`);
      return response.data;
    });
  },

  async getTeamMonitoringDashboard(teamLeaderId: string) {
    return retryRequest(async () => {
      const response = await backendApi.get(`/goal-kpi/team-leader/monitoring-dashboard?teamLeaderId=${teamLeaderId}`);
      return response.data;
    });
  },

  async getMonthlyPerformanceTracking(teamLeaderId: string) {
    return retryRequest(async () => {
      const response = await backendApi.get(`/goal-kpi/team-leader/monthly-performance?teamLeaderId=${teamLeaderId}`);
      return response.data;
    });
  },

  // Assessment submission
  async submitAssessment(assessmentData: any) {
    return retryRequest(async () => {
      const response = await backendApi.post('/goal-kpi/submit-assessment', assessmentData);
      return response.data;
    });
  },

  // Login cycle tracking
  async trackLoginCycle(loginData: any) {
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
