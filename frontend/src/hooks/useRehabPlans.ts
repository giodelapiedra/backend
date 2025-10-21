import { useState, useCallback, useMemo, useEffect } from 'react';
import { dataClient } from '../lib/supabase';
import { debugLog, errorLog } from '../utils/debugLog';
import { extractErrorMessage } from '../utils/errorHandling';
import { PostgrestError } from '@supabase/supabase-js';

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  completed: boolean;
}

interface Worker {
  _id: string;
  firstName: string;
  lastName: string;
}

interface DatabaseWorker {
  id: string;
  first_name: string;
  last_name: string;
}

interface DatabaseCase {
  id: string;
  case_number: string;
  status: string;
  worker?: DatabaseWorker;
}

interface DatabaseRehabPlan {
  id: string;
  plan_name: string;
  status: RehabPlan['status'];
  start_date: string;
  end_date: string | null;
  exercises: Exercise[];
  progress_stats: Record<string, any>;
  case?: DatabaseCase;
}

interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  worker?: Worker;
}

interface RehabPlan {
  _id: string;
  planName: string;
  status: 'active' | 'completed' | 'cancelled';
  case?: Case;
  exercises: Exercise[];
  startDate: string;
  endDate: string | null;
  progress: number;
  progressStats?: Record<string, any>;
}

interface CreateRehabPlanData {
  plan_name: string;
  clinician_id: string;
  case_id?: string;
  status: RehabPlan['status'];
  exercises: Exercise[];
  start_date: string;
  end_date?: string;
}

interface UpdateRehabPlanData {
  plan_name?: string;
  status?: RehabPlan['status'];
  exercises?: Exercise[];
  end_date?: string | null;
  progress_stats?: Record<string, any>;
}

interface UseRehabPlansReturn {
  rehabPlans: RehabPlan[];
  loading: boolean;
  error: string | null;
  fetchRehabPlans: () => Promise<void>;
  addRehabPlan: (planData: CreateRehabPlanData) => Promise<{ success: boolean; error?: string; data?: RehabPlan }>;
  editRehabPlan: (planId: string, updates: UpdateRehabPlanData) => Promise<{ success: boolean; error?: string }>;
  deleteRehabPlan: (planId: string) => Promise<{ success: boolean; error?: string }>;
}

