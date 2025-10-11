import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { dataClient } from '../../lib/supabase';

export interface RehabilitationPlan {
  id: string;
  worker_id: string;
  clinician_id: string;
  case_id: string;
  plan_name: string;
  plan_description: string;
  exercises: any[];
  status: 'active' | 'inactive' | 'completed' | 'paused' | 'cancelled';
  duration: number;
  daily_completions: any[];
  created_at: string;
  updated_at: string;
}

export interface WorkReadinessAssessment {
  id: string;
  worker_id: string;
  team_leader_id: string | null;
  team: string;
  fatigue_level: number;
  pain_discomfort: string;
  readiness_level: string;
  mood: string;
  notes: string;
  submitted_at: string;
  status: string;
}

export const workerApi = createApi({
  reducerPath: 'workerApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api' 
  }),
  tagTypes: ['RehabPlans', 'WorkReadiness', 'Assignments'],
  endpoints: (builder) => ({
    // Get worker's rehabilitation plans
    getRehabilitationPlans: builder.query<RehabilitationPlan[], string>({
      queryFn: async (workerId) => {
        try {
          const { data, error } = await dataClient
            .from('rehabilitation_plans')
            .select('*')
            .eq('worker_id', workerId)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

          if (error) throw error;
          return { data: data || [] };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ['RehabPlans'],
    }),

    // Check exercise completion status
    checkExerciseCompletion: builder.query<{ completed: boolean; completionTime: string | null }, string>({
      queryFn: async (workerId) => {
        try {
          const { data: plans, error } = await dataClient
            .from('rehabilitation_plans')
            .select('id, daily_completions, exercises')
            .eq('worker_id', workerId)
            .eq('status', 'active')
            .limit(1);

          if (error || !plans || plans.length === 0) {
            return { data: { completed: false, completionTime: null } };
          }

          const plan = plans[0];
          const now = new Date();
          const currentHour = now.getHours();
          
          // Determine which date to check (using 6:00 AM cutoff)
          let checkDate: string;
          if (currentHour < 6) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            checkDate = yesterday.toISOString().split('T')[0];
          } else {
            checkDate = now.toISOString().split('T')[0];
          }

          const dailyCompletions = plan.daily_completions || [];
          const todayCompletion = dailyCompletions.find((dc: any) => dc.date === checkDate);

          if (todayCompletion && todayCompletion.exercises) {
            const totalExercises = plan.exercises ? plan.exercises.length : 0;
            const completedExercises = todayCompletion.exercises.filter((e: any) => e.status === 'completed');
            
            if (totalExercises > 0 && completedExercises.length === totalExercises) {
              const lastCompleted = completedExercises[completedExercises.length - 1];
              const completionTime = lastCompleted?.completedAt 
                ? new Date(lastCompleted.completedAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })
                : null;
              
              return { data: { completed: true, completionTime } };
            }
          }

          return { data: { completed: false, completionTime: null } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ['RehabPlans'],
    }),

    // Submit work readiness assessment
    submitWorkReadiness: builder.mutation<any, any>({
      query: (assessmentData) => ({
        url: '/goal-kpi/submit-assessment',
        method: 'POST',
        body: assessmentData,
      }),
      invalidatesTags: ['WorkReadiness'],
    }),

    // Login cycle tracking
    startLoginCycle: builder.mutation<any, { workerId: string }>({
      query: ({ workerId }) => ({
        url: '/goal-kpi/login-cycle',
        method: 'POST',
        body: { workerId },
      }),
    }),
  }),
});

export const {
  useGetRehabilitationPlansQuery,
  useCheckExerciseCompletionQuery,
  useSubmitWorkReadinessMutation,
  useStartLoginCycleMutation,
} = workerApi;

