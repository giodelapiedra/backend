import axios from 'axios';
import { authClient } from '../lib/supabase';

// API Response Types
interface BaseAPIResponse {
  success: boolean;
  message?: string;
}

interface AssignmentResponse extends BaseAPIResponse {
  assignments: any[];
}

interface UnselectedWorkersResponse extends BaseAPIResponse {
  unselectedWorkers: any[];
}

interface CanSubmitResponse extends BaseAPIResponse {
  canSubmit: boolean;
  assignment?: any;
}

interface AssignmentCreationResponse extends BaseAPIResponse {
  deadlineMessage?: string;
}

interface AssignmentCancellationResponse extends BaseAPIResponse {
  message: string;
}

interface OverdueMarkingResponse extends BaseAPIResponse {
  count: number;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔐 Auth Token Interceptor
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await authClient.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ❌ 401 Interceptor — consider external handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // 👇 Move this to external logic if possible
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 🔁 Unified request wrapper for cleaner API methods
const request = async <T>(fn: () => Promise<any>, fallbackErrorMsg: string): Promise<T> => {
  try {
    const response = await fn();
    return response.data;
  } catch (error: any) {
    const message = error?.response?.data?.error || fallbackErrorMsg;
    console.error(message, error);
    throw new Error(message);
  }
};

// 🕒 Time conversion utility (UTC to PHT)
const toPHT = (isoTime: string): string => {
  const date = new Date(`1970-01-01T${isoTime}Z`);
  date.setHours(date.getHours() + 8); // Convert UTC to UTC+8
  return date.toISOString().substring(11, 16); // "HH:MM"
};

export class BackendAssignmentAPI {
  static async createAssignments(
    workerIds: string[],
    assignedDate: Date,
    team: string,
    notes?: string,
    dueTime?: string,
    unselectedWorkers?: Array<{ workerId: string; reason: string; notes?: string }>
  ): Promise<AssignmentCreationResponse> {
    const formattedDate = assignedDate.toISOString().split('T')[0];
    let formattedTime = '09:00';

    if (dueTime) {
      const match = dueTime.match(/\d{2}:\d{2}/);
      formattedTime = match ? toPHT(`${match[0]}:00`) : '09:00';
    }

    return request(() =>
      apiClient.post('/work-readiness-assignments', {
        workerIds,
        assignedDate: formattedDate,
        team,
        notes,
        dueTime: dueTime ? formattedTime : undefined,
        unselectedWorkers,
      }), 'Failed to create assignments'
    );
  }

  static async getAssignments(date?: Date, status?: string, startDate?: Date, endDate?: Date): Promise<AssignmentResponse> {
    const params: any = {};
    if (date) params.date = date.toISOString().split('T')[0];
    if (startDate && endDate) {
      params.startDate = startDate.toISOString().split('T')[0];
      params.endDate = endDate.toISOString().split('T')[0];
    }
    if (status) params.status = status;
    
    // Add cache busting parameter
    params._t = Date.now();

    return request(() => apiClient.get('/work-readiness-assignments', { params }), 'Failed to fetch assignments');
  }

  static async getWorkerAssignments(date?: Date, status?: string): Promise<AssignmentResponse> {
    const params: any = {};
    if (date) params.date = date.toISOString().split('T')[0];
    if (status) params.status = status;

    return request(() => apiClient.get('/work-readiness-assignments/worker', { params }), 'Failed to fetch worker assignments');
  }

  static async getTodayAssignment(): Promise<CanSubmitResponse> {
    return request(() => apiClient.get('/work-readiness-assignments/today'), 'Failed to fetch today\'s assignment');
  }

  static async updateAssignmentStatus(
    assignmentId: string,
    status: string,
    notes?: string,
    workReadinessId?: string
  ): Promise<BaseAPIResponse> {
    return request(() =>
      apiClient.patch(`/work-readiness-assignments/${assignmentId}`, {
        status,
        notes,
        workReadinessId,
      }), 'Failed to update assignment'
    );
  }

  static async cancelAssignment(assignmentId: string): Promise<AssignmentCancellationResponse> {
    return request(() => apiClient.delete(`/work-readiness-assignments/${assignmentId}`), 'Failed to cancel assignment');
  }

  static async getAssignmentStats(startDate?: Date, endDate?: Date): Promise<any> {
    const params: any = {};
    if (startDate) params.startDate = startDate.toISOString().split('T')[0];
    if (endDate) params.endDate = endDate.toISOString().split('T')[0];

    return request(() => apiClient.get('/work-readiness-assignments/stats', { params }), 'Failed to fetch stats');
  }

  static async canSubmitWorkReadiness(): Promise<CanSubmitResponse> {
    return request(() => apiClient.get('/work-readiness-assignments/can-submit'), 'Failed to check submission eligibility');
  }

  static async getUnselectedWorkers(date?: Date): Promise<UnselectedWorkersResponse> {
    const params: any = {};
    if (date) params.date = date.toISOString().split('T')[0];

    return request(() => apiClient.get('/work-readiness-assignments/unselected', { params }), 'Failed to fetch unselected workers');
  }

  static async closeUnselectedWorkerCase(unselectedWorkerId: string): Promise<BaseAPIResponse> {
    return request(() => apiClient.patch(`/work-readiness-assignments/unselected/${unselectedWorkerId}/close`), 'Failed to close case');
  }

  static async markOverdueAssignments(): Promise<OverdueMarkingResponse> {
    return request(() => apiClient.post('/work-readiness-assignments/mark-overdue'), 'Failed to mark overdue assignments');
  }
}