interface LoadingState {
  fetch: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export const useRehabPlans = (clinicianId?: string): UseRehabPlansReturn => {
  const [rehabPlans, setRehabPlans] = useState<RehabPlan[]>([]);
  const [loadingStates, setLoadingStates] = useState<LoadingState>({
    fetch: false,
    add: false,
    edit: false,
    delete: false
  });
  const [error, setError] = useState<string | null>(null);

  const loading = Object.values(loadingStates).some(state => state);

  const setLoadingState = useCallback((operation: keyof LoadingState, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [operation]: isLoading }));
  }, []);

  const handleError = useCallback((error: unknown, context: string) => {
    const errorMessage = extractErrorMessage(error);
    errorLog(`Error ${context}:`, errorMessage);
    setError(errorMessage);
    
    if (error instanceof PostgrestError) {
      // Handle specific Supabase errors
      switch (error.code) {
        case '42P01': // undefined_table
          errorLog('Database table not found');
          break;
        case '42501': // insufficient_privilege
          errorLog('Permission denied');
          break;
        default:
          errorLog('Database error:', error.message);
      }
    }
    return errorMessage;
  }, []);

  const fetchRehabPlans = useCallback(async () => {
    if (!clinicianId) {
      setError('Clinician ID is required');
      return;
    }
    
    setLoadingState('fetch', true);
    setError(null);
    
    try {
      debugLog('Fetching rehabilitation plans for clinician:', clinicianId);
      
      const { data, error: fetchError } = await dataClient
        .from('rehabilitation_plans')
        .select(`
          id,
          plan_name,
          status,
          start_date,
          end_date,
          exercises,
          progress_stats,
          case:cases!case_id(
            id,
            case_number,
            status,
            worker:users!worker_id(id, first_name, last_name)
          )
        `)
        .eq('clinician_id', clinicianId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data to match RehabPlan interface
      const transformedPlans = useMemo(() => {
        return (data || []).map((plan: any): RehabPlan => ({
          _id: plan.id,
          planName: plan.plan_name,
          status: plan.status as RehabPlan['status'],
          startDate: plan.start_date,
          endDate: plan.end_date || null,
          progress: 0,
          case: plan.case ? {
            _id: String((plan.case as DatabaseCase).id),
            caseNumber: String((plan.case as DatabaseCase).case_number),
            status: String((plan.case as DatabaseCase).status),
            worker: (plan.case as DatabaseCase).worker && {
              _id: String((plan.case as DatabaseCase).worker!.id),
              firstName: String((plan.case as DatabaseCase).worker!.first_name),
              lastName: String((plan.case as DatabaseCase).worker!.last_name)
            }
          } : undefined,
          exercises: (plan.exercises || []) as Exercise[],
          progressStats: plan.progress_stats || {}
        }));
      }, [data]);

      setRehabPlans(transformedPlans);
      debugLog('Successfully fetched', transformedPlans.length, 'rehabilitation plans');
    } catch (err) {
      handleError(err, 'fetching rehabilitation plans');
      setRehabPlans([]);
    } finally {
      setLoadingState('fetch', false);
    }
  }, [clinicianId, handleError]);

  const addRehabPlan = useCallback(async (planData: CreateRehabPlanData) => {
    setLoadingState('add', true);
    setError(null);
    
    try {
      debugLog('Creating rehabilitation plan:', planData);
      
      const { data, error: insertError } = await dataClient
        .from('rehabilitation_plans')
        .insert(planData)
        .select()
        .single();

      if (insertError) throw insertError;

      debugLog('Successfully created rehabilitation plan:', data);
      
      // Refresh plans list
      await fetchRehabPlans();
      
      return { success: true, data };
    } catch (err) {
      const errorMessage = handleError(err, 'creating rehabilitation plan');
      return { success: false, error: errorMessage };
    } finally {
      setLoadingState('add', false);
    }
  }, [fetchRehabPlans, handleError]);

  const editRehabPlan = useCallback(async (planId: string, updates: UpdateRehabPlanData) => {
    setLoadingState('edit', true);
    setError(null);
    
    try {
      debugLog('Updating rehabilitation plan:', planId, updates);
      
      const { error: updateError } = await dataClient
        .from('rehabilitation_plans')
        .update(updates)
        .eq('id', planId);

      if (updateError) throw updateError;

      debugLog('Successfully updated rehabilitation plan:', planId);
      
      // Refresh plans list
      await fetchRehabPlans();
      
      return { success: true };
    } catch (err) {
      const errorMessage = handleError(err, 'updating rehabilitation plan');
      return { success: false, error: errorMessage };
    } finally {
      setLoadingState('edit', false);
    }
  }, [fetchRehabPlans, handleError, setLoadingState]);

  const deleteRehabPlan = useCallback(async (planId: string) => {
    setLoadingState('delete', true);
    setError(null);
    
    try {
      debugLog('Deleting rehabilitation plan:', planId);
      
      const { error: deleteError } = await dataClient
        .from('rehabilitation_plans')
        .delete()
        .eq('id', planId);

      if (deleteError) throw deleteError;

      debugLog('Successfully deleted rehabilitation plan:', planId);
      
      // Refresh plans list
      await fetchRehabPlans();
      
      return { success: true };
    } catch (err) {
      const errorMessage = handleError(err, 'deleting rehabilitation plan');
      return { success: false, error: errorMessage };
    } finally {
      setLoadingState('delete', false);
    }
  }, [fetchRehabPlans, handleError, setLoadingState]);

  // Auto-fetch on mount and clinicianId change
  useEffect(() => {
    if (clinicianId) {
      fetchRehabPlans();
    }
    return () => {
      // Cleanup on unmount
      setRehabPlans([]);
      setError(null);
      setLoadingStates({
        fetch: false,
        add: false,
        edit: false,
        delete: false
      });
    };
  }, [clinicianId, fetchRehabPlans]);

  return {
    rehabPlans,
    loading,
    error,
    fetchRehabPlans,
    addRehabPlan,
    editRehabPlan,
    deleteRehabPlan,
  };
};

