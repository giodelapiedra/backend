-- Database Indexes for Performance Optimization
-- Run these in your Supabase SQL Editor

-- Work Readiness Table Indexes
CREATE INDEX IF NOT EXISTS idx_work_readiness_worker_id ON work_readiness(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_readiness_submitted_at ON work_readiness(submitted_at);
CREATE INDEX IF NOT EXISTS idx_work_readiness_worker_date ON work_readiness(worker_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_work_readiness_team_leader ON work_readiness(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_work_readiness_readiness_level ON work_readiness(readiness_level);
CREATE INDEX IF NOT EXISTS idx_work_readiness_streak_days ON work_readiness(worker_id, streak_days);
CREATE INDEX IF NOT EXISTS idx_work_readiness_cycle_start ON work_readiness(worker_id, cycle_start);
CREATE INDEX IF NOT EXISTS idx_work_readiness_cycle_completed ON work_readiness(worker_id, cycle_completed);

-- Work Readiness Assignments Table Indexes
CREATE INDEX IF NOT EXISTS idx_work_readiness_assignments_worker_id ON work_readiness_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_readiness_assignments_team_leader ON work_readiness_assignments(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_work_readiness_assignments_date ON work_readiness_assignments(assigned_date);
CREATE INDEX IF NOT EXISTS idx_work_readiness_assignments_status ON work_readiness_assignments(status);
CREATE INDEX IF NOT EXISTS idx_work_readiness_assignments_worker_date ON work_readiness_assignments(worker_id, assigned_date);
CREATE INDEX IF NOT EXISTS idx_work_readiness_assignments_team_leader_date ON work_readiness_assignments(team_leader_id, assigned_date);

-- Users Table Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team);
CREATE INDEX IF NOT EXISTS idx_users_team_leader ON users(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role_team ON users(role, team);
CREATE INDEX IF NOT EXISTS idx_users_team_leader_active ON users(team_leader_id, is_active);

-- Notifications Table Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at);

-- Cases Table Indexes
CREATE INDEX IF NOT EXISTS idx_cases_worker_id ON cases(worker_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_worker_status ON cases(worker_id, status);

-- Incidents Table Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_worker_id ON incidents(worker_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

-- Composite Indexes for Common Queries
CREATE INDEX IF NOT EXISTS idx_work_readiness_worker_cycle ON work_readiness(worker_id, cycle_start, cycle_completed);
CREATE INDEX IF NOT EXISTS idx_work_readiness_team_leader_date ON work_readiness(team_leader_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_users_worker_team ON users(id, role, team) WHERE role = 'worker';
CREATE INDEX IF NOT EXISTS idx_users_team_leader_managed ON users(id, role, managed_teams) WHERE role = 'team_leader';

-- Partial Indexes for Better Performance
CREATE INDEX IF NOT EXISTS idx_work_readiness_active_workers ON work_readiness(worker_id, submitted_at) 
WHERE worker_id IN (SELECT id FROM users WHERE role = 'worker' AND is_active = true);

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at) 
WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_work_readiness_recent ON work_readiness(worker_id, submitted_at) 
WHERE submitted_at >= NOW() - INTERVAL '30 days';

-- Indexes for Analytics Queries
CREATE INDEX IF NOT EXISTS idx_work_readiness_analytics ON work_readiness(team_leader_id, submitted_at, readiness_level, fatigue_level);
CREATE INDEX IF NOT EXISTS idx_work_readiness_kpi_calc ON work_readiness(worker_id, streak_days, cycle_completed, submitted_at);

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
    schemaname text,
    tablename text,
    indexname text,
    idx_scan bigint,
    idx_tup_read bigint,
    idx_tup_fetch bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname::text,
        tablename::text,
        indexname::text,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_query_performance(query_text text)
RETURNS TABLE (
    plan_line text
) AS $$
BEGIN
    RETURN QUERY
    EXECUTE 'EXPLAIN ANALYZE ' || query_text;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON INDEX idx_work_readiness_worker_date IS 'Optimizes queries for worker assessments by date range';
COMMENT ON INDEX idx_work_readiness_team_leader_date IS 'Optimizes team leader dashboard queries';
COMMENT ON INDEX idx_work_readiness_worker_cycle IS 'Optimizes KPI calculation queries';
COMMENT ON INDEX idx_users_worker_team IS 'Optimizes team member lookups for team leaders';
COMMENT ON INDEX idx_notifications_unread IS 'Optimizes unread notification queries';

-- Grant permissions for index usage stats
GRANT EXECUTE ON FUNCTION get_index_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_query_performance(text) TO authenticated;
