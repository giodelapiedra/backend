import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { clearCSRFToken } from '../utils/api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  employer?: string;
  isActive: boolean;
  lastLogin?: string;
  profileImage?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  };
  medicalInfo?: {
    bloodType?: string;
    allergies?: string[];
    medications?: string[];
    medicalConditions?: string[];
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData, profilePhoto?: File | null) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  employer?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  };
  medicalInfo?: {
    bloodType?: string;
    allergies?: string[];
    medications?: string[];
    medicalConditions?: string[];
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(Cookies.get('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up axios interceptor for token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('Setting Authorization header with token');
    } else {
      delete axios.defaults.headers.common['Authorization'];
      console.log('Removing Authorization header - no token');
    }
  }, [token]);

  // Check for existing token on app load
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = Cookies.get('token');
      const storedUser = Cookies.get('user');
      
      console.log('Checking stored auth data:', { 
        hasToken: !!storedToken, 
        hasUserData: !!storedUser,
        token: storedToken ? storedToken.substring(0, 10) + '...' : 'none'
      });
      
      if (storedToken) {
        try {
          // Set token in axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          console.log('Set Authorization header for verification request');
          
          // Try to parse stored user data
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              setUser(userData);
              console.log('User data loaded from cookies:', userData);
            } catch (e) {
              console.error('Error parsing stored user data:', e);
            }
          }
          
          // Verify token with server
          console.log('Sending verification request to /auth/me');
          const response = await axios.get('/auth/me');
          console.log('Verification response received:', response.status);
          setUser(response.data.user);
          setToken(storedToken);
          
          // Update stored user data with fresh data from server
          Cookies.set('user', JSON.stringify(response.data.user), { secure: true, sameSite: 'strict', expires: 7 });
          console.log('User data refreshed from server:', response.data.user);
        } catch (error: any) {
          console.error('Error verifying authentication:', error.message);
          console.error('Response status:', error.response?.status);
          console.error('Response data:', error.response?.data);
          
          // Clear auth data
          Cookies.remove('token');
          Cookies.remove('user');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          setToken(null);
        }
      } else {
        console.log('No stored token found');
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting login for:', email);
      const response = await axios.post('/auth/login', { email, password });
      console.log('Login response received:', response.status);
      
      const { token: newToken, user: userData } = response.data;
      
      console.log('Login successful, storing user data:', userData);
      
      // Store token in cookies (secure, httpOnly would be better but requires backend support)
      Cookies.set('token', newToken, { 
        secure: true, 
        sameSite: 'strict', 
        expires: 7, // 7 days expiry
        path: '/' // Ensure cookie is available on all paths
      });
      
      // Store user data in cookies
      Cookies.set('user', JSON.stringify(userData), { 
        secure: true, 
        sameSite: 'strict', 
        expires: 7,
        path: '/'
      });
      
      console.log('Token and user data stored in cookies');
      console.log('Cookie token value:', Cookies.get('token') ? 'exists' : 'missing');
      
      setToken(newToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      console.log('Authorization header set for future requests');
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed';
      console.error('Error message:', errorMessage);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData, profilePhoto?: File | null) => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      
      if (profilePhoto) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('firstName', userData.firstName);
        formData.append('lastName', userData.lastName);
        formData.append('email', userData.email);
        formData.append('password', userData.password);
        formData.append('role', userData.role);
        if (userData.phone) formData.append('phone', userData.phone);
        if (userData.employer) formData.append('employer', userData.employer);
        if (userData.address) formData.append('address', JSON.stringify(userData.address));
        if (userData.emergencyContact) formData.append('emergencyContact', JSON.stringify(userData.emergencyContact));
        if (userData.medicalInfo) formData.append('medicalInfo', JSON.stringify(userData.medicalInfo));
        formData.append('profileImage', profilePhoto);
        
        response = await axios.post('/auth/register', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Regular JSON request without photo
        response = await axios.post('/auth/register', userData);
      }
      
      const { token: newToken, user: newUser } = response.data;
      
      console.log('Registration successful, storing user data:', newUser);
      
      // Store token in cookies
      Cookies.set('token', newToken, { secure: true, sameSite: 'strict', expires: 7 }); // 7 days expiry
      
      // Store user data in cookies
      Cookies.set('user', JSON.stringify(newUser), { secure: true, sameSite: 'strict', expires: 7 });
      
      setToken(newToken);
      setUser(newUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed';
      
      if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        if (Array.isArray(errors)) {
          errorMessage = errors.map((err: any) => err.msg).join(', ');
        } else {
          errorMessage = Object.values(errors).join(', ');
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get('/auth/me');
      const updatedUser = response.data.user;
      setUser(updatedUser);
      
      // Update stored user data with fresh data from server
      Cookies.set('user', JSON.stringify(updatedUser), { 
        secure: true, 
        sameSite: 'strict', 
        expires: 7,
        path: '/'
      });
      
      console.log('User data refreshed:', updatedUser);
    } catch (error: any) {
      console.error('Error refreshing user data:', error);
    }
  };

  const logout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    clearCSRFToken(); // Clear CSRF token
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    refreshUser,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
