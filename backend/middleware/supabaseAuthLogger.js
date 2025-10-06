const { db } = require('../config/supabase');
const { getClientIP, parseUserAgent } = require('../utils/helpers');

// Function to log authentication activity to Supabase
const logSupabaseAuthActivity = async (authLogData) => {
  try {
    console.log('📝 Logging authentication activity to Supabase:', {
      userEmail: authLogData.userEmail,
      action: authLogData.action,
      success: authLogData.success
    });

    // Transform data for Supabase
    const supabaseData = {
      user_id: authLogData.userId,
      user_email: authLogData.userEmail,
      user_name: authLogData.userName,
      user_role: authLogData.userRole,
      action: authLogData.action,
      ip_address: authLogData.ipAddress,
      user_agent: authLogData.userAgent,
      location: authLogData.location || null,
      success: authLogData.success,
      failure_reason: authLogData.failureReason || null,
      session_id: authLogData.sessionId || null,
      device_info: authLogData.deviceInfo || null,
      additional_data: authLogData.additionalData || null
    };

    const result = await db.authentication_logs.create(supabaseData);
    console.log('✅ Authentication log saved to Supabase:', result.id);
    return result;
  } catch (error) {
    console.error('❌ Error logging to Supabase:', error);
    throw error;
  }
};

// Function to manually log login activity to Supabase
const logSupabaseLoginActivity = async (user, req, success = true, failureReason = null) => {
  try {
    // Only log successful logins, skip failed attempts
    if (!success) {
      console.log('📝 Skipping failed login attempt log to Supabase');
      return;
    }

    const ipAddress = getClientIP(req);
    const userAgentInfo = parseUserAgent(req.headers['user-agent']);
    
    const logData = {
      userId: user?.id || null,
      userEmail: user?.email || req.body?.email || 'unknown',
      userName: user ? `${user.first_name} ${user.last_name}` : 'Unknown User',
      userRole: user?.role || 'unknown',
      action: 'login',
      ipAddress,
      userAgent: userAgentInfo.userAgent,
      success: true,
      failureReason: null,
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
    
    return await logSupabaseAuthActivity(logData);
  } catch (error) {
    console.error('Error logging login activity to Supabase:', error);
  }
};

// Function to manually log logout activity to Supabase
const logSupabaseLogoutActivity = async (user, req) => {
  try {
    const ipAddress = getClientIP(req);
    const userAgentInfo = parseUserAgent(req.headers['user-agent']);
    
    const logData = {
      userId: user?.id || null,
      userEmail: user?.email || 'unknown',
      userName: user ? `${user.first_name} ${user.last_name}` : 'Unknown User',
      userRole: user?.role || 'unknown',
      action: 'logout',
      ipAddress,
      userAgent: userAgentInfo.userAgent,
      success: true,
      failureReason: null,
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
    
    return await logSupabaseAuthActivity(logData);
  } catch (error) {
    console.error('Error logging logout activity to Supabase:', error);
  }
};

// Function to get recent login activity for team members
const getTeamMemberLoginActivity = async (teamLeaderId, limit = 50) => {
  try {
    console.log('📊 Fetching team member login activity for team leader:', teamLeaderId);
    
    // Get team leader's managed teams
    const { data: teamLeader, error: leaderError } = await db.users.findMany({
      id: teamLeaderId
    });
    
    if (leaderError || !teamLeader || teamLeader.length === 0) {
      throw new Error('Team leader not found');
    }
    
    const managedTeams = teamLeader[0].managed_teams || [];
    if (teamLeader[0].team && !managedTeams.includes(teamLeader[0].team)) {
      managedTeams.push(teamLeader[0].team);
    }
    
    if (managedTeams.length === 0) {
      return [];
    }
    
    // Get team members
    const { data: teamMembers, error: membersError } = await db.users.findMany({
      role: 'worker'
    });
    
    if (membersError) {
      throw membersError;
    }
    
    // Filter team members by managed teams
    const filteredMembers = teamMembers.filter(member => 
      managedTeams.includes(member.team)
    );
    
    const memberIds = filteredMembers.map(member => member.id);
    
    if (memberIds.length === 0) {
      return [];
    }
    
    // Get recent login activity for team members
    const { data: loginActivity, error: activityError } = await db.authentication_logs.findMany({
      action: 'login',
      success: true
    }, {
      limit,
      orderBy: 'created_at',
      ascending: false
    });
    
    if (activityError) {
      throw activityError;
    }
    
    // Filter by team member IDs
    const teamMemberActivity = loginActivity.filter(activity => 
      memberIds.includes(activity.user_id)
    );
    
    console.log(`📊 Found ${teamMemberActivity.length} login activities for team members`);
    return teamMemberActivity;
    
  } catch (error) {
    console.error('Error fetching team member login activity:', error);
    throw error;
  }
};

module.exports = {
  logSupabaseAuthActivity,
  logSupabaseLoginActivity,
  logSupabaseLogoutActivity,
  getTeamMemberLoginActivity
};
