const AuthenticationLog = require('../models/AuthenticationLog');

// Helper function to get client IP address
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         'unknown';
};

// Helper function to parse user agent
const parseUserAgent = (userAgent) => {
  const ua = userAgent || '';
  
  // Simple device detection
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?=.*Tablet)|Windows NT.*Touch/i.test(ua);
  
  let deviceType = 'desktop';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';
  
  // Simple browser detection
  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';
  
  // Simple OS detection
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';
  
  return {
    deviceType,
    browser,
    os,
    userAgent: ua
  };
};

// Middleware to log authentication activities
const logAuthenticationActivity = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log the activity after sending the response
    setImmediate(async () => {
      try {
        await logActivity(req, res, data);
      } catch (error) {
        console.error('Error logging authentication activity:', error);
      }
    });
    
    // Call the original send method
    originalSend.call(this, data);
  };
  
  next();
};

// Function to log the actual activity
const logActivity = async (req, res, data) => {
  try {
    const { method, url, body, user } = req;
    const ipAddress = getClientIP(req);
    const userAgentInfo = parseUserAgent(req.headers['user-agent']);
    
    // Determine action based on route and response
    let action = '';
    let success = true;
    let failureReason = null;
    
    if (url.includes('/login')) {
      if (method === 'POST') {
        // Check if login was successful based on response
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        
        if (responseData.message === 'Login successful' || responseData.token) {
          action = 'login';
          success = true;
        } else {
          action = 'login_failed';
          success = false;
          failureReason = responseData.message?.includes('Invalid credentials') ? 'invalid_credentials' : 'unknown';
        }
      }
    } else if (url.includes('/logout')) {
      if (method === 'POST') {
        action = 'logout';
        success = true;
      }
    } else if (url.includes('/change-password')) {
      if (method === 'POST') {
        action = 'password_reset';
        success = true;
      }
    }
    
    // Only log if we have a valid action and user info
    if (action && (user || body?.email)) {
      const logData = {
        userId: user?._id || null,
        userEmail: user?.email || body?.email || 'unknown',
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
        userRole: user?.role || 'unknown',
        action,
        ipAddress,
        userAgent: userAgentInfo.userAgent,
        success,
        failureReason,
        sessionId: req.sessionID || null,
        deviceInfo: {
          deviceType: userAgentInfo.deviceType,
          browser: userAgentInfo.browser,
          os: userAgentInfo.os
        },
        additionalData: {
          url,
          method,
          responseStatus: res.statusCode
        }
      };
      
      // Create the log entry
      await AuthenticationLog.create(logData);
      
      console.log(`📝 Authentication log: ${action} - ${logData.userEmail} - ${success ? 'SUCCESS' : 'FAILED'}`);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
};

// Function to manually log login activity (for use in auth routes)
const logLoginActivity = async (user, req, success = true, failureReason = null) => {
  try {
    const ipAddress = getClientIP(req);
    const userAgentInfo = parseUserAgent(req.headers['user-agent']);
    
    const logData = {
      userId: user?._id || null,
      userEmail: user?.email || req.body?.email || 'unknown',
      userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
      userRole: user?.role || 'unknown',
      action: success ? 'login' : 'login_failed',
      ipAddress,
      userAgent: userAgentInfo.userAgent,
      success,
      failureReason,
      sessionId: req.sessionID || null,
      deviceInfo: {
        deviceType: userAgentInfo.deviceType,
        browser: userAgentInfo.browser,
        os: userAgentInfo.os
      },
      additionalData: {
        url: req.url,
        method: req.method
      }
    };
    
    await AuthenticationLog.create(logData);
    
    console.log(`📝 Manual login log: ${logData.action} - ${logData.userEmail} - ${success ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error('Error logging login activity:', error);
  }
};

// Function to manually log logout activity
const logLogoutActivity = async (user, req) => {
  try {
    const ipAddress = getClientIP(req);
    const userAgentInfo = parseUserAgent(req.headers['user-agent']);
    
    const logData = {
      userId: user?._id || null,
      userEmail: user?.email || 'unknown',
      userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
      userRole: user?.role || 'unknown',
      action: 'logout',
      ipAddress,
      userAgent: userAgentInfo.userAgent,
      success: true,
      sessionId: req.sessionID || null,
      deviceInfo: {
        deviceType: userAgentInfo.deviceType,
        browser: userAgentInfo.browser,
        os: userAgentInfo.os
      },
      additionalData: {
        url: req.url,
        method: req.method
      }
    };
    
    await AuthenticationLog.create(logData);
    
    console.log(`📝 Logout log: ${logData.userEmail}`);
  } catch (error) {
    console.error('Error logging logout activity:', error);
  }
};

module.exports = {
  logAuthenticationActivity,
  logLoginActivity,
  logLogoutActivity,
  getClientIP,
  parseUserAgent
};
