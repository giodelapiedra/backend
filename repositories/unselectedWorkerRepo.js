const { supabase } = require('../config/supabase');

/**
 * Unselected Worker Repository
 * Handles all unselected worker database operations
 */
class UnselectedWorkerRepository {
  /**
   * Get unselected workers for team leader within date range
   * @param {string} teamLeaderId - Team leader ID
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Array>} Unselected workers data
   */
  async getUnselectedWorkersForTeamLeader(teamLeaderId, startDate, endDate) {
    const { data, error } = await supabase
      .from('unselected_workers')
      .select('worker_id, assignment_date')
      .eq('team_leader_id', teamLeaderId)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate);
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Get unselected workers with worker details
   * @param {string} teamLeaderId - Team leader ID
   * @param {string} date - Date string (optional)
   * @returns {Promise<Array>} Unselected workers with details
   */
  async getUnselectedWorkersWithDetails(teamLeaderId, date = null) {
    let query = supabase
      .from('unselected_workers')
      .select(`
        *,
        worker:users!unselected_workers_worker_id_fkey(
          id, first_name, last_name, email
        )
      `)
      .eq('team_leader_id', teamLeaderId)
      .order('assignment_date', { ascending: false });

    if (date) {
      query = query.eq('assignment_date', date);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Create unselected worker record
   * @param {Object} unselectedWorkerData - Unselected worker data
   * @returns {Promise<Object>} Created unselected worker
   */
  async createUnselectedWorker(unselectedWorkerData) {
    const { data, error } = await supabase
      .from('unselected_workers')
      .insert([unselectedWorkerData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Update unselected worker record
   * @param {string} unselectedWorkerId - Unselected worker ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated unselected worker
   */
  async updateUnselectedWorker(unselectedWorkerId, updateData) {
    const { data, error } = await supabase
      .from('unselected_workers')
      .update(updateData)
      .eq('id', unselectedWorkerId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Close unselected worker case
   * @param {string} unselectedWorkerId - Unselected worker ID
   * @returns {Promise<Object>} Updated unselected worker
   */
  async closeUnselectedWorkerCase(unselectedWorkerId) {
    const { data, error } = await supabase
      .from('unselected_workers')
      .update({ case_status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', unselectedWorkerId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

module.exports = new UnselectedWorkerRepository();
