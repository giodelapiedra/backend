import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { dataClient } from '../../lib/supabase';

export const incidentsApi = createApi({
  reducerPath: 'incidentsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '', // No fallback URL - use Supabase only
  }),
  tagTypes: ['Incident', 'Case'],
  // Optimize for real-time updates
  refetchOnFocus: false,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30, // Refetch if data is older than 30 seconds
  endpoints: (builder) => ({
    getIncidents: builder.query({
      queryFn: async (arg = {}) => {
        try {
            const { data, error } = await dataClient
              .from('incidents')
              .select(`
                *,
                reported_by:users!reported_by(id, first_name, last_name, email)
              `)
              .order('created_at', { ascending: false });
          
          if (error) throw error;
          return { data: { incidents: data || [] } };
        } catch (error) {
          return { error: { status: 500, data: error } };
        }
      },
      providesTags: ['Incident'],
      keepUnusedDataFor: 0, // Clear cache immediately
    }),
    
    getIncidentById: builder.query({
      queryFn: async (id: string) => {
        try {
            const { data, error } = await dataClient
              .from('incidents')
              .select(`
                *,
                reported_by:users!reported_by(id, first_name, last_name, email)
              `)
              .eq('id', id)
              .single();
          
          if (error) throw error;
          return { data: { incident: data } };
        } catch (error) {
          return { error: { status: 500, data: error } };
        }
      },
      providesTags: (result, error, id) => [{ type: 'Incident', id }],
      keepUnusedDataFor: 0, // Clear cache immediately
    }),
    
    createIncident: builder.mutation({
      queryFn: async (incidentData: any) => {
        try {
          console.log('Creating incident with data:', incidentData);
          
          // First, create the incident
              const { data: incident, error: incidentError } = await dataClient
                .from('incidents')
                .insert(incidentData)
                .select(`
                  *,
                  reported_by:users!reported_by(id, first_name, last_name, email)
                `)
                .single();
          
          if (incidentError) {
            console.error('Error creating incident:', incidentError);
            throw incidentError;
          }
          
          console.log('Incident created successfully:', incident);
          console.log('Incident severity:', incident.severity);
          
          // Find available case manager
          const { data: caseManagers, error: caseManagerError } = await dataClient
            .from('users')
            .select('id, first_name, last_name, email')
            .eq('role', 'case_manager')
            .eq('is_active', true)
            .limit(1);
          
          if (caseManagerError) {
            console.error('Error finding case manager:', caseManagerError);
            // Don't fail incident creation if we can't find a case manager
          }
          
          const caseManager = caseManagers?.[0];
          
          console.log('Case managers found:', caseManagers?.length || 0);
          console.log('Selected case manager:', caseManager);
          
          if (caseManager) {
            // Create case automatically
            const caseData = {
              case_number: `CASE-${new Date().getFullYear()}-${Date.now()}`,
              worker_id: incidentData.reported_by, // This is now the actual worker who had the incident
              case_manager_id: caseManager.id,
              incident_id: incident.id, // Link the case to the incident
              status: 'new'
            };
            
            const { data: newCase, error: caseError } = await dataClient
              .from('cases')
              .insert(caseData)
              .select(`
                *,
                worker:users!worker_id(id, first_name, last_name, email),
                case_manager:users!case_manager_id(id, first_name, last_name, email)
              `)
              .single();
            
            if (caseError) {
              console.error('Error creating case:', caseError);
              // Don't fail incident creation if case creation fails
            } else {
              console.log('Case created successfully:', newCase);
            }
            
            // Send notification to case manager
            const isHighSeverity = incident.severity === 'high';
            
            // Map form severity values to database constraint values
            const mapSeverity = (severity: string) => {
              switch (severity) {
                case 'high': return 'medical_treatment';
                case 'medium': return 'first_aid';
                case 'low': return 'near_miss';
                default: return 'near_miss';
              }
            };
            
            const notificationData = {
              user_id: caseManager.id,
              type: 'incident_reported',
              title: 'New Incident Reported',
              message: `A new incident has been reported and assigned to you. Case: ${newCase?.case_number || 'Pending'} - Worker: ${newCase?.worker?.first_name} ${newCase?.worker?.last_name}`,
              severity: mapSeverity(incident.severity),
              priority: isHighSeverity ? 'high' : 'medium',
              incident_id: incident.id,
              case_id: newCase?.id
            };
            
            console.log('Creating notification with data:', notificationData);
            
            const { data: notificationResult, error: notificationError } = await dataClient
              .from('notifications')
              .insert(notificationData)
              .select();
            
            if (notificationError) {
              console.error('Error sending notification to case manager:', notificationError);
            } else {
              console.log('✅ Notification sent to case manager:', caseManager.email);
              console.log('✅ Notification created:', notificationResult);
              console.log('✅ Notification severity:', notificationData.severity);
              console.log('✅ Notification priority:', notificationData.priority);
            }
            
            // Send notification to worker
            const workerNotificationData = {
              user_id: incident.reported_by, // This is now the actual worker who had the incident
              type: 'incident_case_created',
              title: 'Incident Case Created',
              message: `A case has been created for your incident. Case: ${newCase?.case_number || 'Pending'} - ${newCase?.worker?.first_name} ${newCase?.worker?.last_name}`,
              severity: mapSeverity(incident.severity),
              priority: isHighSeverity ? 'high' : 'medium',
              incident_id: incident.id,
              case_id: newCase?.id
            };
            
            const { error: workerNotificationError } = await dataClient
              .from('notifications')
              .insert(workerNotificationData);
            
            if (workerNotificationError) {
              console.error('Error sending notification to worker:', workerNotificationError);
            } else {
              console.log('Notification sent to worker');
            }
          } else {
            console.log('No case manager found, skipping notification creation');
          }
          
          return { data: { incident, caseManager, caseCreated: !!caseManager } };
        } catch (error) {
          console.error('Error in createIncident:', error);
          return { error: { status: 500, data: error } };
        }
      },
      invalidatesTags: ['Incident', 'Case'],
      // Force refetch after mutation
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          // Invalidate and refetch all incidents and cases
          dispatch(incidentsApi.util.invalidateTags(['Incident']));
          dispatch(incidentsApi.util.invalidateTags(['Case']));
        } catch (error) {
          console.error('Error in createIncident mutation:', error);
        }
      },
    }),
    
    updateIncident: builder.mutation({
      queryFn: async ({ id, updates }) => {
        try {
              const { data, error } = await dataClient
                .from('incidents')
                .update(updates)
                .eq('id', id)
                .select(`
                  *,
                  reported_by:users!reported_by(id, first_name, last_name, email)
                `)
                .single();
          
          if (error) throw error;
          return { data: { incident: data } };
        } catch (error) {
          return { error: { status: 500, data: error } };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Incident', id },
        'Incident'
      ],
      // Force refetch after mutation
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          // Invalidate and refetch all incidents
          dispatch(incidentsApi.util.invalidateTags(['Incident']));
        } catch (error) {
          console.error('Error in updateIncident mutation:', error);
        }
      },
    }),
  }),
});

export const {
  useGetIncidentsQuery,
  useGetIncidentByIdQuery,
  useCreateIncidentMutation,
  useUpdateIncidentMutation,
} = incidentsApi;
