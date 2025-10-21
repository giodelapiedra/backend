import { useReducer, useCallback } from 'react';
import { AppointmentFormData } from '../types/appointment.types';
import { APPOINTMENT_TYPES, LOCATION_TYPES, DURATION_LIMITS } from '../constants/appointmentConstants';

type FormAction =
  | { type: 'SET_FIELD'; field: keyof AppointmentFormData; value: any }
  | { type: 'SET_CASE_AND_WORKER'; caseId: string; workerId: string }
  | { type: 'RESET' }
  | { type: 'LOAD_APPOINTMENT'; data: Partial<AppointmentFormData> };

const initialFormState: AppointmentFormData = {
  case: '',
  worker: '',
  appointmentType: APPOINTMENT_TYPES.ASSESSMENT,
  scheduledDate: '',
  duration: DURATION_LIMITS.DEFAULT,
  location: LOCATION_TYPES.CLINIC,
  purpose: '',
  notes: ''
};

function formReducer(state: AppointmentFormData, action: FormAction): AppointmentFormData {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_CASE_AND_WORKER':
      return { ...state, case: action.caseId, worker: action.workerId };
    case 'RESET':
      return initialFormState;
    case 'LOAD_APPOINTMENT':
      return { ...state, ...action.data };
    default:
      return state;
  }
}

export const useAppointmentForm = () => {
  const [formData, dispatch] = useReducer(formReducer, initialFormState);

  const setField = useCallback((field: keyof AppointmentFormData, value: any) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const setCaseAndWorker = useCallback((caseId: string, workerId: string) => {
    dispatch({ type: 'SET_CASE_AND_WORKER', caseId, workerId });
  }, []);

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const loadAppointment = useCallback((data: Partial<AppointmentFormData>) => {
    dispatch({ type: 'LOAD_APPOINTMENT', data });
  }, []);

  return {
    formData,
    setField,
    setCaseAndWorker,
    resetForm,
    loadAppointment
  };
};

