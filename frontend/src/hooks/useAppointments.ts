import { useState, useCallback } from 'react';
import { Appointment } from '../types/appointment.types';
import backendApi from '../utils/backendApi';
import { sanitizeInput } from '../utils/appointmentUtils';

interface UseAppointmentsReturn {
  appointments: Appointment[];
  loading: boolean;
  error: string;
  authError: string | null;
  currentPage: number;
  totalPages: number;
  totalAppointments: number;
  pageSize: number;
  isRefreshing: boolean;
  fetchAppointments: (page?: number, limit?: number) => Promise<void>;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setAuthError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useAppointments = (): UseAppointmentsReturn => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAppointments = useCallback(async (page?: number, limit?: number) => {
    const requestPage = page || currentPage;
    const requestLimit = limit || pageSize;
    
    try {
      setLoading(true);
      setAuthError(null);
      setIsRefreshing(true);
      
      const response = await backendApi.get(`/appointments?page=${requestPage}&limit=${requestLimit}`);
      
      // Sanitize appointment data
      const sanitizedAppointments = (response.data.appointments || []).map((apt: any) => ({
        ...apt,
        purpose: apt.purpose ? sanitizeInput(apt.purpose) : '',
        notes: apt.notes ? sanitizeInput(apt.notes) : '',
        worker: apt.worker ? {
          ...apt.worker,
          firstName: sanitizeInput(apt.worker.firstName || ''),
          lastName: sanitizeInput(apt.worker.lastName || ''),
          email: sanitizeInput(apt.worker.email || '')
        } : null,
        clinician: apt.clinician ? {
          ...apt.clinician,
          firstName: sanitizeInput(apt.clinician.firstName || ''),
          lastName: sanitizeInput(apt.clinician.lastName || ''),
          email: sanitizeInput(apt.clinician.email || '')
        } : null
      }));
      
      setAppointments(sanitizedAppointments);
      
      // Update pagination info
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.pages || 1);
        setTotalAppointments(response.data.pagination.total || 0);
      }
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      
      if (err.response?.status === 401) {
        setAuthError('Authentication failed. Please refresh the page or log in again.');
        setAppointments([]);
      } else {
        setError(err.response?.data?.message || 'Failed to fetch appointments');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize]);

  return {
    appointments,
    loading,
    error,
    authError,
    currentPage,
    totalPages,
    totalAppointments,
    pageSize,
    isRefreshing,
    fetchAppointments,
    setCurrentPage,
    setPageSize,
    setAppointments,
    setError,
    setAuthError
  };
};

