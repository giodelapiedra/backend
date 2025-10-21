const { supabase } = require('../config/supabase');

/**
 * User Repository
 * Handles all user-related database operations
 */
class UserRepository {
  /**
   * Get user by ID and role
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @returns {Promise<Object>} User data
   */
  async getUserByIdAndRole(userId, role) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('role', role)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Get team leader with managed teams
   * @param {string} teamLeaderId - Team leader ID
   * @returns {Promise<Object>} Team leader data
   */
  async getTeamLeaderWithManagedTeams(teamLeaderId) {
    const { data, error } = await supabase
      .from('users')
      .select('managed_teams, team')
      .eq('id', teamLeaderId)
      .eq('role', 'team_leader')
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Get team members by team leader
   * @param {Array<string>} managedTeams - Array of managed team names
   * @returns {Promise<Array>} Team members data
   */
  async getTeamMembersByTeamLeader(managedTeams) {
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, team')
      .eq('role', 'worker')
      .in('team', managedTeams || []);
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Get team members by team name
   * @param {string} teamName - Team name
   * @returns {Promise<Array>} Team members data
   */
  async getTeamMembersByTeam(teamName) {
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, team')
      .eq('role', 'worker')
      .eq('team', teamName);
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Get user role
   * @param {string} userId - User ID
   * @returns {Promise<string>} User role
   */
  async getUserRole(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data.role;
  }
}

module.exports = new UserRepository();

