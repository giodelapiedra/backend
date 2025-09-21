import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Cross-platform storage helper
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

// Get the local IP address for development
const getLocalIp = () => {
  // When running in Expo Go, we need to use the local IP address of the computer
  // instead of localhost, so the device can connect to the backend
  const localIp = '192.168.254.103'; // Replace with your computer's local IP address
  return localIp;
};

// Create axios instance with base configuration
const api = axios.create({
  // Use local IP in development, real server URL in production
  baseURL: `http://${getLocalIp()}:5000/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await Storage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token from storage:', error);
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
  async (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      await Storage.removeItem('token');
      await Storage.removeItem('user');
      // Handle navigation to login in your app
    }
    
    // Enhance error message with more details
    if (error.response?.data) {
      error.message = error.response.data.message || error.message;
      error.details = error.response.data.details || error.response.data.errors || null;
    }
    
    return Promise.reject(error);
  }
);

export default api;