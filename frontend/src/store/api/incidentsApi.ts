import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { dataClient } from '../../lib/supabase';

export const incidentsApi = createApi({
  reducerPath: 'incidentsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '', // No fallback URL - use Supabase only
  }),
  tagTypes: ['Incident', 'Case'],
  // Minimal auto refresh - only on reconnect, no aggressive refresh
  refetchOnFocus: false,
  refetchOnReconnect: true, // Reconnect only - essential for network issues
  refetchOnMountOrArgChange: false, // No aggressive refresh
  endpoints: (builder) => ({
    getIncidents: builder.query({
      queryFn: async (arg: { page?: number; limit?: number; search?: string; status?: string; severity?: string } = {}) => {
        try {
          const { page = 1, limit = 10, search = '', status = '', severity = '' } = arg;
          const offset = (page - 1) * limit;
          
          let query = dataClient
            .from('incidents')
            .select(`
              *,
              reported_by:users!reported_by(id, first_name, last_name, email),
              worker:users!worker_id(id, first_name, last_name, email)
            `, { count: 'exact' });
          
          // Apply search filter
          if (search) {
            query = query.or(`description.ilike.%${search}%,reported_by.first_name.ilike.%${search}%,reported_by.last_name.ilike.%${search}%`);
          }
          
          // Apply status filter
          if (status) {
            query = query.eq('status', status);
          }
          
          // Apply severity filter
          if (severity) {
            query = query.eq('severity', severity);
          }
          
          // Apply pagination and ordering
          const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
          
          if (error) throw error;
          
          return { 
            data: { 
              incidents: data || [], 
              total: count || 0,
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
          
          // Validate only the most essential field
          if (!incidentData.description || incidentData.description.trim() === '') {
            throw new Error('description is required');
          }

          // Map severity if provided, otherwise use default
          let mappedSeverity = 'near_miss'; // Default severity
          if (incidentData.severity) {
            const severityMapping: { [key: string]: string } = {
              'low': 'near_miss',
              'medium': 'first_aid', 
              'high': 'medical_treatment',
              'critical': 'lost_time',
              'fatal': 'fatality'
            };
            mappedSeverity = severityMapping[incidentData.severity] || 'near_miss';
          }
          
          console.log(`🎯 Severity mapping: ${incidentData.severity || 'not provided'} -> ${mappedSeverity}`);

          // Map incident type if provided, otherwise use default
          let mappedIncidentType = 'other'; // Default incident type
          if (incidentData.incident_type) {
            const incidentTypeMapping: { [key: string]: string } = {
              'slip_fall': 'slip_fall',
              'strain_injury': 'overexertion',
              'cut_laceration': 'cut_laceration',
              'burn': 'burn',
              'struck_by': 'struck_by',
              'struck_against': 'struck_against',
              'overexertion': 'overexertion',
              'crush': 'crush',
              'other': 'other'
            };
            mappedIncidentType = incidentTypeMapping[incidentData.incident_type] || 'other';
          }
          
          console.log(`🎯 Incident type mapping: ${incidentData.incident_type || 'not provided'} -> ${mappedIncidentType}`);

          // Map frontend data to database schema - with worker_id column
          const mappedIncidentData: any = {
            description: incidentData.description,
            reported_by: incidentData.reported_by_id,  // Site supervisor who reported
            worker_id: incidentData.worker_id,  // Worker who had the incident
            severity: mappedSeverity,  // Mapped severity value
            incident_type: mappedIncidentType  // Mapped incident type
          };
          
          console.log('🎯 Using complete incident data mapping with worker_id');
          console.log('📊 Including worker_id for proper incident tracking');
          
          console.log('Mapped incident data:', JSON.stringify(mappedIncidentData, null, 2));
          
          console.log('All validations passed, attempting to create incident...');
          
          // Test if incidents table exists by doing a simple count query first
          try {
            const { count, error: countError } = await dataClient
              .from('incidents')
              .select('*', { count: 'exact', head: true });
            
            if (countError) {
              console.error('Error checking incidents table:', countError);
              throw new Error(`Incidents table error: ${countError.message}`);
            }
            console.log('Incidents table accessible, current count:', count);
          } catch (tableError) {
            console.error('Cannot access incidents table:', tableError);
            throw new Error(`Cannot access incidents table: ${tableError}`);
          }
          
          // First, create the incident
              const { data: incident, error: incidentError } = await dataClient
                .from('incidents')
                .insert(mappedIncidentData)
                .select('*')
                .single();
          
          if (incidentError) {
            console.error('Error creating incident:', incidentError);
            console.error('Incident data that failed:', JSON.stringify(mappedIncidentData, null, 2));
            console.error('Error details:', JSON.stringify({
              code: incidentError.code,
              message: incidentError.message,
              details: incidentError.details,
              hint: incidentError.hint
            }, null, 2));
            throw incidentError;
          }
          
          console.log('Incident created successfully:', incident);
          console.log('Incident severity:', incident.severity);
          console.log('Incident ID:', incident.id);
          
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
              worker_id: mappedIncidentData.worker_id, // Use the actual worker who had the incident
              employer_id: mappedIncidentData.reported_by, // Use the site supervisor as employer
              case_manager_id: caseManager.id,
              incident_id: incident.id, // Link the case to the incident
              status: 'new',
              priority: 'medium'
            };
            
            console.log('🎯 Creating case with data:', JSON.stringify(caseData, null, 2));
            
            const { data: newCase, error: caseError } = await dataClient
              .from('cases')
              .insert(caseData)
              .select('*')
              .single();
            
            if (caseError) {
              console.error('❌ Error creating case:', JSON.stringify(caseError, null, 2));
              console.error('❌ Case data that failed:', JSON.stringify(caseData, null, 2));
              // Don't fail incident creation if case creation fails
            } else {
              console.log('✅ Case created successfully:', JSON.stringify(newCase, null, 2));
              
              // Update the incident with the case_id
              console.log('🎯 Updating incident with case_id:', newCase.id);
              const { error: updateIncidentError } = await dataClient
                .from('incidents')
                .update({ case_id: newCase.id })
                .eq('id', incident.id);
              
              if (updateIncidentError) {
                console.error('❌ Error updating incident with case_id:', JSON.stringify(updateIncidentError, null, 2));
                console.error('❌ Incident ID:', incident.id);
                console.error('❌ Case ID:', newCase.id);
              } else {
                console.log('✅ Incident updated with case_id:', newCase.id);
                console.log('✅ Incident ID:', incident.id);
                console.log('✅ Case ID:', newCase.id);
              }
            }
            
            // Send notification to case manager (using correct column names)
            const notificationData = {
              recipient_id: caseManager.id, // Use recipient_id instead of user_id
              type: 'case_assignment', // Use valid notification type
              title: 'New Incident Reported',
              message: `A new incident has been reported and assigned to you. Case: ${newCase?.case_number || 'Pending'}`,
              priority: 'medium', // Default priority
              related_incident_id: incident.id, // Use related_incident_id instead of incident_id
              related_case_id: newCase?.id, // Use related_case_id instead of case_id
              action_url: 'http://localhost:3000/site-supervisor' // Add action URL for viewing incidents dashboard
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
              console.log('✅ Notification priority:', notificationData.priority);
            }
            
            // Send notification to worker (using correct column names)
            const workerNotificationData = {
              recipient_id: mappedIncidentData.worker_id, // Use recipient_id instead of user_id
              type: 'case_assignment', // Use valid notification type
              title: 'Incident Case Created',
              message: `A case has been created for your incident. Case: ${newCase?.case_number || 'Pending'}`,
              priority: 'medium', // Default priority
              related_incident_id: incident.id, // Use related_incident_id instead of incident_id
              related_case_id: newCase?.id, // Use related_case_id instead of case_id
              action_url: 'http://localhost:3000/site-supervisor' // Add action URL for viewing incidents dashboard
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
          console.error('Error type:', typeof error);
          console.error('Error stringified:', JSON.stringify(error, null, 2));
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
          console.error('Mutation error type:', typeof error);
          console.error('Mutation error stringified:', JSON.stringify(error, null, 2));
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
