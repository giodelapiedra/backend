import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { dataClient } from '../../lib/supabase';

export const casesApi = createApi({
  reducerPath: 'casesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '', // No fallback URL - use Supabase only
  }),
  tagTypes: ['Case', 'Incident', 'User'],
  // Minimal auto refresh - only on reconnect, no aggressive refresh
  refetchOnFocus: false,
  refetchOnReconnect: true, // Reconnect only - essential for network issues
  refetchOnMountOrArgChange: false, // No aggressive refresh
  endpoints: (builder) => ({
    getClinicianCases: builder.query({
      queryFn: async (clinicianId: string) => {
        try {
          const { data, error } = await dataClient
            .from('cases')
            .select(`
              id,
              case_number,
              status,
              priority,
              worker_id,
              employer_id,
              case_manager_id,
              clinician_id,
              incident_id,
              created_at,
              updated_at,
              worker:worker_id(id, first_name, last_name, email),
              case_manager:case_manager_id(id, first_name, last_name, email),
              clinician:clinician_id(id, first_name, last_name, email),
              incident:incident_id(id, incident_type, severity, description)
            `)
            .eq('clinician_id', clinicianId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Debug: Log the actual data structure
          console.log('🔍 Supabase query result:', data);
          if (data && data.length > 0) {
            console.log('🔍 First case structure:', data[0]);
            console.log('🔍 Worker type:', typeof data[0].worker, Array.isArray(data[0].worker));
          }

          // Transform arrays to single objects if needed
          const transformedData = (data || []).map((caseItem: any) => ({
            ...caseItem,
            worker: Array.isArray(caseItem.worker) ? caseItem.worker[0] || null : caseItem.worker,
            case_manager: Array.isArray(caseItem.case_manager) ? caseItem.case_manager[0] || null : caseItem.case_manager,
            clinician: Array.isArray(caseItem.clinician) ? caseItem.clinician[0] || null : caseItem.clinician,
            incident: Array.isArray(caseItem.incident) ? caseItem.incident[0] || null : caseItem.incident,
          }));

          return { 
            data: { 
              cases: transformedData, 
              total: transformedData.length
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
              id,
              case_number,
              status,
              priority,
              worker_id,
              employer_id,
              case_manager_id,
              clinician_id,
              incident_id,
              created_at,
              updated_at,
              worker:worker_id(id, first_name, last_name, email),
              case_manager:case_manager_id(id, first_name, last_name, email),
              clinician:clinician_id(id, first_name, last_name, email),
              incident:incident_id(id, incident_type, severity, description)
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

          // Debug: Log the actual data structure
          console.log('🔍 getCases query result:', data);
          if (data && data.length > 0) {
            console.log('🔍 First case structure:', data[0]);
            console.log('🔍 Worker type:', typeof data[0].worker, Array.isArray(data[0].worker));
          }

          // Transform arrays to single objects if needed
          const transformedData = (data || []).map((caseItem: any) => ({
            ...caseItem,
            worker: Array.isArray(caseItem.worker) ? caseItem.worker[0] || null : caseItem.worker,
            case_manager: Array.isArray(caseItem.case_manager) ? caseItem.case_manager[0] || null : caseItem.case_manager,
            clinician: Array.isArray(caseItem.clinician) ? caseItem.clinician[0] || null : caseItem.clinician,
            incident: Array.isArray(caseItem.incident) ? caseItem.incident[0] || null : caseItem.incident,
          }));
          
          return { 
            data: { 
              cases: transformedData, 
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
              id,
              case_number,
              status,
              priority,
              worker_id,
              employer_id,
              case_manager_id,
              clinician_id,
              incident_id,
              created_at,
              updated_at,
              worker:worker_id(id, first_name, last_name, email),
              case_manager:case_manager_id(id, first_name, last_name, email),
              clinician:clinician_id(id, first_name, last_name, email),
              incident:incident_id(id, incident_type, severity, description)
            `)
            .eq('id', id)
            .single();
          
          if (error) throw error;

          // Transform arrays to single objects if needed
          const transformedData = {
            ...data,
            worker: Array.isArray(data.worker) ? data.worker[0] || null : data.worker,
            case_manager: Array.isArray(data.case_manager) ? data.case_manager[0] || null : data.case_manager,
            clinician: Array.isArray(data.clinician) ? data.clinician[0] || null : data.clinician,
            incident: Array.isArray(data.incident) ? data.incident[0] || null : data.incident,
          };

          return { data: { case: transformedData } };
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
              id,
              case_number,
              status,
              priority,
              worker_id,
              employer_id,
              case_manager_id,
              clinician_id,
              incident_id,
              created_at,
              updated_at,
              worker:worker_id(id, first_name, last_name, email),
              case_manager:case_manager_id(id, first_name, last_name, email),
              clinician:clinician_id(id, first_name, last_name, email),
              incident:incident_id(id, incident_type, severity, description)
            `)
            .single();
          
          if (error) throw error;

          // Transform arrays to single objects if needed
          const transformedData = {
            ...data,
            worker: Array.isArray(data.worker) ? data.worker[0] || null : data.worker,
            case_manager: Array.isArray(data.case_manager) ? data.case_manager[0] || null : data.case_manager,
            clinician: Array.isArray(data.clinician) ? data.clinician[0] || null : data.clinician,
            incident: Array.isArray(data.incident) ? data.incident[0] || null : data.incident,
          };

          return { data: { case: transformedData } };
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
              id,
              case_number,
              status,
              priority,
              worker_id,
              employer_id,
              case_manager_id,
              clinician_id,
              incident_id,
              created_at,
              updated_at,
              worker:worker_id(id, first_name, last_name, email),
              case_manager:case_manager_id(id, first_name, last_name, email),
              clinician:clinician_id(id, first_name, last_name, email),
              incident:incident_id(id, incident_type, severity, description)
            `)
            .single();
          
          if (error) throw error;

          // Transform arrays to single objects if needed
          const transformedData = {
            ...data,
            worker: Array.isArray(data.worker) ? data.worker[0] || null : data.worker,
            case_manager: Array.isArray(data.case_manager) ? data.case_manager[0] || null : data.case_manager,
            clinician: Array.isArray(data.clinician) ? data.clinician[0] || null : data.clinician,
            incident: Array.isArray(data.incident) ? data.incident[0] || null : data.incident,
          };

          return { data: { case: transformedData } };
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
