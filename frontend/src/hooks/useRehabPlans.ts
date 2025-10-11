import { useState, useCallback } from 'react';
import { dataClient } from '../lib/supabase';
import { debugLog, errorLog } from '../utils/debugLog';
import { extractErrorMessage } from '../utils/errorHandling';

interface RehabPlan {
  _id: string;
  planName: string;
  status: string;
  case?: {
    _id: string;
    caseNumber: string;
    status: string;
    worker: {
      firstName: string;
      lastName: string;
    };
  };
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    completed: boolean;
  }>;
  startDate: string;
  endDate: string;
  progress: number;
}

interface UseRehabPlansReturn {
  rehabPlans: RehabPlan[];
  loading: boolean;
  error: string | null;
  fetchRehabPlans: () => Promise<void>;
  addRehabPlan: (planData: any) => Promise<{ success: boolean; error?: string; data?: any }>;
  editRehabPlan: (planId: string, updates: any) => Promise<{ success: boolean; error?: string }>;
  deleteRehabPlan: (planId: string) => Promise<{ success: boolean; error?: string }>;
}

export const useRehabPlans = (clinicianId?: string): UseRehabPlansReturn => {
  const [rehabPlans, setRehabPlans] = useState<RehabPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRehabPlans = useCallback(async () => {
    if (!clinicianId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      debugLog('Fetching rehabilitation plans for clinician:', clinicianId);
      
      const { data, error: fetchError } = await dataClient
        .from('rehabilitation_plans')
        .select(`
          *,
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
      const plans = (data || []).map(plan => ({
        _id: plan.id,
        planName: plan.plan_name,
        status: plan.status,
        startDate: plan.start_date,
        endDate: plan.end_date || null,
        progress: 0,
        case: plan.case ? {
          _id: plan.case.id,
          caseNumber: plan.case.case_number,
          status: plan.case.status,
          worker: plan.case.worker ? {
            _id: plan.case.worker.id,
            firstName: plan.case.worker.first_name,
            lastName: plan.case.worker.last_name
          } : undefined
        } : undefined,
        exercises: plan.exercises || [],
        progressStats: plan.progress_stats || {}
      }));

      setRehabPlans(plans as any);
      debugLog('Successfully fetched', plans.length, 'rehabilitation plans');
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      errorLog('Error fetching rehabilitation plans:', errorMessage);
      setError(errorMessage);
      setRehabPlans([]);
    } finally {
      setLoading(false);
    }
  }, [clinicianId]);

  const addRehabPlan = useCallback(async (planData: any) => {
    setLoading(true);
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
      const errorMessage = extractErrorMessage(err);
      errorLog('Error creating rehabilitation plan:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchRehabPlans]);

  const editRehabPlan = useCallback(async (planId: string, updates: any) => {
    setLoading(true);
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
      const errorMessage = extractErrorMessage(err);
      errorLog('Error updating rehabilitation plan:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchRehabPlans]);

  const deleteRehabPlan = useCallback(async (planId: string) => {
    setLoading(true);
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
      const errorMessage = extractErrorMessage(err);
      errorLog('Error deleting rehabilitation plan:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchRehabPlans]);

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

