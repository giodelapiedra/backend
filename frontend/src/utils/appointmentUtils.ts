import { DURATION_LIMITS, VALIDATION_LIMITS } from '../constants/appointmentConstants';

// Security utilities
export const sanitizeInput = (input: string): string => {
  return input.replace(/[<>"'&]/g, (match) => {
    const escapeMap: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    };
    return escapeMap[match];
  });
};

// Validation
export const validateAppointmentForm = (form: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!form.case || typeof form.case !== 'string') {
    errors.push('Please select a valid case');
  }
  
  if (!form.appointmentType || typeof form.appointmentType !== 'string') {
    errors.push('Appointment type is required');
  }
  
  if (!form.scheduledDate || typeof form.scheduledDate !== 'string') {
    errors.push('Scheduled date is required');
  } else {
    const selectedDate = new Date(form.scheduledDate);
    const now = new Date();
    if (selectedDate <= now) {
      errors.push('Scheduled date must be in the future');
    }
  }
  
  if (form.duration && (typeof form.duration !== 'number' || form.duration < DURATION_LIMITS.MIN || form.duration > DURATION_LIMITS.MAX)) {
    errors.push(`Duration must be between ${DURATION_LIMITS.MIN} and ${DURATION_LIMITS.MAX} minutes`);
  }
  
  if (form.purpose && typeof form.purpose === 'string' && form.purpose.length > VALIDATION_LIMITS.PURPOSE_MAX_LENGTH) {
    errors.push(`Purpose cannot exceed ${VALIDATION_LIMITS.PURPOSE_MAX_LENGTH} characters`);
  }
  
  if (form.notes && typeof form.notes === 'string' && form.notes.length > VALIDATION_LIMITS.NOTES_MAX_LENGTH) {
    errors.push(`Notes cannot exceed ${VALIDATION_LIMITS.NOTES_MAX_LENGTH} characters`);
  }
  
  return { isValid: errors.length === 0, errors };
};

// Date formatting
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Clipboard
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
};

// Capitalize first letter
export const capitalizeFirst = (text: string): string => {
  if (!text) return '';
  return (text.charAt(0) || '').toUpperCase() + (text.slice(1) || text || '');
};

// Replace underscore with space and capitalize
export const formatLabel = (text: string): string => {
  return text.replace('_', ' ');
};

// Download CSV
export const downloadAppointmentsAsCSV = (appointments: any[]): void => {
  const headers = [
    'Date',
    'Time',
    'Patient Name',
    'Case Number',
    'Appointment Type',
    'Status',
    'Duration (min)',
    'Location',
    'Notes'
  ];

  const csvContent = [
    headers.join(','),
    ...appointments.map(appointment => {
      const date = new Date(appointment.scheduledDate);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return [
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${appointment.worker?.firstName || 'N/A'} ${appointment.worker?.lastName || ''}"`,
        `"${appointment.case.caseNumber}"`,
        `"${formatLabel(appointment.appointmentType)}"`,
        `"${formatLabel(appointment.status)}"`,
        `"${appointment.duration}"`,
        `"${appointment.location || 'N/A'}"`,
        `"${appointment.notes || 'N/A'}"`
      ].join(',');
    })
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `appointments_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Organize appointments by date
export const organizeAppointmentsByDate = (appointments: any[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  return {
    today: appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDate);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate.getTime() === today.getTime();
    }),
    tomorrow: appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDate);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate.getTime() === tomorrow.getTime();
    }),
    thisWeek: appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDate);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate >= tomorrow && aptDate < nextWeek;
    }),
    upcoming: appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDate);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate >= nextWeek;
    })
  };
};

// Calculate appointment statistics
export const calculateAppointmentStats = (appointments: any[]) => {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduledDate);
    return aptDate >= today && aptDate < tomorrow;
  });

  const upcomingAppointments = appointments.filter(apt => 
    new Date(apt.scheduledDate) > now && 
    ['scheduled', 'confirmed'].includes(apt.status)
  );

  return {
    scheduled: appointments.filter(apt => apt.status === 'scheduled').length,
    confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
    completed: appointments.filter(apt => apt.status === 'completed').length,
    cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
    today: todayAppointments.length,
    upcoming: upcomingAppointments.length
  };
};

