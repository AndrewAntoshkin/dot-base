-- Migration: Add functions for admin dashboard stats
-- These functions properly aggregate data without the 1000 row limit

-- Function 1: Get generation stats per user
CREATE OR REPLACE FUNCTION get_user_generation_stats(p_user_ids UUID[])
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
    COALESCE(SUM(g.cost_usd), 0)::NUMERIC as total_cost_usd
  FROM generations g
  WHERE g.user_id = ANY(p_user_ids)
  GROUP BY g.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get total dashboard stats (aggregated)
CREATE OR REPLACE FUNCTION get_dashboard_totals(
  p_workspace_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
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
    AND (p_user_id IS NULL OR g.user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Get today's stats
CREATE OR REPLACE FUNCTION get_dashboard_today_stats(
  p_workspace_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
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
    AND (p_user_id IS NULL OR g.user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION get_user_generation_stats(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_generation_stats(UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION get_dashboard_totals(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_totals(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_dashboard_today_stats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_today_stats(UUID, UUID) TO service_role;

COMMENT ON FUNCTION get_user_generation_stats IS 'Get generation count and total cost for multiple users';
COMMENT ON FUNCTION get_dashboard_totals IS 'Get total generations, cost and failed count for dashboard';
COMMENT ON FUNCTION get_dashboard_today_stats IS 'Get today stats for dashboard';
