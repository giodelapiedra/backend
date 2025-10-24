const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Initialize Supabase Admin Client directly
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('❌ CRITICAL: Missing Supabase configuration in appointmentsController');
  logger.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to transform Supabase appointment data to match MongoDB format
function transformAppointment(appointment) {
  if (!appointment) return null;
  
  // Get worker data from case since there's no direct worker_id in appointments table
  const workerData = appointment.case_data?.worker_data;
  
  return {
    _id: appointment.id,
    id: appointment.id,
    case: appointment.case_data ? {
      _id: appointment.case_data.id,
      id: appointment.case_data.id,
      caseNumber: appointment.case_data.case_number,
      status: appointment.case_data.status,
      worker: appointment.case_data.worker_data
    } : null,
    clinician: appointment.clinician_data ? {
      _id: appointment.clinician_data.id,
      id: appointment.clinician_data.id,
      firstName: appointment.clinician_data.first_name,
      lastName: appointment.clinician_data.last_name,
      email: appointment.clinician_data.email,
      phone: appointment.clinician_data.phone
    } : null,
    worker: workerData ? {
      _id: workerData.id,
      id: workerData.id,
      firstName: workerData.first_name,
      lastName: workerData.last_name,
      email: workerData.email,
      phone: workerData.phone
    } : null,
    appointmentType: appointment.appointment_type,
    scheduledDate: appointment.scheduled_date,
    duration: appointment.duration_minutes || 60,
    status: appointment.status,
    notes: appointment.notes || '',
    createdAt: appointment.created_at,
    updatedAt: appointment.updated_at
  };
}

