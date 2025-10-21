import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { authClient } from '../../lib/supabase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const caseManagerAnalyticsApi = createApi({
  reducerPath: 'caseManagerAnalyticsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: async (headers) => {
      try {
        const { data: { session } } = await authClient.auth.getSession();
        if (session?.access_token) {
          headers.set('Authorization', `Bearer ${session.access_token}`);
        }
      } catch (error) {
        console.error('Error getting auth token:', error);
      }
      return headers;
    },
  }),
  tagTypes: ['Analytics', 'Trends', 'Clinicians', 'Workers', 'Deadlines'],
  refetchOnFocus: false,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 300, // 5 minutes
  endpoints: (builder) => ({
    // Get overview analytics
    getCaseManagerOverview: builder.query({
      query: (period = 'month') => `/api/analytics/case-manager/overview?period=${period}`,
      providesTags: ['Analytics'],
    }),
    
    // Get trend data
    getCaseManagerTrends: builder.query({
      query: (period = 'month') => `/api/analytics/case-manager/trends?period=${period}`,
      providesTags: ['Trends'],
    }),
    
    // Get clinician metrics
    getClinicianMetrics: builder.query({
      query: () => '/api/analytics/case-manager/clinicians',
      providesTags: ['Clinicians'],
    }),
    
    // Get worker status overview
    getWorkerStatusOverview: builder.query({
      query: () => '/api/analytics/case-manager/workers',
      providesTags: ['Workers'],
    }),
    
    // Get deadlines overview
    getDeadlinesOverview: builder.query({
      query: () => '/api/analytics/case-manager/deadlines',
      providesTags: ['Deadlines'],
    }),
  }),
});

export const {
  useGetCaseManagerOverviewQuery,
  useGetCaseManagerTrendsQuery,
  useGetClinicianMetricsQuery,
  useGetWorkerStatusOverviewQuery,
  useGetDeadlinesOverviewQuery,
} = caseManagerAnalyticsApi;

