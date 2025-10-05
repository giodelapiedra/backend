import axios from 'axios';
import Cookies from 'js-cookie';

// CSRF token storage
let csrfToken: string | null = null;

// Create axios instance with base configuration
// DISABLED: Using Supabase instead of backend API
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api', // DISABLED - Using Supabase
  timeout: 15000,
  withCredentials: true, // Important for CSRF and cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Override all API methods to throw error and redirect to Supabase usage
const throwSupabaseError = () => {
  throw new Error('This API endpoint has been migrated to Supabase. Please use Supabase client instead.');
};

api.get = throwSupabaseError;
api.post = throwSupabaseError;
api.put = throwSupabaseError;
api.patch = throwSupabaseError;
api.delete = throwSupabaseError;

// Function to get CSRF token - DISABLED (using Supabase)
export const getCSRFToken = async (): Promise<string> => {
  throw new Error('CSRF token is not needed with Supabase. Please use Supabase client instead.');
};

// Request interceptor - DISABLED (using Supabase)
api.interceptors.request.use(
  async (config) => {
    throw new Error('API interceptors disabled. Please use Supabase client instead.');
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - DISABLED (using Supabase)
api.interceptors.response.use(
  (response) => {
    throw new Error('API interceptors disabled. Please use Supabase client instead.');
  },
  (error) => {
    throw new Error('API interceptors disabled. Please use Supabase client instead.');
  }
);

// Helper to check if user is authenticated - DISABLED (using Supabase)
export const isAuthenticated = () => {
  throw new Error('isAuthenticated is not needed with Supabase. Please use Supabase auth client instead.');
};

// Helper to get current user from cookies - DISABLED (using Supabase)
export const getCurrentUser = () => {
  throw new Error('getCurrentUser is not needed with Supabase. Please use Supabase auth client instead.');
};

// Function to clear CSRF token - DISABLED (using Supabase)
export const clearCSRFToken = () => {
  throw new Error('clearCSRFToken is not needed with Supabase. Please use Supabase auth client instead.');
};

export default api;



