const { supabase } = require('../config/supabase');

/**
 * Assignment Repository
 * Handles all work readiness assignment database operations
 */
class AssignmentRepository {
  /**
   * Get assignments for worker within date range
   * @param {string} workerId - Worker ID
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Array>} Assignments data
   */
  async getAssignmentsForWorker(workerId, startDate, endDate) {
    const { data, error } = await supabase
      .from('work_readiness_assignments')
      .select('*')
      .eq('worker_id', workerId)
      .gte('assigned_date', startDate)
      .lte('assigned_date', endDate)
      .order('assigned_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Get assignments for multiple workers within date range
   * @param {Array<string>} workerIds - Array of worker IDs
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Array>} Assignments data
   */
  async getAssignmentsForWorkers(workerIds, startDate, endDate) {
    const { data, error } = await supabase
      .from('work_readiness_assignments')
      .select('*')
      .in('worker_id', workerIds)
      .gte('assigned_date', startDate)
      .lte('assigned_date', endDate)
      .order('assigned_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Get active assignment for worker on specific date
   * @param {string} workerId - Worker ID
   * @param {string} date - Date string
   * @returns {Promise<Object|null>} Active assignment
   */
  async getActiveAssignmentForDate(workerId, date) {
    const { data, error } = await supabase
      .from('work_readiness_assignments')
      .select('id, status, due_time')
      .eq('worker_id', workerId)
      .eq('assigned_date', date)
      .in('status', ['pending', 'assigned'])
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Update assignment status
   * @param {string} assignmentId - Assignment ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated assignment
   */
  async updateAssignmentStatus(assignmentId, updateData) {
    const { data, error } = await supabase
      .from('work_readiness_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Get assignment by ID
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<Object>} Assignment data
   */
  async getAssignmentById(assignmentId) {
    const { data, error } = await supabase
      .from('work_readiness_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();
    
    if (error) throw error;
    return data;
  }
}

module.exports = new AssignmentRepository();

