-- Migration: Add notifications system
-- Created: 2026-01-28

-- Table for user notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('support_reply', 'update', 'announcement')),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Only service role can insert notifications (from API)
CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Function to get unread notifications count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE user_id = p_user_id AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notifications with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  link VARCHAR(500),
  is_read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.link,
    n.is_read,
    n.created_at,
    n.metadata
  FROM notifications n
  WHERE n.user_id = p_user_id
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
