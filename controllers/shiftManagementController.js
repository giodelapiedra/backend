const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/shift-management.log' })
  ]
});

/**
 * SHIFT MANAGEMENT CONTROLLER
 * Handles shift assignments for team leaders by site supervisors
 */

// @desc    Get all shift types
// @route   GET /api/shifts/types
// @access  Private (All authenticated users)
const getShiftTypes = async (req, res) => {
  try {
    logger.info('Fetching shift types', {
      userId: req.user?.id,
      userRole: req.user?.role
    });

    const { data: shiftTypes, error } = await supabase
      .from('shift_types')
      .select('*')
      .eq('is_active', true)
      .order('start_time');

    if (error) {
      logger.error('Error fetching shift types:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: shiftTypes
    });

  } catch (error) {
    logger.error('Error in getShiftTypes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shift types'
    });
  }
};

// @desc    Get all team leaders with their current shifts
// @route   GET /api/shifts/team-leaders
// @access  Private (Site supervisors only)
const getTeamLeadersWithShifts = async (req, res) => {
  try {
    // Verify site supervisor role
    if (req.user?.role !== 'site_supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Site supervisors only.'
      });
    }

    logger.info('Fetching team leaders with shifts', {
      userId: req.user?.id,
      userRole: req.user?.role
    });

    // Get all team leaders
    const { data: teamLeaders, error: leadersError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        team,
        is_active,
        created_at
      `)
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .order('first_name');

    if (leadersError) {
      logger.error('Error fetching team leaders:', leadersError);
      throw leadersError;
    }

    // Get current shifts for each team leader
    const teamLeadersWithShifts = await Promise.all(
      teamLeaders.map(async (leader) => {
        const { data: currentShift, error: shiftError } = await supabase
          .rpc('get_current_shift', { team_leader_uuid: leader.id });

        if (shiftError) {
          logger.warn(`Error fetching shift for team leader ${leader.id}:`, shiftError);
        }

        return {
          ...leader,
          currentShift: currentShift?.[0] || null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: teamLeadersWithShifts
    });

  } catch (error) {
    logger.error('Error in getTeamLeadersWithShifts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team leaders with shifts'
    });
  }
};

// @desc    Assign shift to team leader
// @route   POST /api/shifts/assign
// @access  Private (Site supervisors only)
const assignShiftToTeamLeader = async (req, res) => {
  try {
    // Verify site supervisor role
    if (req.user?.role !== 'site_supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Site supervisors only.'
      });
    }

    const { 
      teamLeaderId, 
      shiftTypeId, 
      effectiveDate, 
      endDate, 
      notes 
    } = req.body;

    // Validate required fields
    if (!teamLeaderId || !shiftTypeId) {
      return res.status(400).json({
        success: false,
        error: 'Team leader ID and shift type ID are required'
      });
    }

    logger.info('Assigning shift to team leader', {
      userId: req.user?.id,
      teamLeaderId,
      shiftTypeId,
      effectiveDate,
      endDate
    });

    // Verify team leader exists and is active
    const { data: teamLeader, error: leaderError } = await supabase
      .from('users')
      .select('id, first_name, last_name, role, is_active')
      .eq('id', teamLeaderId)
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .single();

    if (leaderError || !teamLeader) {
      return res.status(404).json({
        success: false,
        error: 'Team leader not found or inactive'
      });
    }

    // Verify shift type exists and is active
    const { data: shiftType, error: shiftError } = await supabase
      .from('shift_types')
      .select('id, name, is_active')
      .eq('id', shiftTypeId)
      .eq('is_active', true)
      .single();

    if (shiftError || !shiftType) {
      return res.status(404).json({
        success: false,
        error: 'Shift type not found or inactive'
      });
    }

    // Assign shift using the database function
    const { data: newShiftId, error: assignError } = await supabase
      .rpc('assign_shift_to_team_leader', {
        team_leader_uuid: teamLeaderId,
        shift_type_uuid: shiftTypeId,
        assigned_by_uuid: req.user?.id,
        effective_date_param: effectiveDate || new Date().toISOString().split('T')[0],
        end_date_param: endDate || null,
        notes_param: notes || null
      });

    if (assignError) {
      logger.error('Error assigning shift:', assignError);
      throw assignError;
    }

    logger.info('Shift assigned successfully', {
      userId: req.user?.id,
      teamLeaderId,
      shiftTypeId,
      newShiftId: newShiftId?.[0]
    });

    res.status(201).json({
      success: true,
      message: `Shift "${shiftType.name}" assigned to ${teamLeader.first_name} ${teamLeader.last_name}`,
      data: {
        shiftId: newShiftId?.[0],
        teamLeader: {
          id: teamLeader.id,
          name: `${teamLeader.first_name} ${teamLeader.last_name}`
        },
        shiftType: {
          id: shiftType.id,
          name: shiftType.name
        },
        effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
        endDate,
        notes
      }
    });

  } catch (error) {
    logger.error('Error in assignShiftToTeamLeader:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign shift to team leader'
    });
  }
};

// @desc    Get shift history for a team leader
// @route   GET /api/shifts/history/:teamLeaderId
// @access  Private (Site supervisors and team leader themselves)
const getShiftHistory = async (req, res) => {
  try {
    const { teamLeaderId } = req.params;

    // Verify access - site supervisors can view any, team leaders can view their own
    if (req.user?.role !== 'site_supervisor' && req.user?.id !== teamLeaderId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own shift history.'
      });
    }

    logger.info('Fetching shift history', {
      userId: req.user?.id,
      teamLeaderId,
      userRole: req.user?.role
    });

    const { data: shiftHistory, error } = await supabase
      .from('team_leader_shifts')
      .select(`
        id,
        effective_date,
        end_date,
        is_active,
        notes,
        created_at,
        updated_at,
        shift_types (
          id,
          name,
          description,
          start_time,
          end_time,
          color
        ),
        users!team_leader_shifts_assigned_by_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .eq('team_leader_id', teamLeaderId)
      .order('effective_date', { ascending: false });

    if (error) {
      logger.error('Error fetching shift history:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: shiftHistory
    });

  } catch (error) {
    logger.error('Error in getShiftHistory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shift history'
    });
  }
};

