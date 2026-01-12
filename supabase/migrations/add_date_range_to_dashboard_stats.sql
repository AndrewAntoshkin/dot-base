-- Migration: Add date range support to dashboard stats functions
-- This fixes the issue where date filters in the admin dashboard are ignored

-- Function 1: Get generation stats per user WITH date range support
-- Now accepts optional start_date and end_date parameters
CREATE OR REPLACE FUNCTION get_user_generation_stats_filtered(
  p_user_ids UUID[],
  p_workspace_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  generations_count BIGINT,
  total_cost_usd NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.user_id,
    COUNT(*)::BIGINT as generations_count,
    COALESCE(SUM(CASE WHEN g.status = 'completed' THEN g.cost_usd ELSE 0 END), 0)::NUMERIC as total_cost_usd
  FROM generations g
  WHERE 
    g.user_id = ANY(p_user_ids)
    AND (p_workspace_id IS NULL OR g.workspace_id = p_workspace_id)
    AND (p_start_date IS NULL OR g.created_at >= p_start_date)
    AND (p_end_date IS NULL OR g.created_at <= p_end_date)
  GROUP BY g.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get total dashboard stats with date range support
CREATE OR REPLACE FUNCTION get_dashboard_totals_v2(
  p_workspace_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_generations BIGINT,
  total_cost_usd NUMERIC,
  total_failed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_generations,
    COALESCE(SUM(CASE WHEN g.status = 'completed' THEN g.cost_usd ELSE 0 END), 0)::NUMERIC as total_cost_usd,
    COUNT(CASE WHEN g.status = 'failed' THEN 1 END)::BIGINT as total_failed
  FROM generations g
  WHERE 
    (p_workspace_id IS NULL OR g.workspace_id = p_workspace_id)
    AND (p_user_id IS NULL OR g.user_id = p_user_id)
    AND (p_start_date IS NULL OR g.created_at >= p_start_date)
    AND (p_end_date IS NULL OR g.created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Get today's stats (or stats for specified date range "today" window)
CREATE OR REPLACE FUNCTION get_dashboard_today_stats_v2(
  p_workspace_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  generations_today BIGINT,
  cost_today_usd NUMERIC,
  failed_today BIGINT
) AS $$
DECLARE
  v_today_start TIMESTAMP WITH TIME ZONE := CURRENT_DATE;
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as generations_today,
    COALESCE(SUM(CASE WHEN g.status = 'completed' THEN g.cost_usd ELSE 0 END), 0)::NUMERIC as cost_today_usd,
    COUNT(CASE WHEN g.status = 'failed' THEN 1 END)::BIGINT as failed_today
  FROM generations g
  WHERE 
    g.created_at >= v_today_start
    AND (p_workspace_id IS NULL OR g.workspace_id = p_workspace_id)
    AND (p_user_id IS NULL OR g.user_id = p_user_id)
    AND (p_start_date IS NULL OR g.created_at >= p_start_date)
    AND (p_end_date IS NULL OR g.created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION get_user_generation_stats_filtered(UUID[], UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_generation_stats_filtered(UUID[], UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO service_role;
GRANT EXECUTE ON FUNCTION get_dashboard_totals_v2(UUID, UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_totals_v2(UUID, UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO service_role;
GRANT EXECUTE ON FUNCTION get_dashboard_today_stats_v2(UUID, UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_today_stats_v2(UUID, UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO service_role;

-- Comments
COMMENT ON FUNCTION get_user_generation_stats_filtered IS 'Get generation count and total cost for multiple users with date range filtering';
COMMENT ON FUNCTION get_dashboard_totals_v2 IS 'Get total generations, cost and failed count for dashboard with date range filtering';
COMMENT ON FUNCTION get_dashboard_today_stats_v2 IS 'Get today stats for dashboard with date range filtering';

-- Function 4: Get generation counts for multiple workspaces at once
-- Used for the workspaces list view to show generation counts
CREATE OR REPLACE FUNCTION get_workspaces_generation_counts(p_workspace_ids UUID[])
RETURNS TABLE (
  workspace_id UUID,
  generations_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.workspace_id,
    COUNT(*)::BIGINT as generations_count
  FROM generations g
  WHERE 
    g.workspace_id = ANY(p_workspace_ids)
    AND (g.is_keyframe_segment IS NOT TRUE)
  GROUP BY g.workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION get_workspaces_generation_counts(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspaces_generation_counts(UUID[]) TO service_role;

COMMENT ON FUNCTION get_workspaces_generation_counts IS 'Get generation counts for multiple workspaces in one query';