// @desc    Get appointments
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res) => {
  try {
    const { 
      case: caseId, 
      clinician, 
      worker, 
      status, 
      appointmentType, 
      date, 
      startDate, 
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        case_data:case_id (
          id,
          case_number,
          status,
          worker_data:worker_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        ),
        clinician_data:clinician_id (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `, { count: 'exact' });

    // Role-based filtering
    if (req.user.role === 'clinician') {
      query = query.eq('clinician_id', req.user.id);
    } else if (req.user.role === 'worker') {
      // For workers, we need to filter by cases where they are the worker
      // First, get all case IDs where this worker is assigned
      const { data: workerCases, error: casesError } = await supabaseAdmin
        .from('cases')
        .select('id')
        .eq('worker_id', req.user.id);
      
      if (casesError) {
        logger.error('Error fetching worker cases', { error: casesError.message });
        return res.status(500).json({ message: 'Failed to fetch worker cases' });
      }
      
      const caseIds = workerCases?.map(c => c.id) || [];
      
      if (caseIds.length === 0) {
        // Worker has no cases, return empty result
        return res.json({
          appointments: [],
          pagination: {
            current: parseInt(page),
            pages: 0,
            total: 0
          }
        });
      }
      
      // Filter appointments by case IDs where worker is assigned
      query = query.in('case_id', caseIds);
    }
    
    // Apply filters
    if (caseId) query = query.eq('case_id', caseId);
    if (clinician) query = query.eq('clinician_id', clinician);
    if (status) query = query.eq('status', status);
    if (appointmentType) query = query.eq('appointment_type', appointmentType);

    // Date filtering - FIXED: use scheduled_date not scheduledDate
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();
      query = query.gte('scheduled_date', startOfDay).lte('scheduled_date', endOfDay);
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.gte('scheduled_date', start.toISOString()).lte('scheduled_date', end.toISOString());
    }

    // Pagination and sorting
    query = query
      .order('scheduled_date', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching appointments', { error: error.message });
      throw error;
    }

    const appointments = data.map(transformAppointment);

    // Debug logging for appointments data
    console.log('Appointments fetched:', {
      totalCount: appointments.length,
      appointments: appointments.map(apt => ({
        id: apt._id,
        status: apt.status,
        scheduledDate: apt.scheduledDate,
        clinician: apt.clinician?.firstName + ' ' + apt.clinician?.lastName,
        worker: apt.worker?.firstName + ' ' + apt.worker?.lastName
      }))
    });

    res.json({
      appointments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(count / parseInt(limit)),
        total: count
      }
    });
  } catch (error) {
    logger.error('Error in getAppointments', { error: error.message });
    res.status(500).json({ 
      message: 'Failed to fetch appointments', 
      error: error.message 
    });
  }
};

// @desc    Get appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        case_data:case_id (
          id,
          case_number,
          status,
          worker_data:worker_id (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          employer_data:employer_id (
            id,
            first_name,
            last_name,
            email
          )
        ),
        clinician_data:clinician_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        worker_data:worker_id (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check access permissions
    const hasAccess = 
      req.user.role === 'admin' ||
      req.user.role === 'case_manager' ||
      data.clinician_id === req.user.id ||
      (data.case_data && data.case_data.worker_data && data.case_data.worker_data.id === req.user.id) ||
      (data.case_data && data.case_data.employer_data && data.case_data.employer_data.id === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const appointment = transformAppointment(data);
    res.json({ appointment });
  } catch (error) {
    logger.error('Error in getAppointmentById', { error: error.message });
    res.status(500).json({ 
      message: 'Failed to fetch appointment', 
      error: error.message 
    });
  }
};

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private (Admin, Case Manager, Clinician)
exports.createAppointment = async (req, res) => {
  try {
    const { 
      case: caseId, 
      worker, 
      clinician, 
      appointmentType, 
      scheduledDate, 
      duration = 60, 
      location = 'clinic', 
      notes = '',
      isVirtual = false,
      purpose,
      agenda,
      preparation
    } = req.body;

    // Verify case exists
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('*, worker:users!cases_worker_id_fkey(id, first_name, last_name, email), clinician:users!cases_clinician_id_fkey(id)')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      return res.status(400).json({ message: 'Invalid case' });
    }

    // Verify worker exists
    const workerId = worker || caseData.worker.id;
    const { data: workerData, error: workerError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', workerId)
      .eq('role', 'worker')
      .eq('is_active', true)
      .single();

    if (workerError || !workerData) {
      return res.status(400).json({ message: 'Invalid worker' });
    }

    // Verify clinician exists
    const clinicianId = clinician || caseData.clinician.id;
    const { data: clinicianData, error: clinicianError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', clinicianId)
      .eq('role', 'clinician')
      .eq('is_active', true)
      .single();

    if (clinicianError || !clinicianData) {
      return res.status(400).json({ message: 'Invalid clinician' });
    }

    // Create appointment - only include fields that exist in the actual schema
    const appointmentData = {
      case_id: caseId,
      clinician_id: clinicianId,
      appointment_type: appointmentType,
      scheduled_date: scheduledDate,
      duration_minutes: duration, // Note: column is duration_minutes not duration
      status: 'scheduled'
    };

    // Add optional fields
    if (notes) {
      appointmentData.notes = notes;
    }

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .insert(appointmentData)
      .select('*')
      .single();

    if (error) {
      logger.error('Error creating appointment', { error: error.message });
      throw error;
    }

    // Fetch the created appointment with related data for response
    const { data: appointmentWithData } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        case_data:case_id (
          id,
          case_number,
          status,
          worker_data:worker_id (
            id,
            first_name,
            last_name,
            email
          )
        ),
        clinician_data:clinician_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', appointment.id)
      .single();

    // Create notification for the worker
    try {
      const scheduledDateTime = new Date(scheduledDate);
      const notificationData = {
        recipient_id: workerId,
        sender_id: req.user.id,
        type: 'appointment_scheduled',
        title: 'New Appointment Scheduled',
        message: `You have a new ${appointmentType} appointment scheduled for ${scheduledDateTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${scheduledDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`,
        priority: 'high',
        action_url: `/appointments`,
        metadata: {
          appointment_id: appointment.id,
          appointment_type: appointmentType,
          scheduled_date: scheduledDate,
          duration: duration,
          case_number: caseData.case_number,
          clinician_name: `${clinicianData.first_name} ${clinicianData.last_name}`
        },
        is_read: false,
        created_at: new Date().toISOString()
      };

      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert(notificationData);

      if (notificationError) {
        logger.error('Error creating notification', { error: notificationError.message });
        // Don't fail the appointment creation if notification fails
      } else {
        logger.info('Notification created for worker', { workerId, appointmentId: appointment.id });
      }
    } catch (notificationError) {
      logger.error('Error creating notification', { error: notificationError.message });
      // Don't fail the appointment creation if notification fails
    }

    // Create notification for the clinician
    try {
      const scheduledDateTime = new Date(scheduledDate);
      const notificationData = {
        recipient_id: clinicianId,
        sender_id: req.user.id,
        type: 'appointment_scheduled',
        title: 'Appointment Scheduled',
        message: `You have scheduled a ${appointmentType} appointment with ${workerData.first_name} ${workerData.last_name} for ${scheduledDateTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${scheduledDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`,
        priority: 'medium',
        action_url: `/appointments`,
        metadata: {
          appointment_id: appointment.id,
          appointment_type: appointmentType,
          scheduled_date: scheduledDate,
          duration: duration,
          location: location,
          case_number: caseData.case_number,
          worker_name: `${workerData.first_name} ${workerData.last_name}`
        },
        is_read: false,
        created_at: new Date().toISOString()
      };

      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert(notificationData);

      if (notificationError) {
        logger.error('Error creating clinician notification', { error: notificationError.message });
      } else {
        logger.info('Notification created for clinician', { clinicianId, appointmentId: appointment.id });
      }
    } catch (notificationError) {
      logger.error('Error creating clinician notification', { error: notificationError.message });
    }

    const transformedAppointment = transformAppointment(appointmentWithData || appointment);
    
    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: transformedAppointment
    });
  } catch (error) {
    logger.error('Error in createAppointment', { error: error.message });
    res.status(500).json({ 
      message: 'Failed to create appointment', 
      error: error.message 
    });
  }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private (Admin, Case Manager, Clinician)
exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      appointmentType, 
      scheduledDate, 
      duration, 
      location, 
      notes, 
      isVirtual, 
      status,
      purpose,
      agenda,
      preparation
    } = req.body;

    // Check if appointment exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    const canUpdate = 
      req.user.role === 'admin' ||
      req.user.role === 'case_manager' ||
      existing.clinician_id === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update appointment fields
    const updateData = {
      appointment_type: appointmentType || existing.appointment_type,
      scheduled_date: scheduledDate || existing.scheduled_date,
      duration_minutes: duration || existing.duration_minutes,
      location: location || existing.location,
      notes: notes || existing.notes,
      status: status || existing.status,
      purpose: purpose || existing.purpose,
      agenda: agenda || existing.agenda,
      preparation: preparation || existing.preparation
    };

    if (isVirtual !== undefined) {
      updateData.telehealth_info = {
        ...existing.telehealth_info,
        isVirtual
      };
    }

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('Error updating appointment', { error: error.message });
      throw error;
    }

    // For now, just return the basic appointment data to avoid relationship issues
    const transformedAppointment = transformAppointment(appointment);

    res.json({
      message: 'Appointment updated successfully',
      appointment: transformedAppointment
    });
  } catch (error) {
    logger.error('Error in updateAppointment', { error: error.message });
    res.status(500).json({ 
      message: 'Failed to update appointment', 
      error: error.message 
    });
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private (Admin, Case Manager, Clinician, Worker)
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Check if appointment exists with case data
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        case_data:case_id (
          id,
          case_number,
          status,
          worker_data:worker_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions with debug logging
    const canUpdate = 
      req.user.role === 'admin' ||
      req.user.role === 'case_manager' ||
      existing.clinician_id === req.user.id ||
      (req.user.role === 'worker' && existing.case_data?.worker_data?.id === req.user.id);

    // Debug logging
    console.log('Permission check debug:', {
      userId: req.user.id,
      userRole: req.user.role,
      appointmentId: id,
      clinicianId: existing.clinician_id,
      caseWorkerId: existing.case_data?.worker_data?.id,
      canUpdate
    });

    if (!canUpdate) {
      console.log('Access denied for user:', req.user.id, 'role:', req.user.role);
      return res.status(403).json({ message: 'Access denied' });
    }

    const oldStatus = existing.status;
    
    // Update appointment (removed status_history as it doesn't exist in schema)
    const updateData = {
      status
    };

    if (notes) {
      updateData.notes = existing.notes ? `${existing.notes}\n\n${notes}` : notes;
    }

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('Error updating appointment status', { error: error.message });
      throw error;
    }

    // For now, just return the basic appointment data to avoid relationship issues
    const transformedAppointment = transformAppointment(appointment);

    res.json({
      message: 'Appointment status updated successfully',
      appointment: transformedAppointment
    });
  } catch (error) {
    logger.error('Error in updateAppointmentStatus', { error: error.message });
    res.status(500).json({ 
      message: 'Failed to update appointment status', 
      error: error.message 
    });
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Private (Admin, Case Manager, Clinician)
exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if appointment exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    const canDelete = 
      req.user.role === 'admin' ||
      req.user.role === 'case_manager' ||
      existing.clinician_id === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete appointment
    const { error } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting appointment', { error: error.message });
      throw error;
    }

    res.json({
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteAppointment', { error: error.message });
    res.status(500).json({ 
      message: 'Failed to delete appointment', 
      error: error.message 
    });
  }
};

// @desc    Get calendar appointments
// @route   GET /api/appointments/calendar
// @access  Private
exports.getCalendarAppointments = async (req, res) => {
  try {
    const { start, end } = req.query;
    console.log('Calendar request:', { start, end, user: req.user });

    // Parse dates and ensure they're valid
    let startDate, endDate;
    try {
      startDate = new Date(start);
      endDate = new Date(end);
      
      // Check if dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid date format received:', { start, end });
        return res.status(400).json({ message: 'Invalid date format' });
      }
      
      console.log('Parsed dates:', { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });
    } catch (dateError) {
      console.error('Error parsing dates:', dateError);
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // For debugging, let's get all appointments first
    const { data: allAppointments, error: allError } = await supabaseAdmin
      .from('appointments')
      .select('id, scheduled_date, clinician_id, appointment_type, case_id')
      .order('scheduled_date', { ascending: true });
    
    console.log('All appointments in system:', allAppointments?.length || 0);
    if (allAppointments?.length > 0) {
      console.log('Sample appointments:', allAppointments.slice(0, 3));
    }
    
    // Specifically check for the October 28, 2025 appointment
    const targetDate = new Date('2025-10-28');
    const targetStart = new Date(targetDate);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(targetDate);
    targetEnd.setHours(23, 59, 59, 999);
    
    console.log('Checking for appointments on Oct 28, 2025:', {
      start: targetStart.toISOString(),
      end: targetEnd.toISOString()
    });
    
    const { data: oct28Appointments } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .gte('scheduled_date', targetStart.toISOString())
      .lte('scheduled_date', targetEnd.toISOString());
    
    console.log('Oct 28, 2025 appointments:', oct28Appointments);

    // Now query with date filters
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        case_data:case_id (
          id,
          case_number,
          status,
          worker_data:worker_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        ),
        clinician_data:clinician_id (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .gte('scheduled_date', startDate.toISOString())
      .lte('scheduled_date', endDate.toISOString());

    // Role-based filtering - clinicians only see their appointments
    if (req.user.role === 'clinician') {
      query = query.eq('clinician_id', req.user.id);
    }

    query = query.order('scheduled_date', { ascending: true });

    const { data, error } = await query;
    console.log('Calendar query result:', { count: data?.length || 0, error: error?.message });

    if (error) {
      logger.error('Error fetching calendar appointments', { error: error.message });
      throw error;
    }
    
    // If no data, log a message
    if (!data || data.length === 0) {
      console.log('No appointments found for the date range');
    } else {
      console.log('Found appointments:', data.map(a => ({ 
        id: a.id, 
        date: a.scheduled_date, 
        clinician_id: a.clinician_id,
        case_id: a.case_id
      })));
    }

    // Format appointments for calendar
    const calendarEvents = data.map(appointment => {
      const scheduledDate = new Date(appointment.scheduled_date);
      const endTime = new Date(scheduledDate.getTime() + (appointment.duration_minutes * 60000));
      
      // Get worker name from case data since there's no direct worker_id in appointments table
      const workerName = appointment.case_data?.worker_data ? 
        `${appointment.case_data.worker_data.first_name} ${appointment.case_data.worker_data.last_name}` : 
        'Unknown Worker';
      
      // Get clinician name
      const clinicianName = appointment.clinician_data ? 
        `${appointment.clinician_data.first_name} ${appointment.clinician_data.last_name}` : 
        'Unknown Clinician';
      
      const calendarEvent = {
        id: appointment.id,
        title: `${appointment.appointment_type} - ${workerName}`,
        start: appointment.scheduled_date,
        end: endTime.toISOString(),
        backgroundColor: getAppointmentColor(appointment.status),
        borderColor: getAppointmentColor(appointment.status),
        extendedProps: {
          appointmentType: appointment.appointment_type,
          status: appointment.status,
          location: appointment.location || 'clinic',
          caseNumber: appointment.case_data?.case_number || 'Unknown',
          caseId: appointment.case_id,
          worker: workerName,
          clinician: clinicianName,
          duration: appointment.duration_minutes || 60,
          notes: appointment.notes || ''
        }
      };
      
      console.log('Created calendar event:', calendarEvent);
      return calendarEvent;
    });

    console.log('Returning calendar events:', calendarEvents.length);
    res.json(calendarEvents);
  } catch (error) {
    logger.error('Error in getCalendarAppointments', { error: error.message });
    res.status(500).json({ 
      message: 'Failed to fetch calendar appointments', 
      error: error.message 
    });
  }
};

// Helper function to get appointment color based on status
function getAppointmentColor(status) {
  switch (status) {
    case 'scheduled': return '#4285F4'; // Blue
    case 'confirmed': return '#0F9D58'; // Green
    case 'in_progress': return '#F4B400'; // Yellow
    case 'completed': return '#0F9D58'; // Green
    case 'cancelled': return '#DB4437'; // Red
    case 'no_show': return '#DB4437'; // Red
    default: return '#4285F4'; // Blue
  }
}

