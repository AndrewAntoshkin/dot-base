-- Migration: Add ideas and votes tables for Roadmap feature
-- Created: 2024-12-24

-- Table for storing ideas (anonymous)
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  votes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking votes (to prevent double voting)
CREATE TABLE IF NOT EXISTS idea_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(idea_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_votes_count ON ideas(votes_count DESC);
CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON idea_votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_user_id ON idea_votes(user_id);

-- RLS policies
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_votes ENABLE ROW LEVEL SECURITY;

-- Ideas: everyone can read
CREATE POLICY "Ideas are viewable by everyone" ON ideas
  FOR SELECT USING (true);

-- Ideas: everyone can create (anonymous)
CREATE POLICY "Anyone can create ideas" ON ideas
  FOR INSERT WITH CHECK (true);

-- Votes: authenticated users can read their own votes
CREATE POLICY "Users can view their own votes" ON idea_votes
  FOR SELECT USING (auth.uid() = user_id);

-- Votes: authenticated users can create votes
CREATE POLICY "Authenticated users can vote" ON idea_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Votes: users can delete their own votes (unvote)
CREATE POLICY "Users can remove their votes" ON idea_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update votes_count when vote is added/removed
CREATE OR REPLACE FUNCTION update_idea_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ideas SET votes_count = votes_count + 1, updated_at = NOW()
    WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ideas SET votes_count = votes_count - 1, updated_at = NOW()
    WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for votes count
DROP TRIGGER IF EXISTS trigger_update_idea_votes_count ON idea_votes;
CREATE TRIGGER trigger_update_idea_votes_count
  AFTER INSERT OR DELETE ON idea_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_votes_count();

