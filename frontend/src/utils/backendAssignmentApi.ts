import axios from 'axios';
import { authClient } from '../lib/supabase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance with auth header
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get Supabase session token
      const { data: { session } } = await authClient.auth.getSession();
      
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
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

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export class BackendAssignmentAPI {
  /**
   * Create work readiness assignments
   */
  static async createAssignments(
    workerIds: string[],
    assignedDate: Date,
    team: string,
    notes?: string,
    dueTime?: string,
    unselectedWorkers?: Array<{workerId: string, reason: string, notes?: string}>
  ) {
    try {
      // Ensure dueTime is in correct format (HH:MM)
      let formattedDueTime = '09:00'; // default
      if (dueTime) {
        // Convert to string and extract time if needed
        const timeStr = String(dueTime);
        if (timeStr.includes('T')) {
          // If it's an ISO string, extract time part
          const timePart = timeStr.split('T')[1]?.split('.')[0]?.substring(0, 5);
          formattedDueTime = timePart || '09:00';
        } else if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
          // If it's already in HH:MM format
          formattedDueTime = timeStr;
        }
      }

      const response = await apiClient.post('/work-readiness-assignments', {
        workerIds,
        assignedDate: assignedDate.toISOString().split('T')[0],
        team,
        notes,
        dueTime: formattedDueTime,
        unselectedWorkers
      });
      return response.data;
    } catch (error: any) {
      console.error('Error creating assignments:', error);
      throw new Error(error.response?.data?.error || 'Failed to create assignments');
    }
  }

  /**
   * Get assignments for team leader
   */
  static async getAssignments(date?: Date, status?: string) {
    try {
      const params: any = {};
      if (date) {
        params.date = date.toISOString().split('T')[0];
      }
      if (status) {
        params.status = status;
      }

      const response = await apiClient.get('/work-readiness-assignments', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch assignments');
    }
  }

  /**
   * Get assignments for worker
   */
  static async getWorkerAssignments(date?: Date, status?: string) {
    try {
      const params: any = {};
      if (date) {
        params.date = date.toISOString().split('T')[0];
      }
      if (status) {
        params.status = status;
      }

      const response = await apiClient.get('/work-readiness-assignments/worker', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching worker assignments:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch assignments');
    }
  }

  /**
   * Get today's assignment for worker
   */
  static async getTodayAssignment() {
    try {
      const response = await apiClient.get('/work-readiness-assignments/today');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching today assignment:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch assignment');
    }
  }

  /**
   * Update assignment status
   */
  static async updateAssignmentStatus(
    assignmentId: string,
    status: string,
    notes?: string,
    workReadinessId?: string
  ) {
    try {
      const response = await apiClient.patch(`/work-readiness-assignments/${assignmentId}`, {
        status,
        notes,
        workReadinessId
      });
      return response.data;
    } catch (error: any) {
      console.error('Error updating assignment:', error);
      throw new Error(error.response?.data?.error || 'Failed to update assignment');
    }
  }

  /**
   * Cancel assignment
   */
  static async cancelAssignment(assignmentId: string) {
    try {
      const response = await apiClient.delete(`/work-readiness-assignments/${assignmentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error cancelling assignment:', error);
      throw new Error(error.response?.data?.error || 'Failed to cancel assignment');
    }
  }

  /**
   * Get assignment statistics
   */
  static async getAssignmentStats(startDate?: Date, endDate?: Date) {
    try {
      const params: any = {};
      if (startDate) {
        params.startDate = startDate.toISOString().split('T')[0];
      }
      if (endDate) {
        params.endDate = endDate.toISOString().split('T')[0];
      }

      const response = await apiClient.get('/work-readiness-assignments/stats', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching assignment stats:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch statistics');
    }
  }

  /**
   * Mark overdue assignments (Admin only)
   */
  static async markOverdueAssignments() {
    try {
      const response = await apiClient.post('/work-readiness-assignments/mark-overdue');
      return response.data;
    } catch (error: any) {
      console.error('Error marking overdue assignments:', error);
      throw new Error(error.response?.data?.error || 'Failed to mark overdue assignments');
    }
  }

  /**
   * Check if worker can submit work readiness (has active assignment)
   */
  static async canSubmitWorkReadiness() {
    try {
      const response = await apiClient.get('/work-readiness-assignments/can-submit');
      return response.data;
    } catch (error: any) {
      console.error('Error checking if can submit work readiness:', error);
      throw new Error(error.response?.data?.error || 'Failed to check assignment status');
    }
  }

  /**
   * Get unselected workers with reasons
   */
  static async getUnselectedWorkers(date?: Date) {
    try {
      const params: any = {};
      if (date) {
        params.date = date.toISOString().split('T')[0];
      }

      const response = await apiClient.get('/work-readiness-assignments/unselected', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching unselected workers:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch unselected workers');
    }
  }

  /**
   * Close unselected worker case
   */
  static async closeUnselectedWorkerCase(unselectedWorkerId: string) {
    try {
      const response = await apiClient.patch(`/work-readiness-assignments/unselected/${unselectedWorkerId}/close`);
      return response.data;
    } catch (error: any) {
      console.error('Error closing unselected worker case:', error);
      throw new Error(error.response?.data?.error || 'Failed to close case');
    }
  }
}