// @desc    Update shift assignment
// @route   PUT /api/shifts/:shiftId
// @access  Private (Site supervisors only)
const updateShiftAssignment = async (req, res) => {
  try {
    // Verify site supervisor role
    if (req.user?.role !== 'site_supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Site supervisors only.'
      });
    }

    const { shiftId } = req.params;
    const { shiftTypeId, effectiveDate, endDate, notes, isActive } = req.body;

    logger.info('Updating shift assignment', {
      userId: req.user?.id,
      shiftId,
      updateData: req.body
    });

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (shiftTypeId) updateData.shift_type_id = shiftTypeId;
    if (effectiveDate) updateData.effective_date = effectiveDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: updatedShift, error } = await supabase
      .from('team_leader_shifts')
      .update(updateData)
      .eq('id', shiftId)
      .select(`
        id,
        effective_date,
        end_date,
        is_active,
        notes,
        updated_at,
        shift_types (
          id,
          name,
          description,
          start_time,
          end_time,
          color
        ),
        users!team_leader_shifts_team_leader_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .single();

    if (error) {
      logger.error('Error updating shift assignment:', error);
      throw error;
    }

    if (!updatedShift) {
      return res.status(404).json({
        success: false,
        error: 'Shift assignment not found'
      });
    }

    logger.info('Shift assignment updated successfully', {
      userId: req.user?.id,
      shiftId,
      updatedShift: updatedShift.id
    });

    res.status(200).json({
      success: true,
      message: 'Shift assignment updated successfully',
      data: updatedShift
    });

  } catch (error) {
    logger.error('Error in updateShiftAssignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shift assignment'
    });
  }
};

// @desc    Deactivate shift assignment
// @route   DELETE /api/shifts/:shiftId
// @access  Private (Site supervisors only)
const deactivateShiftAssignment = async (req, res) => {
  try {
    // Verify site supervisor role
    if (req.user?.role !== 'site_supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Site supervisors only.'
      });
    }

    const { shiftId } = req.params;

    logger.info('Deactivating shift assignment', {
      userId: req.user?.id,
      shiftId
    });

    const { data: deactivatedShift, error } = await supabase
      .from('team_leader_shifts')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', shiftId)
      .select(`
        id,
        team_leader_id,
        effective_date,
        end_date,
        is_active,
        updated_at,
        shift_types (
          id,
          name
        ),
        users!team_leader_shifts_team_leader_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .single();

    if (error) {
      logger.error('Error deactivating shift assignment:', error);
      throw error;
    }

    if (!deactivatedShift) {
      return res.status(404).json({
        success: false,
        error: 'Shift assignment not found'
      });
    }

    logger.info('Shift assignment deactivated successfully', {
      userId: req.user?.id,
      shiftId,
      teamLeaderId: deactivatedShift.team_leader_id
    });

    res.status(200).json({
      success: true,
      message: `Shift assignment deactivated for ${deactivatedShift.users.first_name} ${deactivatedShift.users.last_name}`,
      data: deactivatedShift
    });

  } catch (error) {
    logger.error('Error in deactivateShiftAssignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate shift assignment'
    });
  }
};

