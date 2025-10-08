const { createClient } = require('@supabase/supabase-js');
const NotificationService = require('../services/NotificationService.supabase');
const logger = require('../utils/logger');

// Initialize Supabase Admin Client - NO FALLBACK SECRETS
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
 * Create work readiness assignments
 * POST /api/work-readiness-assignments
 */
exports.createAssignments = async (req, res) => {
  try {
    const { workerIds, assignedDate, team, notes, dueTime, unselectedWorkers } = req.body;
    const teamLeaderId = req.user.id;

    req.logger.logBusiness('Creating assignments', { workerIds, assignedDate, team, teamLeaderId });

    // Validation is handled by middleware - no need to duplicate here

    // Check if user is a team leader
    if (req.user.role !== 'team_leader' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Only team leaders can create assignments' 
      });
    }

    // Verify that workers belong to the team leader's team
    const { data: workers, error: workersError } = await supabaseAdmin
      .from('users')
      .select('id, team, team_leader_id')
      .in('id', workerIds)
      .eq('role', 'worker');

    if (workersError) {
      req.logger.error(workersError, { context: 'createAssignments', userId: req.user.id });
      return res.status(500).json({ success: false, error: 'Failed to verify workers' });
    }

    // Check if all workers belong to the team leader
    const invalidWorkers = workers.filter(
      w => w.team !== team || (w.team_leader_id && w.team_leader_id !== teamLeaderId)
    );

    if (invalidWorkers.length > 0) {
      return res.status(403).json({ 
        error: 'Some workers do not belong to your team',
        invalidWorkers: invalidWorkers.map(w => w.id)
      });
    }

    // Check for existing assignments on the same date (including completed ones)
    const { data: existingAssignments, error: existingError } = await supabaseAdmin
      .from('work_readiness_assignments')
      .select('worker_id, status')
      .eq('assigned_date', assignedDate)
      .in('worker_id', workerIds)
      .in('status', ['pending', 'completed', 'overdue']);

    if (existingError) {
      req.logger.error(existingError, { context: 'createAssignments', userId: req.user.id });
      return res.status(500).json({ 
        success: false,
        error: 'Failed to check existing assignments' 
      });
    }

    if (existingAssignments && existingAssignments.length > 0) {
      const existingWorkerIds = existingAssignments.map(a => a.worker_id);
      const completedWorkers = existingAssignments
        .filter(a => a.status === 'completed')
        .map(a => a.worker_id);
      
      if (completedWorkers.length > 0) {
        return res.status(400).json({ 
          success: false,
          error: `Some workers have already completed their work readiness assignment for ${assignedDate}. They cannot be assigned again on the same day.`,
          existingWorkers: existingWorkerIds,
          completedWorkers: completedWorkers,
          message: 'Workers who have already completed their work readiness assessment for today cannot be assigned again.'
        });
      } else {
        return res.status(400).json({ 
          success: false,
          error: `Assignments already exist for workers on ${assignedDate}`,
          existingWorkers: existingWorkerIds
        });
      }
    }

    // Create assignments
      // Calculate due time (24 hours from now)
      const dueDateTime = new Date();
      dueDateTime.setHours(dueDateTime.getHours() + 24);

      const assignments = workerIds.map(workerId => ({
        team_leader_id: teamLeaderId,
        worker_id: workerId,
        assigned_date: assignedDate,
        due_time: dueDateTime.toISOString(),
        team,
        status: 'pending',
        notes: notes || null,
        reminder_sent: false
      }));

      // Create assignments
      const { data: createdAssignments, error: assignmentError } = await supabaseAdmin
        .from('work_readiness_assignments')
        .insert(assignments)
        .select(`
          *,
          worker:users!work_readiness_assignments_worker_id_fkey(
            id, first_name, last_name, email
          )
        `);

      if (assignmentError) throw assignmentError;

      // Send notifications to workers
      for (const assignment of createdAssignments) {
        const worker = assignment.worker;
        
        // Create notification using NotificationService
        const notification = await NotificationService.createWorkReadinessNotification(
          worker.id,
          teamLeaderId,
          assignment.id,
          assignment.due_time,
          notes
        );

        if (!notification) {
          console.error('Error creating notification for worker:', worker.id);
        } else {
          console.log('✅ Notification created for worker:', worker.id);
          // Update assignment to mark notification as sent
          const { error: updateError } = await supabaseAdmin
            .from('work_readiness_assignments')
            .update({
              notification_sent: true,
              notification_sent_at: new Date().toISOString()
            })
            .eq('id', assignment.id);

          if (updateError) {
            console.error('Error updating assignment notification status:', updateError);
          }
      }
    }

    // Handle unselected workers with reasons
    if (unselectedWorkers && Array.isArray(unselectedWorkers) && unselectedWorkers.length > 0) {
      console.log('📝 Processing unselected workers:', unselectedWorkers);
      
      const unselectedRecords = unselectedWorkers.map(worker => ({
        team_leader_id: teamLeaderId,
        worker_id: worker.workerId,
        assignment_date: assignedDate,
        reason: worker.reason,
        notes: worker.notes || null
      }));

      const { data: createdUnselected, error: unselectedError } = await supabaseAdmin
        .from('unselected_workers')
        .insert(unselectedRecords)
        .select();

      if (unselectedError) {
        console.error('Error saving unselected workers:', unselectedError);
        // Don't fail the entire request, just log the error
      } else {
        console.log(`✅ Saved ${createdUnselected?.length || 0} unselected worker records`);
      }
    }

    // Log the action
    console.log(`✅ Team leader ${teamLeaderId} created ${createdAssignments.length} assignments`);

    res.status(201).json({ 
      success: true,
      assignments: createdAssignments,
      message: `Successfully created ${createdAssignments.length} assignment(s)`
    });

  } catch (error) {
    console.error('Error in createAssignments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get assignments for team leader
 * GET /api/work-readiness-assignments
 */
exports.getAssignments = async (req, res) => {
  try {
    const teamLeaderId = req.user.id;
    const { date, status } = req.query;

    let query = supabaseAdmin
      .from('work_readiness_assignments')
      .select(`
        *,
        worker:users!work_readiness_assignments_worker_id_fkey(
          id, first_name, last_name, email
        ),
        work_readiness:work_readiness!work_readiness_assignments_work_readiness_id_fkey(*)
      `)
      .eq('team_leader_id', teamLeaderId)
      .order('assigned_date', { ascending: false });

    if (date) {
      query = query.eq('assigned_date', date);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }

    res.json({ 
      success: true,
      assignments: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Error in getAssignments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get assignments for worker
 * GET /api/work-readiness-assignments/worker
 */
exports.getWorkerAssignments = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { date, status } = req.query;

    let query = supabaseAdmin
      .from('work_readiness_assignments')
      .select(`
        *,
        team_leader:users!work_readiness_assignments_team_leader_id_fkey(
          id, first_name, last_name, email
        ),
        work_readiness:work_readiness!work_readiness_assignments_work_readiness_id_fkey(*)
      `)
      .eq('worker_id', workerId)
      .order('assigned_date', { ascending: false });

    if (date) {
      query = query.eq('assigned_date', date);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching worker assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }

    res.json({ 
      success: true,
      assignments: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Error in getWorkerAssignments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get today's assignment for worker
 * GET /api/work-readiness-assignments/today
 */
exports.getTodayAssignment = async (req, res) => {
  try {
    const workerId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('work_readiness_assignments')
      .select(`
        *,
        team_leader:users!work_readiness_assignments_team_leader_id_fkey(
          id, first_name, last_name, email
        ),
        work_readiness:work_readiness!work_readiness_assignments_work_readiness_id_fkey(*)
      `)
      .eq('worker_id', workerId)
      .eq('assigned_date', today)
      .neq('status', 'cancelled')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error fetching today assignment:', error);
      return res.status(500).json({ error: 'Failed to fetch assignment' });
    }

    res.json({ 
      success: true,
      assignment: data || null
    });

  } catch (error) {
    console.error('Error in getTodayAssignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if worker can submit work readiness (has active assignment)
 * GET /api/work-readiness-assignments/can-submit
 */
exports.canSubmitWorkReadiness = async (req, res) => {
  try {
    const workerId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Check if worker has an active assignment for today
    const { data: assignment, error } = await supabaseAdmin
      .from('work_readiness_assignments')
      .select(`
        *,
        team_leader:users!work_readiness_assignments_team_leader_id_fkey(
          id, first_name, last_name, email
        )
      `)
      .eq('worker_id', workerId)
      .eq('assigned_date', today)
      .in('status', ['pending', 'assigned'])
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking assignment:', error);
      return res.status(500).json({ error: 'Failed to check assignment' });
    }

    const canSubmit = !!assignment;
    
    res.json({ 
      success: true,
      canSubmit,
      assignment: assignment || null,
      message: canSubmit 
        ? 'You have an active work readiness assignment' 
        : 'No work readiness assignment for today. Please wait for your team leader to assign you.'
    });

  } catch (error) {
    console.error('Error in canSubmitWorkReadiness:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update assignment status
 * PATCH /api/work-readiness-assignments/:id
 */
exports.updateAssignmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, workReadinessId } = req.body;
    const userId = req.user.id;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status
    const validStatuses = ['pending', 'completed', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get assignment to verify ownership
    const { data: assignment, error: fetchError } = await supabaseAdmin
      .from('work_readiness_assignments')
      .select('*, team_leader_id, worker_id')
      .eq('id', id)
      .single();

    if (fetchError || !assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check permissions
    const isTeamLeader = assignment.team_leader_id === userId;
    const isWorker = assignment.worker_id === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isTeamLeader && !isWorker && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to update this assignment' });
    }

    // Workers can only mark as completed
    if (isWorker && !isTeamLeader && status !== 'completed') {
      return res.status(403).json({ 
        error: 'Workers can only mark assignments as completed' 
      });
    }

    // CRITICAL: Overdue assignments are PERMANENT RECORDS - No changes allowed
    if (assignment.status === 'overdue') {
      return res.status(400).json({ 
        error: 'Assignment is overdue - no changes allowed. This is a permanent record.',
        message: 'Overdue assignments cannot be modified or completed. This reflects the true performance record.'
      });
    }

    // Check if assignment is past due time (should be overdue)
    const now = new Date();
    const dueTime = new Date(assignment.due_time);
    if (now > dueTime && assignment.status === 'pending') {
      return res.status(400).json({ 
        error: 'Assignment is past due - cannot be completed. It will be marked as overdue.',
        message: 'This assignment is past its deadline and cannot be completed. It will be automatically marked as overdue.'
      });
    }

    // Prepare updates
    const updates = {
      status,
      updated_at: new Date().toISOString()
    };

    if (notes) {
      updates.notes = notes;
    }

    if (workReadinessId) {
      updates.work_readiness_id = workReadinessId;
    }

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    // Update assignment
    const { data, error } = await supabaseAdmin
      .from('work_readiness_assignments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        worker:users!work_readiness_assignments_worker_id_fkey(
          id, first_name, last_name, email
        )
      `)
      .single();

    if (error) {
      console.error('Error updating assignment:', error);
      return res.status(500).json({ error: 'Failed to update assignment' });
    }

    console.log(`✅ Assignment ${id} updated to ${status} by user ${userId}`);

    res.json({ 
      success: true,
      assignment: data,
      message: 'Assignment updated successfully'
    });

  } catch (error) {
    console.error('Error in updateAssignmentStatus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Cancel assignment
 * DELETE /api/work-readiness-assignments/:id
 */
exports.cancelAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get assignment to verify ownership
    const { data: assignment, error: fetchError } = await supabaseAdmin
      .from('work_readiness_assignments')
      .select('team_leader_id')
      .eq('id', id)
      .single();

    if (fetchError || !assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Only team leader or admin can cancel
    if (assignment.team_leader_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to cancel this assignment' });
    }

    // Update to cancelled status
    const { data, error } = await supabaseAdmin
      .from('work_readiness_assignments')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling assignment:', error);
      return res.status(500).json({ error: 'Failed to cancel assignment' });
    }

    console.log(`✅ Assignment ${id} cancelled by user ${userId}`);

    res.json({ 
      success: true,
      assignment: data,
      message: 'Assignment cancelled successfully'
    });

  } catch (error) {
    console.error('Error in cancelAssignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get assignment statistics
 * GET /api/work-readiness-assignments/stats
 */
exports.getAssignmentStats = async (req, res) => {
  try {
    const teamLeaderId = req.user.id;
    const { startDate, endDate } = req.query;

    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('work_readiness_assignments')
      .select('*')
      .eq('team_leader_id', teamLeaderId)
      .gte('assigned_date', start)
      .lte('assigned_date', end);

    if (error) {
      console.error('Error fetching assignment stats:', error);
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }

    const stats = {
      total: data?.length || 0,
      pending: data?.filter(a => a.status === 'pending').length || 0,
      completed: data?.filter(a => a.status === 'completed').length || 0,
      overdue: data?.filter(a => a.status === 'overdue').length || 0,
      cancelled: data?.filter(a => a.status === 'cancelled').length || 0,
      completionRate: data?.length > 0 
        ? Math.round((data.filter(a => a.status === 'completed').length / data.length) * 100) 
        : 0
    };

    res.json({ 
      success: true,
      stats,
      dateRange: { start, end }
    });

  } catch (error) {
    console.error('Error in getAssignmentStats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get unselected workers for team leader
 * GET /api/work-readiness-assignments/unselected
 */
exports.getUnselectedWorkers = async (req, res) => {
  try {
    console.log('🔍 getUnselectedWorkers called');
    console.log('🔍 User:', req.user);
    console.log('🔍 User role:', req.user?.role);
    console.log('🔍 Query params:', req.query);
    
    // Allow passing a specific teamLeaderId in query params, otherwise use the logged-in user
    const teamLeaderId = req.query.teamLeaderId || req.user.id;
    const { date } = req.query;
    
    console.log('Getting unselected workers for team leader:', teamLeaderId);

    let query = supabaseAdmin
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

    if (error) {
      console.error('Error fetching unselected workers:', error);
      return res.status(500).json({ error: 'Failed to fetch unselected workers' });
    }

    console.log('✅ Found', data?.length || 0, 'unselected workers');
    console.log('📋 Workers:', data);

    res.json({ 
      success: true,
      unselectedWorkers: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Error in getUnselectedWorkers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Close unselected worker case
 * PATCH /api/work-readiness-assignments/unselected/:id/close
 */
exports.closeUnselectedWorkerCase = async (req, res) => {
  try {
    const { id } = req.params;
    const teamLeaderId = req.user.id;

    // Get the unselected worker record
    const { data: unselectedWorker, error: fetchError } = await supabaseAdmin
      .from('unselected_workers')
      .select('*')
      .eq('id', id)
      .eq('team_leader_id', teamLeaderId)
      .single();

    if (fetchError || !unselectedWorker) {
      return res.status(404).json({ 
        success: false,
        error: 'Unselected worker case not found' 
      });
    }

    // Update the case status to closed
    const { data: updatedCase, error: updateError } = await supabaseAdmin
      .from('unselected_workers')
      .update({ 
        case_status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error closing unselected worker case:', updateError);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to close case' 
      });
    }

    console.log(`✅ Unselected worker case ${id} closed by team leader ${teamLeaderId}`);

    res.json({ 
      success: true,
      message: 'Case closed successfully',
      unselectedWorker: updatedCase
    });

  } catch (error) {
    console.error('Error in closeUnselectedWorkerCase:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
};

/**
 * Mark overdue assignments (Cron job endpoint)
 * POST /api/work-readiness-assignments/mark-overdue
 */
exports.markOverdueAssignments = async (req, res) => {
  try {
    // Only allow admin or system calls
    if (req.user.role !== 'admin' && req.headers['x-api-key'] !== process.env.SYSTEM_API_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const today = new Date().toISOString().split('T')[0];
    const jobId = `mark-overdue-${today}`;

    // Check if job already ran today (idempotency)
    const { data: existingJob, error: jobCheckError } = await supabaseAdmin
      .from('system_jobs')
      .select('id, status, created_at')
      .eq('job_id', jobId)
      .eq('status', 'completed')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .single();

    if (jobCheckError && jobCheckError.code !== 'PGRST116') {
      req.logger.error(jobCheckError, { context: 'markOverdueAssignments', userId: req.user.id });
      return res.status(500).json({ success: false, error: 'Failed to check job status' });
    }

    if (existingJob) {
      return res.json({ 
        success: true, 
        message: 'Overdue assignments already processed today',
        count: 0,
        alreadyProcessed: true
      });
    }

    // Mark assignments as overdue
    const { data, error } = await supabaseAdmin
      .from('work_readiness_assignments')
      .update({ 
        status: 'overdue', 
        updated_at: new Date().toISOString() 
      })
      .lt('assigned_date', today)
      .eq('status', 'pending')
      .select();

    if (error) {
      req.logger.error(error, { context: 'markOverdueAssignments', userId: req.user.id });
      return res.status(500).json({ success: false, error: 'Failed to mark overdue assignments' });
    }

    // Record job completion for idempotency
    await supabaseAdmin
      .from('system_jobs')
      .insert({
        job_id: jobId,
        job_type: 'mark_overdue_assignments',
        status: 'completed',
        processed_count: data?.length || 0,
        created_at: new Date().toISOString()
      });

    req.logger.logBusiness('Marked assignments as overdue', { count: data?.length || 0, userId: req.user.id });

    res.json({ 
      success: true,
      count: data?.length || 0,
      message: `Marked ${data?.length || 0} assignments as overdue`
    });

  } catch (error) {
    req.logger.error(error, { context: 'markOverdueAssignments', userId: req.user?.id });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
