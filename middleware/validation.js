/**
 * Data validation middleware for API endpoints
 */

const validateAssignmentData = (req, res, next) => {
  const { workerIds, assignedDate, dueTime, team } = req.body;
  
  console.log('🔍 Validation - Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 Validation - workerIds:', workerIds, 'Type:', typeof workerIds, 'IsArray:', Array.isArray(workerIds));
  console.log('🔍 Validation - assignedDate:', assignedDate, 'Type:', typeof assignedDate);
  console.log('🔍 Validation - dueTime:', dueTime, 'Type:', typeof dueTime);
  console.log('🔍 Validation - team:', team, 'Type:', typeof team);
  
  const errors = [];
  
  // Validate worker IDs
  if (!workerIds || !Array.isArray(workerIds) || workerIds.length === 0) {
    errors.push('Worker IDs must be a non-empty array');
  } else {
    // Validate each worker ID format (relaxed validation for now)
    workerIds.forEach((id, index) => {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        errors.push(`Invalid worker ID at index ${index}: ${id}`);
      }
    });
  }
  
  // Validate assignment date
  if (!assignedDate) {
    errors.push('Assignment date is required');
  } else if (!Date.parse(assignedDate)) {
    errors.push('Invalid assignment date format');
  } else {
    // Check if date is not in the past
    const assignedDateObj = new Date(assignedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (assignedDateObj < today) {
      errors.push('Assignment date cannot be in the past');
    }
  }
  
  // Validate team
  if (!team || typeof team !== 'string' || team.trim() === '') {
    errors.push('Team is required');
  }
  
  // Validate due time (optional) - accept time format like "09:00" or "09:00:00"
  if (dueTime && typeof dueTime === 'string') {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (!timeRegex.test(dueTime)) {
      errors.push('Invalid due time format. Expected format: HH:MM or HH:MM:SS');
    }
  }
  
  if (errors.length > 0) {
    // log validation errors via centralized logger if needed
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  // validation passed
  next();
};

const validateWorkReadinessData = (req, res, next) => {
  const { workerId, assessmentData } = req.body;
  
  console.log('🔍 Work Readiness Validation - Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 Work Readiness Validation - workerId:', workerId, 'Type:', typeof workerId);
  console.log('🔍 Work Readiness Validation - assessmentData:', assessmentData, 'Type:', typeof assessmentData);
  
  const errors = [];
  
  // Validate worker ID
  if (!workerId) {
    errors.push('Worker ID is required');
  } else {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(workerId)) {
      errors.push('Invalid worker ID format');
    }
  }
  
  // Validate assessment data exists
  if (!assessmentData) {
    errors.push('Assessment data is required');
  } else {
    const { readinessLevel, fatigueLevel } = assessmentData;
    
    // Validate readiness level
    const validReadinessLevels = ['fit', 'minor', 'not_fit'];
    if (!readinessLevel) {
      errors.push('Readiness level is required');
    } else if (!validReadinessLevels.includes(readinessLevel)) {
      errors.push(`Invalid readiness level. Must be one of: ${validReadinessLevels.join(', ')}`);
    }
    
    // Validate fatigue level
    if (fatigueLevel === undefined || fatigueLevel === null) {
      errors.push('Fatigue level is required');
    } else if (typeof fatigueLevel !== 'number' || fatigueLevel < 1 || fatigueLevel > 10) {
      errors.push('Fatigue level must be a number between 1 and 10');
    }
  }
  
  if (errors.length > 0) {
    // log validation errors via centralized logger if needed
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  // validation passed
  next();
};

const validateTeamLeaderId = (req, res, next) => {
  const { teamLeaderId } = req.query;
  
  if (!teamLeaderId) {
    return res.status(400).json({
      success: false,
      message: 'Team Leader ID is required'
    });
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(teamLeaderId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Team Leader ID format'
    });
  }
  
  next();
};

const validateWorkerId = (req, res, next) => {
  const { workerId } = req.query;
  
  if (!workerId) {
    return res.status(400).json({
      success: false,
      message: 'Worker ID is required'
    });
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(workerId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Worker ID format'
    });
  }
  
  next();
};

module.exports = {
  validateAssignmentData,
  validateWorkReadinessData,
  validateTeamLeaderId,
  validateWorkerId
};