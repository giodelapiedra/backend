import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  timeout: 15000,
  withCredentials: true, // Important for CSRF and cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to get CSRF token
export const getCSRFToken = async (): Promise<string> => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/csrf-token`);
    return response.data.csrfToken;
  } catch (error) {
    console.warn('Could not get CSRF token:', error);
    return '';
  }
};

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Add auth token from Supabase session
    try {
      const { authClient } = await import('../lib/supabase');
      const { data: { session } } = await authClient.auth.getSession();
      
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (e) {
      console.warn('Could not get Supabase session:', e);
    }
    
    // Add CSRF token for state-changing operations
    if (config.method !== 'get' && !config.url?.includes('/auth/')) {
      try {
        const csrf = await getCSRFToken();
        if (csrf) {
          config.headers['X-CSRF-Token'] = csrf;
        }
      } catch (error) {
        console.warn('Could not add CSRF token:', error);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Auto-redirect to login on auth failure
      try {
        const { authClient } = await import('../lib/supabase');
        await authClient.auth.signOut();
      } catch (e) {
        console.warn('Could not sign out from Supabase:', e);
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper to check if user is authenticated
export const isAuthenticated = async () => {
  try {
    const { authClient } = await import('../lib/supabase');
    const { data: { session } } = await authClient.auth.getSession();
    return !!(session?.access_token);
  } catch {
    return false;
  }
};

// Helper to get current user from session
export const getCurrentUser = async () => {
  try {
    const { authClient } = await import('../lib/supabase');
    const { data: { session } } = await authClient.auth.getSession();
    return session?.user || null;
  } catch {
    return null;
  }
};

// Function to clear CSRF token
export const clearCSRFToken = () => {
  // CSRF tokens are typically stored in cookies, not localStorage
  // This is a placeholder for any cleanup needed
};

export default api;



