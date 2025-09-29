import axios from 'axios';
import Cookies from 'js-cookie';

// CSRF token storage
let csrfToken: string | null = null;

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  withCredentials: true, // Important for CSRF and cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to get CSRF token
export const getCSRFToken = async (): Promise<string> => {
  if (!csrfToken) {
    try {
      console.log('Fetching CSRF token...');
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/csrf-token`, {
        withCredentials: true
      });
      csrfToken = response.data.csrfToken;
      if (csrfToken) {
        console.log('CSRF token received:', csrfToken.substring(0, 10) + '...');
      }
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }
  return csrfToken!; // Non-null assertion since we just set it above
};

// Request interceptor to add auth token and CSRF token
api.interceptors.request.use(
  async (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token for non-GET requests (except register)
    if (config.method !== 'get' && 
        !config.url?.includes('/auth/register') &&
        !config.url?.includes('/csrf-token')) {
      try {
        const csrf = await getCSRFToken();
        config.headers['X-CSRF-Token'] = csrf;
        console.log('CSRF token added to request:', csrf.substring(0, 10) + '...');
      } catch (error) {
        console.error('Failed to get CSRF token:', error);
        // Continue without CSRF token
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        // Token expired or invalid
        Cookies.remove('token');
        Cookies.remove('user');
        window.location.href = '/login';
        return Promise.reject(new Error('Your session has expired. Please log in again.'));
      }
      // If we're on login page, just reject the promise without redirecting
      return Promise.reject(error);
    }
    
    if (error.response?.status === 403) {
      return Promise.reject(new Error('You do not have permission to access this resource.'));
    }
    
    if (error.response?.status === 500) {
      return Promise.reject(new Error('An unexpected error occurred. Our team has been notified.'));
    }
    
    // Enhance error message with more details
    if (error.response?.data) {
      const errorMessage = error.response.data.message || error.message;
      const errorDetails = error.response.data.details || error.response.data.errors;
      
      error.message = errorMessage;
      error.details = errorDetails;
    }
    
    return Promise.reject(error);
  }
);

// Helper to check if user is authenticated
export const isAuthenticated = () => {
  return !!Cookies.get('token');
};

// Helper to get current user from cookies
export const getCurrentUser = () => {
  const userStr = Cookies.get('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Function to clear CSRF token (useful for logout)
export const clearCSRFToken = () => {
  csrfToken = null;
};

export default api;



