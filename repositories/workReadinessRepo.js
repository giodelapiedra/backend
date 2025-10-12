const { supabase } = require('../config/supabase');

/**
 * Work Readiness Repository
 * Handles all work readiness assessment database operations
 */
class WorkReadinessRepository {
  /**
   * Get assessments for worker within date range
   * @param {string} workerId - Worker ID
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Array>} Assessments data
   */
  async getAssessmentsForWorker(workerId, startDate, endDate) {
    const { data, error } = await supabase
      .from('work_readiness')
      .select('*')
      .eq('worker_id', workerId)
      .gte('submitted_at', startDate)
      .lte('submitted_at', endDate)
      .order('submitted_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Get latest assessment for worker
   * @param {string} workerId - Worker ID
   * @returns {Promise<Object|null>} Latest assessment data
   */
  async getLatestAssessment(workerId) {
    const { data, error } = await supabase
      .from('work_readiness')
      .select('cycle_start, cycle_day, streak_days, cycle_completed, submitted_at')
      .eq('worker_id', workerId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Get assessments for multiple workers within date range
   * @param {Array<string>} workerIds - Array of worker IDs
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Array>} Assessments data
   */
  async getAssessmentsForWorkers(workerIds, startDate, endDate) {
    const { data, error } = await supabase
      .from('work_readiness')
      .select(`
        *,
        worker:users!work_readiness_worker_id_fkey(first_name, last_name, email, team)
      `)
      .in('worker_id', workerIds)
      .gte('submitted_at', startDate)
      .lte('submitted_at', endDate)
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Get completed cycles for worker within date range
   * @param {string} workerId - Worker ID
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Array>} Completed cycles data
   */
  async getCompletedCyclesForWorker(workerId, startDate, endDate) {
    const { data, error } = await supabase
      .from('work_readiness')
      .select('cycle_start, cycle_day, streak_days, cycle_completed, submitted_at')
      .eq('worker_id', workerId)
      .eq('cycle_completed', true)
      .gte('submitted_at', startDate)
      .lte('submitted_at', endDate)
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Get work readiness data for quality scoring
   * @param {string} workerId - Worker ID
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Array>} Work readiness data
   */
  async getWorkReadinessForQualityScoring(workerId, startDate, endDate) {
    const { data, error } = await supabase
      .from('work_readiness')
      .select('readiness_level')
      .eq('worker_id', workerId)
      .gte('submitted_at', startDate)
      .lte('submitted_at', endDate);
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Check if assessment exists for today
   * @param {string} workerId - Worker ID
   * @param {string} today - Today's date string
   * @returns {Promise<Object|null>} Existing assessment data
   */
  async getAssessmentForToday(workerId, today) {
    const { data, error } = await supabase
      .from('work_readiness')
      .select('id, worker_id, team_leader_id, team, fatigue_level, pain_discomfort, pain_areas, readiness_level, mood, notes, status')
      .eq('worker_id', workerId)
      .gte('submitted_at', `${today}T00:00:00`)
      .lte('submitted_at', `${today}T23:59:59`)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Create new assessment
   * @param {Object} assessmentData - Assessment data
   * @returns {Promise<Object>} Created assessment
   */
  async createAssessment(assessmentData) {
    const { data, error } = await supabase
      .from('work_readiness')
      .insert([assessmentData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Update existing assessment
   * @param {string} assessmentId - Assessment ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated assessment
   */
  async updateAssessment(assessmentId, updateData) {
    const { data, error } = await supabase
      .from('work_readiness')
      .update(updateData)
      .eq('id', assessmentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Get recent submissions
   * @param {number} limit - Number of recent submissions to fetch
   * @returns {Promise<Array>} Recent submissions
   */
  async getRecentSubmissions(limit = 5) {
    const { data, error } = await supabase
      .from('work_readiness')
      .select('worker_id, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Get submissions for specific worker
   * @param {string} workerId - Worker ID
   * @param {number} limit - Number of submissions to fetch
   * @returns {Promise<Array>} Worker submissions
   */
  async getWorkerSubmissions(workerId, limit = 5) {
    const { data, error } = await supabase
      .from('work_readiness')
      .select('id, submitted_at, worker_id')
      .eq('worker_id', workerId)
      .order('submitted_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }
}

module.exports = new WorkReadinessRepository();
