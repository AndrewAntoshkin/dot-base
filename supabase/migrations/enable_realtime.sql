-- Enable Real-time for generations table
-- This allows clients to subscribe to changes in real-time

-- Add generations table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE generations;

-- Note: If you get an error that the table is already part of the publication,
-- that means real-time is already enabled.










