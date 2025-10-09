import { useEffect, useMemo, useRef, useState } from 'react';
import { SupabaseAPI } from '../utils/supabaseApi';

type Sections = Array<'workReadiness'|'login'|'trend'>;

interface AnalyticsFilters {
  work: { range: string; start: Date; end: Date };
  login: { range: string; start: Date; end: Date };
  trend: { range: string; start: Date; end: Date };
}

export function useAnalytics(userId: string | undefined, filters: AnalyticsFilters) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    // debounce 250ms
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const ac = new AbortController();
      (async () => {
        try {
          const base = await SupabaseAPI.getAnalyticsData(userId);
          const [wr, lg, tr] = await Promise.all([
            SupabaseAPI.getWorkReadinessStats(userId, filters.work.range as any, filters.work.start, filters.work.end).catch(()=>null),
            SupabaseAPI.getLoginStats(userId, filters.login.range as any, filters.login.start, filters.login.end).catch(()=>null),
            SupabaseAPI.getWorkReadinessTrendData(userId, filters.trend.range as any, filters.trend.start, filters.trend.end, true).catch(()=>null),
          ]);
          setData({
            ...base,
            analytics: {
              ...base.analytics,
              workReadinessStats: wr?.analytics?.workReadinessStats ?? base.analytics.workReadinessStats,
              loginStats: lg?.analytics?.loginStats ?? base.analytics.loginStats,
              readinessTrendData: tr?.analytics?.readinessTrendData ?? base.analytics.readinessTrendData ?? [],
            }
          });
          setError(null);
        } catch (e: any) {
          if (e?.name !== 'AbortError') setError('Failed to load analytics');
        } finally {
          setLoading(false);
        }
      })();
      return () => ac.abort();
    }, 250);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [userId, filters.work.range, filters.work.start, filters.work.end, filters.login.range, filters.login.start, filters.login.end, filters.trend.range, filters.trend.start, filters.trend.end]);

  return { data, error, loading, setData };
}
