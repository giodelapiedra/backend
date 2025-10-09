const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ CRITICAL: Missing Supabase configuration in environment variables');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Authentication middleware for Supabase
 */
const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔍 Auth middleware - Request:', req.method, req.path);
    console.log('🔍 Auth middleware - Headers:', req.headers.authorization ? 'Token present' : 'No token');
    
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    console.log('🔍 Token found, verifying with Supabase...');
    console.log('🔍 Token length:', token.length);
    console.log('🔍 Token preview:', token.substring(0, 50) + '...');
    
    // Verify Supabase JWT token
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      console.error('❌ Supabase auth error:', authError);
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Authentication failed'
      });
    }

    console.log('✅ Supabase auth successful for:', authUser.email);

    // Get user details from auth metadata instead of users table
    const userData = {
      id: authUser.id,
      email: authUser.email,
      first_name: authUser.user_metadata?.first_name || authUser.user_metadata?.full_name?.split(' ')[0] || '',
      last_name: authUser.user_metadata?.last_name || authUser.user_metadata?.full_name?.split(' ')[1] || '',
      role: authUser.user_metadata?.role || 'worker',
      team: authUser.user_metadata?.team || authUser.user_metadata?.default_team || 'TEAM GEO',
      phone: authUser.user_metadata?.phone || '',
      address: authUser.user_metadata?.address || {},
      employer_id: authUser.user_metadata?.employer_id || '',
      is_active: true, // Assume active if authenticated
      last_login: authUser.last_sign_in_at || '',
      profile_image_url: authUser.user_metadata?.avatar_url || '',
      emergency_contact: authUser.user_metadata?.emergency_contact || {},
      medical_info: authUser.user_metadata?.medical_info || {},
      package: authUser.user_metadata?.package || '',
      team_leader_id: authUser.user_metadata?.team_leader_id || '',
      managed_teams: authUser.user_metadata?.managed_teams || []
    };

    console.log('✅ User authenticated from auth metadata:', userData.email, userData.role);

    // Attach user to request
    req.user = {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      firstName: userData.first_name,
      lastName: userData.last_name,
      team: userData.team,
      teamLeaderId: userData.team_leader_id,
      managedTeams: userData.managed_teams
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    res.status(500).json({ 
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please login first'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `This endpoint requires one of these roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Verify Supabase JWT token
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (!authError && authUser) {
        // Create user data from auth metadata
        req.user = {
          id: authUser.id,
          email: authUser.email,
          role: authUser.user_metadata?.role || 'worker',
          firstName: authUser.user_metadata?.first_name || authUser.user_metadata?.full_name?.split(' ')[0] || '',
          lastName: authUser.user_metadata?.last_name || authUser.user_metadata?.full_name?.split(' ')[1] || '',
          team: authUser.user_metadata?.team || authUser.user_metadata?.default_team || 'TEAM GEO'
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth
};
