// Simple Team Leader Utils for Work Readiness Notifications
// This is a simplified version that works with the existing codebase

import { dataClient } from '../lib/supabase';

// Simple team leader lookup function
export const findTeamLeaderForWorker = async (workerTeam: string): Promise<string | null> => {
  try {
    console.log('🔍 Looking for team leader for team:', workerTeam);
    
    if (!workerTeam) {
      console.warn('⚠️ No team provided for worker');
      return null;
    }

    // Method 1: Try exact team match
    const { data: exactMatch, error: exactError } = await dataClient
      .from('users')
      .select('id, first_name, last_name, team, managed_teams')
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .eq('team', workerTeam)
      .single();

    if (!exactError && exactMatch) {
      console.log('✅ Found team leader by exact team match:', exactMatch);
      return exactMatch.id;
    }

    // Method 2: Try managed_teams array
    const { data: managedMatch, error: managedError } = await dataClient
      .from('users')
      .select('id, first_name, last_name, team, managed_teams')
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .contains('managed_teams', [workerTeam])
      .single();

    if (!managedError && managedMatch) {
      console.log('✅ Found team leader by managed_teams:', managedMatch);
      return managedMatch.id;
    }

    // Method 3: Try case-insensitive match
    const { data: caseInsensitiveMatch, error: caseError } = await dataClient
      .from('users')
      .select('id, first_name, last_name, team, managed_teams')
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .ilike('team', workerTeam)
      .single();

    if (!caseError && caseInsensitiveMatch) {
      console.log('✅ Found team leader by case-insensitive match:', caseInsensitiveMatch);
      return caseInsensitiveMatch.id;
    }

    // Method 4: Try to find any team leader as fallback
    const { data: fallbackLeader, error: fallbackError } = await dataClient
      .from('users')
      .select('id, first_name, last_name, team, managed_teams')
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .single();

    if (!fallbackError && fallbackLeader) {
      console.log('⚠️ Using fallback team leader:', fallbackLeader);
      return fallbackLeader.id;
    }

    console.error('❌ No team leader found for team:', workerTeam);
    return null;

  } catch (error) {
    console.error('❌ Error finding team leader:', error);
    return null;
  }
};

// Send work readiness notification to team leader
export const sendWorkReadinessNotification = async (
  workerId: string,
  teamLeaderId: string,
  readinessLevel: string,
  fatigueLevel: number,
  mood: string,
  workerName: string
): Promise<boolean> => {
  try {
    console.log('📤 Sending work readiness notification...');

    const notificationData = {
      recipient_id: teamLeaderId,
      sender_id: workerId,
      type: 'work_readiness_submitted',
      title: readinessLevel === 'not_fit' 
        ? '🚨 Work Readiness Assessment - NOT FIT' 
        : '✅ Work Readiness Assessment Submitted',
      message: `${workerName} has submitted their work readiness assessment. Status: ${
        readinessLevel === 'not_fit' 
          ? 'NOT FIT FOR WORK' 
          : readinessLevel === 'minor' 
            ? 'Minor Concerns' 
            : 'Fit for Work'
      }.`,
      priority: readinessLevel === 'not_fit' ? 'high' : 'medium',
      action_url: '/team-leader',
      metadata: {
        worker_id: workerId,
        worker_name: workerName,
        readiness_level: readinessLevel,
        fatigue_level: fatigueLevel,
        mood: mood,
        timestamp: new Date().toISOString()
      }
    };

    const { error: notificationError } = await dataClient
      .from('notifications')
      .insert([notificationData]);

    if (notificationError) {
      console.error('❌ Failed to send notification:', notificationError);
      return false;
    }

    console.log('✅ Notification sent to team leader successfully');
    return true;

  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return false;
  }
};

// Complete work readiness submission with notification
export const submitWorkReadinessWithNotification = async (
  workReadinessData: any,
  user: any
): Promise<any> => {
  try {
    console.log('📝 Submitting work readiness assessment with notification...');

    // Find team leader
    const teamLeaderId = await findTeamLeaderForWorker(user.team);

    if (!teamLeaderId) {
      console.warn('⚠️ No team leader found, submitting without notification');
      // Still submit the work readiness assessment
      const { data, error } = await dataClient
        .from('work_readiness')
        .insert([workReadinessData])
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Add team_leader_id to work readiness data
    const workReadinessWithLeader = {
      ...workReadinessData,
      team_leader_id: teamLeaderId
    };

    // Submit work readiness assessment
    const { data: workReadiness, error: workReadinessError } = await dataClient
      .from('work_readiness')
      .insert([workReadinessWithLeader])
      .select()
      .single();

    if (workReadinessError) {
      console.error('❌ Failed to submit work readiness:', workReadinessError);
      throw workReadinessError;
    }

    console.log('✅ Work readiness assessment submitted:', workReadiness.id);

    // Send notification to team leader
    const notificationSent = await sendWorkReadinessNotification(
      user.id,
      teamLeaderId,
      workReadinessData.readiness_level,
      workReadinessData.fatigue_level,
      workReadinessData.mood,
      user.firstName || 'Worker'
    );

    if (!notificationSent) {
      console.warn('⚠️ Notification failed, but work readiness was submitted');
    }

    return workReadiness;

  } catch (error) {
    console.error('❌ Error in work readiness submission:', error);
    throw error;
  }
};

// Utility function to check if team leader exists
export const checkTeamLeaderExists = async (teamLeaderId: string): Promise<boolean> => {
  try {
    const { data, error } = await dataClient
      .from('users')
      .select('id')
      .eq('id', teamLeaderId)
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('❌ Error checking team leader:', error);
    return false;
  }
};

// Utility function to get team leader info
export const getTeamLeaderInfo = async (teamLeaderId: string) => {
  try {
    const { data, error } = await dataClient
      .from('users')
      .select('id, first_name, last_name, email, team, managed_teams')
      .eq('id', teamLeaderId)
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error getting team leader info:', error);
    return null;
  }
};


