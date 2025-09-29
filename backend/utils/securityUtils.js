const crypto = require('crypto');

// Security utility functions
const SecurityUtils = {
  // Check if running in production
  isProduction: () => process.env.NODE_ENV === 'production',
  
  // Mask sensitive data for logging
  maskSensitiveData: (data, visibleChars = 4) => {
    if (!data || data.length <= visibleChars) return '***';
    return data.substring(0, visibleChars) + '*'.repeat(data.length - visibleChars);
  },
  
  // Validate environment variables
  validateEnvVars: () => {
    const requiredVars = ['JWT_SECRET', 'MONGODB_URI'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    }
    
    return missing.length === 0;
  },
  
  // Log security warnings
  logSecurityWarnings: () => {
    if (!SecurityUtils.isProduction()) {
      console.log('🔒 SECURITY WARNINGS:');
      console.log('   - Running in development mode');
      console.log('   - API credentials using fallback values');
      console.log('   - For production, set proper environment variables');
      console.log('   - Never commit .env file to version control');
    }
  }
};

module.exports = SecurityUtils;
