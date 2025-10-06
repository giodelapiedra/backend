import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized settings for real-time updates
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable automatic refetching to rely on Supabase realtime
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      // Keep data fresh for real-time updates
      staleTime: 0, // Data is immediately stale
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
      // Retry configuration
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  // Work readiness queries
  workReadiness: {
    all: ['workReadiness'] as const,
    teamLeader: (teamLeaderId: string) => ['workReadiness', 'teamLeader', teamLeaderId] as const,
    today: (teamLeaderId: string) => ['workReadiness', 'today', teamLeaderId] as const,
    trend: (teamLeaderId: string, dateRange: string, startDate?: string, endDate?: string) => 
      ['workReadiness', 'trend', teamLeaderId, dateRange, startDate, endDate] as const,
  },
  // Team queries
  team: {
    all: ['team'] as const,
    members: (teamLeaderId: string) => ['team', 'members', teamLeaderId] as const,
    data: (teamLeaderId: string) => ['team', 'data', teamLeaderId] as const,
  },
  // Analytics queries
  analytics: {
    all: ['analytics'] as const,
    dashboard: (teamLeaderId: string) => ['analytics', 'dashboard', teamLeaderId] as const,
  },
} as const;
