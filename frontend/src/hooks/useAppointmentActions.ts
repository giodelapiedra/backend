import { useState, useCallback } from 'react';
import { Appointment, AppointmentFormData } from '../types/appointment.types';
import backendApi from '../utils/backendApi';
import { sanitizeInput, validateAppointmentForm } from '../utils/appointmentUtils';
import { DURATION_LIMITS } from '../constants/appointmentConstants';

interface UseAppointmentActionsProps {
  onSuccess: () => void;
  setError: (error: string) => void;
  setAuthError: (error: string | null) => void;
  setSuccessMessage: (message: string) => void;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
}

export const useAppointmentActions = ({
  onSuccess,
  setError,
  setAuthError,
  setSuccessMessage,
  setAppointments
}: UseAppointmentActionsProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const createAppointment = useCallback(async (formData: AppointmentFormData, cases: any[]) => {
    try {
      setIsCreating(true);
      setError('');
      
      // Enhanced validation
      const validation = validateAppointmentForm(formData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }
      
      // Get worker ID from selected case
      const selectedCase = cases.find(c => c._id === formData.case);
      
      if (!selectedCase) {
        setError('Please select a case');
        return;
      }
      
      // Check if case has a clinician assigned
      if (!selectedCase.clinician || !selectedCase.clinician._id) {
        setError('Selected case does not have a clinician assigned. Please assign a clinician to the case first.');
        return;
      }

      // Prepare appointment data with sanitization
      const appointmentData = {
        case: formData.case,
        worker: selectedCase.worker._id,
        clinician: selectedCase.clinician._id,
        appointmentType: sanitizeInput(formData.appointmentType),
        scheduledDate: formData.scheduledDate,
        duration: Math.min(Math.max(formData.duration || DURATION_LIMITS.DEFAULT, DURATION_LIMITS.MIN), DURATION_LIMITS.MAX),
        location: sanitizeInput(formData.location || 'clinic'),
        purpose: formData.purpose ? sanitizeInput(formData.purpose.trim()) : '',
        notes: formData.notes ? sanitizeInput(formData.notes.trim()) : '',
        isVirtual: formData.location === 'telehealth'
      };

      await backendApi.post('/appointments', appointmentData);
      
      onSuccess();
      
      // Clear errors and show success message
      setError('');
      const workerName = `${selectedCase.worker.firstName} ${selectedCase.worker.lastName}`;
      const caseNumber = selectedCase.caseNumber;
      const appointmentType = formData.appointmentType.replace('_', ' ');
      const appointmentDate = new Date(formData.scheduledDate).toLocaleString();
      const appointmentLocation = formData.location === 'telehealth' ? 'via telehealth' : `at ${formData.location}`;
      
      setSuccessMessage(`✅ Appointment created successfully! ${appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)} appointment scheduled for ${workerName} (Case ${caseNumber}) on ${appointmentDate} ${appointmentLocation}. The worker will be notified about the appointment.`);
    } catch (err: any) {
      console.error('Create appointment error:', err);
      
      if (err.response?.status === 401) {
        setAuthError('Authentication failed. Please refresh the page or log in again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to create appointment');
      }
    } finally {
      setIsCreating(false);
    }
  }, [onSuccess, setError, setAuthError, setSuccessMessage]);

  const updateAppointment = useCallback(async (
    appointmentId: string,
    formData: AppointmentFormData,
    selectedAppointment: Appointment
  ) => {
    try {
      setIsUpdating(true);
      setError('');
      
      // Enhanced validation
      const validation = validateAppointmentForm(formData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }
      
      const updateData = {
        appointmentType: sanitizeInput(formData.appointmentType),
        scheduledDate: formData.scheduledDate,
        duration: Math.min(Math.max(formData.duration || DURATION_LIMITS.DEFAULT, DURATION_LIMITS.MIN), DURATION_LIMITS.MAX),
        location: sanitizeInput(formData.location || 'clinic'),
        purpose: formData.purpose ? sanitizeInput(formData.purpose.trim()) : '',
        notes: formData.notes ? sanitizeInput(formData.notes.trim()) : ''
      };

      await backendApi.put(`/appointments/${appointmentId}`, updateData);
      
      onSuccess();
      
      // Show success message
      setError('');
      const workerName = `${selectedAppointment.worker.firstName} ${selectedAppointment.worker.lastName}`;
      const appointmentType = formData.appointmentType.replace('_', ' ');
      const appointmentDate = new Date(formData.scheduledDate).toLocaleString();
      
      setSuccessMessage(`✅ Appointment updated successfully! ${appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)} appointment for ${workerName} has been updated. New schedule: ${appointmentDate}.`);
    } catch (err: any) {
      console.error('Update appointment error:', err);
      
      if (err.response?.status === 401) {
        setAuthError('Authentication failed. Please refresh the page or log in again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to update appointment');
      }
    } finally {
      setIsUpdating(false);
    }
  }, [onSuccess, setError, setAuthError, setSuccessMessage]);

  const updateStatus = useCallback(async (appointmentId: string, newStatus: string, appointments: Appointment[]) => {
    try {
      await backendApi.put(`/appointments/${appointmentId}/status`, { status: newStatus });
      
      onSuccess();
      
      // Show success message
      setError('');
      const appointment = appointments.find(apt => apt._id === appointmentId);
      const workerName = appointment?.worker ? `${appointment.worker.firstName} ${appointment.worker.lastName}` : 'worker';
      const statusText = newStatus.replace('_', ' ');
      
      setSuccessMessage(`✅ Appointment status updated! ${workerName}'s appointment status has been changed to "${statusText}".`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update appointment status');
    }
  }, [onSuccess, setError, setSuccessMessage]);

  const confirmAppointment = useCallback(async (appointmentId: string, appointments: Appointment[]) => {
    try {
      await backendApi.put(`/appointments/${appointmentId}/status`, { status: 'confirmed' });
      
      // Update local state immediately for better UX
      setAppointments(prev => prev.map(apt => 
        apt._id === appointmentId ? { ...apt, status: 'confirmed' } : apt
      ));
      
      // Show success message
      setError('');
      const appointment = appointments.find(apt => apt._id === appointmentId);
      const workerName = appointment?.worker ? `${appointment.worker.firstName} ${appointment.worker.lastName}` : 'worker';
      
      setSuccessMessage(`✅ Appointment confirmed! ${workerName}'s appointment has been confirmed and they will be notified.`);
      
      // Refresh data in background
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm appointment');
    }
  }, [onSuccess, setError, setSuccessMessage, setAppointments]);

  const declineAppointment = useCallback(async (appointmentId: string, appointments: Appointment[]) => {
    try {
      await backendApi.put(`/appointments/${appointmentId}/status`, { 
        status: 'cancelled',
        cancellationReason: 'Declined by worker'
      });
      
      // Update local state immediately for better UX
      setAppointments(prev => prev.map(apt => 
        apt._id === appointmentId ? { ...apt, status: 'cancelled' } : apt
      ));
      
      // Show success message
      setError('');
      const appointment = appointments.find(apt => apt._id === appointmentId);
      const workerName = appointment?.worker ? `${appointment.worker.firstName} ${appointment.worker.lastName}` : 'worker';
      
      setSuccessMessage(`✅ Appointment declined! ${workerName}'s appointment has been cancelled and they will be notified.`);
      
      // Refresh data in background
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to decline appointment');
    }
  }, [onSuccess, setError, setSuccessMessage, setAppointments]);

  const deleteAppointment = useCallback(async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this appointment? This action cannot be undone and will also delete the associated Zoom meeting.')) {
      return;
    }

    try {
      await backendApi.delete(`/appointments/${appointmentId}`);
      onSuccess();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete appointment');
    }
  }, [onSuccess, setError]);

  return {
    isCreating,
    isUpdating,
    createAppointment,
    updateAppointment,
    updateStatus,
    confirmAppointment,
    declineAppointment,
    deleteAppointment
  };
};

