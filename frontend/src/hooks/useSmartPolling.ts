import { useEffect, useRef, useCallback } from 'react';
import { debugLog } from '../utils/debugLog';

interface UseSmartPollingOptions {
  onPoll: () => void | Promise<void>;
  interval: number; // in milliseconds
  enabled?: boolean;
}

/**
 * Custom hook for smart polling that:
 * - Stops when document is hidden
 * - Resumes when document becomes visible
 * - Can be enabled/disabled
 */
export const useSmartPolling = ({ onPoll, interval, enabled = true }: UseSmartPollingOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const startPolling = useCallback(() => {
    if (isPollingRef.current || !enabled) return;
    
    debugLog('🔄 Starting smart polling (interval:', interval, 'ms)');
    isPollingRef.current = true;
    
    intervalRef.current = setInterval(() => {
      if (!document.hidden) {
        debugLog('🔄 Executing poll');
        onPoll();
      } else {
        debugLog('🔄 Skipping poll (document hidden)');
      }
    }, interval);
  }, [onPoll, interval, enabled]);

  const stopPolling = useCallback(() => {
    if (!isPollingRef.current) return;
    
    debugLog('🛑 Stopping smart polling');
    isPollingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        debugLog('📴 Document hidden, stopping polling');
        stopPolling();
      } else {
        debugLog('📲 Document visible, starting polling');
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startPolling, stopPolling]);

  // Start polling when enabled and document is visible
  useEffect(() => {
    if (enabled && !document.hidden) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  return { startPolling, stopPolling };
};

