import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { dataClient } from '../../lib/supabase';

export const casesApi = createApi({
  reducerPath: 'casesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '', // No fallback URL - use Supabase only
  }),
  tagTypes: ['Case', 'Incident', 'User'],
  // Optimize for real-time updates
  refetchOnFocus: false,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30, // Refetch if data is older than 30 seconds
  endpoints: (builder) => ({
    getClinicianCases: builder.query({
      queryFn: async (clinicianId: string) => {
        try {
          const { data, error } = await dataClient
            .from('cases')
            .select(`
              *,
              worker:users!cases_worker_id_fkey(id, first_name, last_name, email),
              case_manager:users!cases_case_manager_id_fkey(id, first_name, last_name, email),
              clinician:users!cases_clinician_id_fkey(id, first_name, last_name, email),
              incident:incidents!cases_incident_id_fkey(id, incident_type, description, severity)
            `)
            .eq('clinician_id', clinicianId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          return { 
            data: { 
              cases: data || [], 
              total: data?.length || 0
            } 
          };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (result, error, clinicianId) => [
        { type: 'Case', id: `clinician-${clinicianId}` },
        { type: 'Case', id: 'LIST' }
      ],
      keepUnusedDataFor: 0, // Clear cache immediately
    }),
    getCases: builder.query({
      queryFn: async (arg: { page?: number; limit?: number; search?: string; status?: string; caseManagerId?: string; includeAll?: boolean } = {}) => {
        try {
          const { page = 1, limit = 10, search = '', status = '', caseManagerId, includeAll = false } = arg;
          const offset = (page - 1) * limit;
          
          let query = dataClient
            .from('cases')
            .select(`
              *,
              worker:users!worker_id(id, first_name, last_name, email),
              case_manager:users!case_manager_id(id, first_name, last_name, email),
              incident:incidents!incident_id(id, severity, incident_type, description, reported_by)
            `, { count: 'exact' });
          
          // Apply case manager filter (unless includeAll is true)
          if (!includeAll && caseManagerId) {
            query = query.eq('case_manager_id', caseManagerId);
          }
          
          // Apply search filter
          if (search) {
            query = query.or(`case_number.ilike.%${search}%,worker.first_name.ilike.%${search}%,worker.last_name.ilike.%${search}%`);
          }
          
          // Apply status filter
          if (status) {
            query = query.eq('status', status);
          }
          
          // Apply pagination and ordering
          const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
          
          if (error) throw error;
          
          return { 
            data: { 
              cases: data || [], 
              pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
              }
            } 
          };
        } catch (error) {
          return { error: { status: 500, data: error } };
        }
      },
      providesTags: ['Case'],
      keepUnusedDataFor: 0, // Clear cache immediately
    }),
    
    getCaseById: builder.query({
      queryFn: async (id: string) => {
        try {
          const { data, error } = await dataClient
            .from('cases')
            .select(`
              *,
              worker:users!worker_id(id, first_name, last_name, email),
              case_manager:users!case_manager_id(id, first_name, last_name, email),
              incident:incidents!incident_id(id, severity, incident_type, description, reported_by)
            `)
            .eq('id', id)
            .single();
          
          if (error) throw error;
          return { data: { case: data } };
        } catch (error) {
          return { error: { status: 500, data: error } };
        }
      },
      providesTags: (result, error, id) => [{ type: 'Case', id }],
      keepUnusedDataFor: 0, // Clear cache immediately
    }),
    
    createCase: builder.mutation({
      queryFn: async (caseData: any) => {
        try {
          const { data, error } = await dataClient
            .from('cases')
            .insert(caseData)
            .select(`
              *,
              worker:users!worker_id(id, first_name, last_name, email),
              case_manager:users!case_manager_id(id, first_name, last_name, email),
              incident:incidents!incident_id(id, severity, incident_type, description, reported_by)
            `)
            .single();
          
          if (error) throw error;
          return { data: { case: data } };
        } catch (error) {
          return { error: { status: 500, data: error } };
        }
      },
      invalidatesTags: ['Case', 'Incident'],
      // Force refetch after mutation
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          // Invalidate and refetch all cases
          dispatch(casesApi.util.invalidateTags(['Case']));
        } catch (error) {
          console.error('Error in createCase mutation:', error);
        }
      },
    }),
    
    updateCase: builder.mutation({
      queryFn: async ({ id, updates }) => {
        try {
          const { data, error } = await dataClient
            .from('cases')
            .update(updates)
            .eq('id', id)
            .select(`
              *,
              worker:users!worker_id(id, first_name, last_name, email),
              case_manager:users!case_manager_id(id, first_name, last_name, email),
              incident:incidents!incident_id(id, severity, incident_type, description, reported_by)
            `)
            .single();
          
          if (error) throw error;
          return { data: { case: data } };
        } catch (error) {
          return { error: { status: 500, data: error } };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Case', id },
        'Case'
      ],
      // Force refetch after mutation
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          // Invalidate and refetch all cases
          dispatch(casesApi.util.invalidateTags(['Case']));
        } catch (error) {
          console.error('Error in updateCase mutation:', error);
        }
      },
    }),
  }),
});

export const {
  useGetCasesQuery,
  useGetClinicianCasesQuery,
  useGetCaseByIdQuery,
  useCreateCaseMutation,
  useUpdateCaseMutation,
} = casesApi;
