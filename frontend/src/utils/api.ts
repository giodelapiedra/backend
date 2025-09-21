import axios from 'axios';
import Cookies from 'js-cookie';

// CSRF token storage
let csrfToken: string | null = null;

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to get CSRF token
export const getCSRFToken = async (): Promise<string> => {
  if (!csrfToken) {
    try {
      console.log('Fetching CSRF token from server...');
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/csrf-token`);
      csrfToken = response.data.csrfToken;
      console.log('CSRF token fetched:', csrfToken ? csrfToken.substring(0, 10) + '...' : 'null');
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
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
      console.log('Adding auth token to request');
    } else {
      console.warn('No auth token found in cookies');
    }

    // Add CSRF token for non-GET requests (except login/register)
    if (config.method !== 'get' && 
        !config.url?.includes('/auth/login') && 
        !config.url?.includes('/auth/register') &&
        !config.url?.includes('/csrf-token')) {
      try {
        const csrf = await getCSRFToken();
        config.headers['X-CSRF-Token'] = csrf;
        console.log('Added CSRF token to request:', config.url, csrf.substring(0, 10) + '...');
      } catch (error) {
        console.error('Failed to add CSRF token:', error);
        // For now, continue without CSRF token to test if that's the issue
        console.warn('Continuing without CSRF token for debugging');
      }
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      console.log('Authentication error (401) - redirecting to login');
      // Token expired or invalid
      Cookies.remove('token');
      Cookies.remove('user');
      window.location.href = '/login';
    }
    
    // Enhance error message with more details
    if (error.response?.data) {
      error.message = error.response.data.message || error.message;
      error.details = error.response.data.details || error.response.data.errors || null;
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
      console.error('Error parsing user from cookies', e);
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



