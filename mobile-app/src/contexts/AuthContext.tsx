import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import api from '../utils/api';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Helper for storage that works in both web and native environments
const Storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    } else {
      return SecureStore.setItemAsync(key, value);
    }
  },
  
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    } else {
      return SecureStore.getItemAsync(key);
    }
  },
  
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    } else {
      return SecureStore.deleteItemAsync(key);
    }
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const token = await Storage.getItem('token');
      const userString = await Storage.getItem('user');
      
      if (token && userString) {
        const userData = JSON.parse(userString);
        setUser(userData);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      await Storage.setItem('token', token);
      await Storage.setItem('user', JSON.stringify(user));
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await Storage.removeItem('token');
      await Storage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};