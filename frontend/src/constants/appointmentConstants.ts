// Appointment Type Constants
export const APPOINTMENT_TYPES = {
  ASSESSMENT: 'assessment',
  TREATMENT: 'treatment',
  FOLLOW_UP: 'follow_up',
  CONSULTATION: 'consultation',
  TELEHEALTH: 'telehealth'
} as const;

export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  [APPOINTMENT_TYPES.ASSESSMENT]: 'Assessment',
  [APPOINTMENT_TYPES.TREATMENT]: 'Treatment',
  [APPOINTMENT_TYPES.FOLLOW_UP]: 'Follow-up',
  [APPOINTMENT_TYPES.CONSULTATION]: 'Consultation',
  [APPOINTMENT_TYPES.TELEHEALTH]: 'Telehealth'
};

// Location Constants
export const LOCATION_TYPES = {
  CLINIC: 'clinic',
  TELEHEALTH: 'telehealth',
  WORKPLACE: 'workplace',
  HOME: 'home'
} as const;

export const LOCATION_LABELS: Record<string, string> = {
  [LOCATION_TYPES.CLINIC]: 'Clinic',
  [LOCATION_TYPES.TELEHEALTH]: 'Telehealth',
  [LOCATION_TYPES.WORKPLACE]: 'Workplace',
  [LOCATION_TYPES.HOME]: 'Home'
};

// Status Constants
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
} as const;

export const STATUS_LABELS: Record<string, string> = {
  [APPOINTMENT_STATUS.SCHEDULED]: 'Scheduled',
  [APPOINTMENT_STATUS.CONFIRMED]: 'Confirmed',
  [APPOINTMENT_STATUS.IN_PROGRESS]: 'In Progress',
  [APPOINTMENT_STATUS.COMPLETED]: 'Completed',
  [APPOINTMENT_STATUS.CANCELLED]: 'Cancelled',
  [APPOINTMENT_STATUS.NO_SHOW]: 'No Show'
};

// Status Colors
export const STATUS_COLORS: Record<string, any> = {
  [APPOINTMENT_STATUS.SCHEDULED]: 'info',
  [APPOINTMENT_STATUS.CONFIRMED]: 'primary',
  [APPOINTMENT_STATUS.IN_PROGRESS]: 'warning',
  [APPOINTMENT_STATUS.COMPLETED]: 'success',
  [APPOINTMENT_STATUS.CANCELLED]: 'error',
  [APPOINTMENT_STATUS.NO_SHOW]: 'error'
};

// Duration Constants
export const DURATION_LIMITS = {
  MIN: 15,
  MAX: 480,
  DEFAULT: 60
} as const;

// Validation Limits
export const VALIDATION_LIMITS = {
  PURPOSE_MAX_LENGTH: 500,
  NOTES_MAX_LENGTH: 1000
} as const;

// Page Size Options
export const PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 15;

