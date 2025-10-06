import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import api, { clearCSRFToken } from '../utils/api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  team?: string;
  teamLeader?: string;
  package?: string;
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
  specialization?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData, profilePhoto?: File | null) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserInContext: (updatedUserData: any) => void;
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Try to get user from cookies immediately
    const storedUser = Cookies.get('user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        console.error('Error parsing stored user data:', e);
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(Cookies.get('token') || null);
  const [loading, setLoading] = useState(() => {
    // If we have user data from cookies, start with loading false
    const storedUser = Cookies.get('user');
    const storedToken = Cookies.get('token');
    return !(storedUser && storedToken);
  });
  const [error, setError] = useState<string | null>(null);

  // Set up axios interceptor for token
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('Setting Authorization header with token');
    } else {
      delete api.defaults.headers.common['Authorization'];
      console.log('Removing Authorization header - no token');
    }
  }, [token]);

  // Check for existing token on app load
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = Cookies.get('token');
      
      if (storedToken) {
        try {
          // Set token in api headers
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // If we already have user data from cookies, verify in background
          if (user) {
            // Verify token with server in background
            try {
              const response = await api.get('/auth/me');
              const freshUser = response.data.user;
              
              // Only update if the user data has actually changed
              if (JSON.stringify(freshUser) !== JSON.stringify(user)) {
                setUser(freshUser);
                
                // Update stored user data with fresh data from server
                Cookies.set('user', JSON.stringify(freshUser), { 
                  secure: process.env.NODE_ENV === 'production', 
                  sameSite: 'strict', 
                  expires: 7,
                  path: '/'
                });
              }
              setToken(storedToken);
            } catch (error: any) {
              console.error('Error verifying authentication:', error.message);
              // Clear auth data
              Cookies.remove('token');
              Cookies.remove('user');
              delete api.defaults.headers.common['Authorization'];
              setUser(null);
              setToken(null);
            }
          } else {
            // No user data, need to verify token
            const response = await api.get('/auth/me');
            setUser(response.data.user);
            setToken(storedToken);
            
            // Update stored user data with fresh data from server
            Cookies.set('user', JSON.stringify(response.data.user), { 
              secure: process.env.NODE_ENV === 'production', 
              sameSite: 'strict', 
              expires: 7,
              path: '/'
            });
          }
        } catch (error: any) {
          console.error('Error verifying authentication:', error.message);
          
          // Clear auth data
          Cookies.remove('token');
          Cookies.remove('user');
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
          setToken(null);
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [user]); // Include user dependency

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting login for:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('Login response received:', response.status);
      
      const { token: newToken, user: userData } = response.data;
      
      console.log('Login successful, storing user data:', userData);
      
      // Store token in cookies (secure, httpOnly would be better but requires backend support)
      Cookies.set('token', newToken, { 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict', 
        expires: 7, // 7 days expiry
        path: '/' // Ensure cookie is available on all paths
      });
      
      // Store user data in cookies
      Cookies.set('user', JSON.stringify(userData), { 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict', 
        expires: 7,
        path: '/'
      });
      
      console.log('Token and user data stored in cookies');
      console.log('Cookie token value:', Cookies.get('token') ? 'exists' : 'missing');
      
      setToken(newToken);
      setUser(userData);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
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
        
        response = await api.post('/auth/register', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Regular JSON request without photo
        response = await api.post('/auth/register', userData);
      }
      
      const { token: newToken, user: newUser } = response.data;
      
      console.log('Registration successful, storing user data:', newUser);
      
      // Store token in cookies
      Cookies.set('token', newToken, { 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict', 
        expires: 7,
        path: '/'
      }); // 7 days expiry
      
      // Store user data in cookies
      Cookies.set('user', JSON.stringify(newUser), { 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict', 
        expires: 7,
        path: '/'
      });
      
      setToken(newToken);
      setUser(newUser);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
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
      const response = await api.get('/auth/me');
      const updatedUser = response.data.user;
      setUser(updatedUser);
      
      // Update stored user data with fresh data from server
      Cookies.set('user', JSON.stringify(updatedUser), { 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict', 
        expires: 7,
        path: '/'
      });
      
      console.log('User data refreshed:', updatedUser);
    } catch (error: any) {
      console.error('Error refreshing user data:', error);
    }
  };

  const updateUserInContext = (updatedUserData: any) => {
    console.log('=== UPDATE USER IN CONTEXT ===');
    console.log('Updated user data:', updatedUserData);
    
    setUser(updatedUserData);
    
    // Update stored user data in cookies
    Cookies.set('user', JSON.stringify(updatedUserData), { 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict', 
      expires: 7,
      path: '/'
    });
    
    console.log('=== END UPDATE USER IN CONTEXT ===');
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to clear server-side cookies
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if backend call fails
      console.log('Backend logout failed, continuing with frontend logout');
    }
    
    // Clear frontend cookies and state with all possible configurations
    Cookies.remove('token', { path: '/' });
    Cookies.remove('user', { path: '/' });
    Cookies.remove('token', { path: '/', domain: 'localhost' });
    Cookies.remove('user', { path: '/', domain: 'localhost' });
    
    clearCSRFToken(); // Clear CSRF token
    // Clear password verification for auth logs
    sessionStorage.removeItem('authLogsPasswordVerified');
    localStorage.clear(); // Clear all localStorage
    
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    
    console.log('Logout completed - all cookies and state cleared');
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    refreshUser,
    updateUserInContext,
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
