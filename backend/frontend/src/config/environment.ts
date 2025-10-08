/**
 * ✅ SECURITY FIX: Centralized Environment Configuration
 * All environment variables should be accessed through this file
 * Never expose sensitive keys in frontend code
 */

// ✅ SECURE: Use import.meta.env for Vite or process.env for CRA
const getEnvVar = (key: string, defaultValue?: string): string => {
  // For Vite projects
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as any)[key] || defaultValue || '';
  }
  // For Create React App
  return process.env[key] || defaultValue || '';
};

export const config = {
  // API Configuration
  api: {
    baseUrl: getEnvVar('REACT_APP_API_BASE_URL', 'http://localhost:5001'),
    timeout: 30000,
  },

  // Supabase Configuration
  supabase: {
    url: getEnvVar('REACT_APP_SUPABASE_URL', 'https://dtcgzgbxhefwhqpeotrl.supabase.co'),
    anonKey: getEnvVar('REACT_APP_SUPABASE_ANON_KEY', ''),
    // ⚠️ NEVER put service role key in frontend!
  },

  // Application Configuration
  app: {
    name: 'Work Readiness System',
    version: '1.0.0',
    environment: getEnvVar('NODE_ENV', 'development'),
  },

  // Feature Flags
  features: {
    enableNotifications: true,
    enableWorkReadiness: true,
    enableAnalytics: getEnvVar('REACT_APP_ENABLE_ANALYTICS', 'false') === 'true',
  },

  // Performance Configuration
  performance: {
    enableLazyLoading: true,
    imageOptimization: true,
  },
} as const;

// ✅ Type-safe config access
export type AppConfig = typeof config;

// ✅ Validation: Check required environment variables
export const validateConfig = (): boolean => {
  const required = [
    config.supabase.url,
    config.supabase.anonKey,
  ];

  const missing = required.filter(val => !val);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables!');
    console.error('Please check your .env file');
    return false;
  }

  return true;
};

// ✅ Safe config for logging (no sensitive data)
export const getSafeConfig = () => ({
  api: {
    baseUrl: config.api.baseUrl,
  },
  app: config.app,
  features: config.features,
});

export default config;