// @desc    Get shift statistics for site supervisor dashboard
// @route   GET /api/shifts/statistics
// @access  Private (Site supervisors only)
const getShiftStatistics = async (req, res) => {
  try {
    // Verify site supervisor role
    if (req.user?.role !== 'site_supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Site supervisors only.'
      });
    }

    logger.info('Fetching shift statistics', {
      userId: req.user?.id,
      userRole: req.user?.role
    });

    // Get total team leaders
    const { count: totalTeamLeaders, error: leadersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'team_leader')
      .eq('is_active', true);

    if (leadersError) {
      logger.error('Error fetching team leaders count:', leadersError);
      throw leadersError;
    }

    // Get team leaders with active shifts
    const { data: activeShifts, error: shiftsError } = await supabase
      .from('team_leader_shifts')
      .select(`
        id,
        team_leader_id,
        shift_types (
          id,
          name,
          color
        )
      `)
      .eq('is_active', true)
      .gte('effective_date', new Date().toISOString().split('T')[0])
      .lte('effective_date', new Date().toISOString().split('T')[0]);

    if (shiftsError) {
      logger.error('Error fetching active shifts:', shiftsError);
      throw shiftsError;
    }

    // Get shift distribution
    const shiftDistribution = {};
    activeShifts?.forEach(shift => {
      const shiftName = shift.shift_types.name;
      shiftDistribution[shiftName] = (shiftDistribution[shiftName] || 0) + 1;
    });

    // Get unassigned team leaders
    const assignedTeamLeaderIds = activeShifts?.map(shift => shift.team_leader_id) || [];
    const unassignedCount = totalTeamLeaders - assignedTeamLeaderIds.length;

    const statistics = {
      totalTeamLeaders,
      assignedTeamLeaders: assignedTeamLeaderIds.length,
      unassignedTeamLeaders: unassignedCount,
      shiftDistribution,
      assignmentRate: totalTeamLeaders > 0 ? 
        Math.round((assignedTeamLeaderIds.length / totalTeamLeaders) * 100) : 0
    };

    res.status(200).json({
      success: true,
      data: statistics
    });

  } catch (error) {
    logger.error('Error in getShiftStatistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shift statistics'
    });
  }
};

module.exports = {
  getShiftTypes,
  getTeamLeadersWithShifts,
  assignShiftToTeamLeader,
  getShiftHistory,
  updateShiftAssignment,
  deactivateShiftAssignment,
  getShiftStatistics
};

