// Fix for Work Readiness Notification Team Leader Lookup
// This addresses the team name matching issues in the frontend

import { dataClient } from '../lib/supabase';

// Types
interface TeamLeader {
  id: string;
  first_name: string;
  last_name: string;
  managed_teams: string[];
  team: string;
}

interface WorkReadinessData {
  worker_id: string;
  team_leader_id?: string;
  team: string;
  fatigue_level: number;
  pain_discomfort: string;
  pain_areas?: string[];
  readiness_level: string;
  mood: string;
  notes?: string;
}

interface User {
  id: string;
  firstName?: string;
  team: string;
}

// Updated team leader lookup logic for WorkerDashboard.tsx
const findTeamLeader = async (userTeam: string): Promise<string | null> => {
  try {
    console.log('🔍 Looking for team leader for team:', userTeam);
    
    // First, try to find team leader by exact team match
    let { data: teamLeader, error: teamLeaderError } = await dataClient
      .from('users')
      .select('id, first_name, last_name, managed_teams, team')
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .eq('team', userTeam)
      .single();
    
    if (!teamLeaderError && teamLeader) {
      console.log('✅ Found team leader by exact team match:', teamLeader);
      return teamLeader.id;
    }
    
    // Second, try to find team leader by managed_teams array
    const { data: teamLeaderByManaged, error: managedError } = await dataClient
      .from('users')
      .select('id, first_name, last_name, managed_teams, team')
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .contains('managed_teams', [userTeam])
      .single();
    
    if (!managedError && teamLeaderByManaged) {
      console.log('✅ Found team leader by managed_teams:', teamLeaderByManaged);
      return teamLeaderByManaged.id;
    }
    
    // Third, try case-insensitive matching
    const { data: teamLeaderCaseInsensitive, error: caseError } = await dataClient
      .from('users')
      .select('id, first_name, last_name, managed_teams, team')
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .or(`team.ilike.%${userTeam}%,managed_teams.cs.{${userTeam}}`)
      .single();
    
    if (!caseError && teamLeaderCaseInsensitive) {
      console.log('✅ Found team leader by case-insensitive match:', teamLeaderCaseInsensitive);
      return teamLeaderCaseInsensitive.id;
    }
    
    // Fourth, try partial matching
    const { data: teamLeaderPartial, error: partialError } = await dataClient
      .from('users')
      .select('id, first_name, last_name, managed_teams, team')
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .or(`team.ilike.%${userTeam}%,team.ilike.%${userTeam.toLowerCase()}%,team.ilike.%${userTeam.toUpperCase()}%`)
      .single();
    
    if (!partialError && teamLeaderPartial) {
      console.log('✅ Found team leader by partial match:', teamLeaderPartial);
      return teamLeaderPartial.id;
    }
    
    // Fifth, try to find any team leader and assign as fallback
    const { data: fallbackLeader, error: fallbackError } = await dataClient
      .from('users')
      .select('id, first_name, last_name, managed_teams, team')
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .single();
    
    if (!fallbackError && fallbackLeader) {
      console.log('⚠️ Using fallback team leader:', fallbackLeader);
      return fallbackLeader.id;
    }
    
    console.error('❌ No team leader found for team:', userTeam);
    return null;
    
  } catch (error) {
    console.error('❌ Error finding team leader:', error);
    return null;
  }
};

// Updated work readiness submission with better error handling
const submitWorkReadinessWithNotification = async (workReadinessData: WorkReadinessData, user: User) => {
  try {
    console.log('📝 Submitting work readiness assessment...');
    
    // Find team leader
    const teamLeaderId = await findTeamLeader(user.team);
    
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
    const notificationData = {
      recipient_id: teamLeaderId,
      sender_id: user.id,
      type: 'work_readiness_submitted',
      title: workReadinessData.readiness_level === 'not_fit' 
        ? 'Work Readiness Assessment - NOT FIT' 
        : 'Work Readiness Assessment Submitted',
      message: `${user.firstName || 'Worker'} has submitted their work readiness assessment. Status: ${
        workReadinessData.readiness_level === 'not_fit' 
          ? 'NOT FIT FOR WORK' 
          : workReadinessData.readiness_level === 'minor' 
            ? 'Minor Concerns' 
            : 'Fit for Work'
      }.`,
      priority: workReadinessData.readiness_level === 'not_fit' ? 'high' : 'medium',
      action_url: '/team-leader',
      metadata: {
        worker_id: user.id,
        worker_name: user.firstName || 'Worker',
        readiness_level: workReadinessData.readiness_level,
        fatigue_level: workReadinessData.fatigue_level,
        mood: workReadinessData.mood,
        assessment_id: workReadiness.id
      }
    };
    
    console.log('📤 Sending notification to team leader:', teamLeaderId);
    
    const { error: notificationError } = await dataClient
      .from('notifications')
      .insert([notificationData]);
    
    if (notificationError) {
      console.error('❌ Failed to send notification:', notificationError);
      // Don't throw error - work readiness was submitted successfully
    } else {
      console.log('✅ Notification sent to team leader successfully');
    }
    
    return workReadiness;
    
  } catch (error) {
    console.error('❌ Error in work readiness submission:', error);
    throw error;
  }
};

// Utility function to normalize team names for better matching
const normalizeTeamName = (teamName: string): string => {
  if (!teamName) return '';
  
  return teamName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, '') // Remove special characters
    .trim();
};

// Enhanced team leader lookup with normalization
const findTeamLeaderEnhanced = async (userTeam: string): Promise<string | null> => {
  try {
    const normalizedTeam = normalizeTeamName(userTeam);
    console.log('🔍 Enhanced team leader lookup for:', userTeam, '-> normalized:', normalizedTeam);
    
    // Get all team leaders
    const { data: allTeamLeaders, error: leadersError } = await dataClient
      .from('users')
      .select('id, first_name, last_name, managed_teams, team')
      .eq('role', 'team_leader')
      .eq('is_active', true);
    
    if (leadersError) throw leadersError;
    
    // Find best match
    for (const leader of allTeamLeaders || []) {
      // Check exact team match
      if (leader.team === userTeam) {
        console.log('✅ Exact team match found:', leader);
        return leader.id;
      }
      
      // Check normalized team match
      if (normalizeTeamName(leader.team) === normalizedTeam) {
        console.log('✅ Normalized team match found:', leader);
        return leader.id;
      }
      
      // Check managed_teams array
      if (leader.managed_teams && Array.isArray(leader.managed_teams)) {
        for (const managedTeam of leader.managed_teams) {
          if (managedTeam === userTeam || normalizeTeamName(managedTeam) === normalizedTeam) {
            console.log('✅ Managed team match found:', leader);
            return leader.id;
          }
        }
      }
    }
    
    console.warn('⚠️ No team leader match found for team:', userTeam);
    return null;
    
  } catch (error) {
    console.error('❌ Error in enhanced team leader lookup:', error);
    return null;
  }
};

// Export functions for use in components
export {
  findTeamLeader,
  findTeamLeaderEnhanced,
  submitWorkReadinessWithNotification,
  normalizeTeamName
};
