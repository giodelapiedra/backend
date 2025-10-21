export interface Worker {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Clinician {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Case {
  _id: string;
  caseNumber: string;
  worker: Worker;
}

export interface ZoomMeeting {
  id: string;
  topic: string;
  startTime: string;
  duration: number;
  joinUrl: string;
  password: string;
  meetingId: string;
  hostId: string;
  createdAt: string;
  status: string;
}

export interface TelehealthInfo {
  platform: string;
  meetingId: string;
  meetingUrl: string;
  password: string;
  instructions: string;
  zoomMeeting?: ZoomMeeting;
}

export interface Appointment {
  _id: string;
  case: Case;
  clinician: Clinician;
  worker: Worker;
  appointmentType: string;
  scheduledDate: string;
  duration: number;
  location: string;
  status: string;
  purpose: string;
  notes?: string;
  telehealthInfo?: TelehealthInfo;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentFormData {
  case: string;
  worker: string;
  appointmentType: string;
  scheduledDate: string;
  duration: number;
  location: string;
  purpose: string;
  notes: string;
}

export interface AppointmentStats {
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  today: number;
  upcoming: number;
}

export interface OrganizedAppointments {
  today: Appointment[];
  tomorrow: Appointment[];
  thisWeek: Appointment[];
  upcoming: Appointment[];
}

