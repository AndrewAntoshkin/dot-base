-- Migration: Add assistant chat history tables
-- Created: 2026-01-12
-- Description: Tables for storing AI assistant conversation history

-- Assistant conversations table (main chat sessions)
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Conversation metadata
  title TEXT,
  is_favorite BOOLEAN DEFAULT false,
  
  -- Preview data for history list
  preview_text TEXT,
  preview_image_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Assistant messages table (individual messages in conversations)
CREATE TABLE IF NOT EXISTS assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES assistant_conversations(id) ON DELETE CASCADE NOT NULL,
  
  -- Message data
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- Attached images (for user messages)
  images TEXT[],
  
  -- Context that was used
  context JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for assistant_conversations
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_id 
  ON assistant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_updated_at 
  ON assistant_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_favorite 
  ON assistant_conversations(user_id, is_favorite) WHERE is_favorite = true;

-- Indexes for assistant_messages
CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation_id 
  ON assistant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_created 
  ON assistant_messages(conversation_id, created_at);

-- Function to update conversation updated_at on new message
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE assistant_conversations 
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS assistant_message_update_conversation ON assistant_messages;
CREATE TRIGGER assistant_message_update_conversation
  AFTER INSERT ON assistant_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- Function to auto-generate conversation preview from first message
CREATE OR REPLACE FUNCTION update_conversation_preview()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE assistant_conversations 
    SET 
      preview_text = COALESCE(preview_text, LEFT(NEW.content, 150)),
      title = COALESCE(title, LEFT(NEW.content, 100)),
      preview_image_url = COALESCE(preview_image_url, NEW.images[1])
    WHERE id = NEW.conversation_id
    AND preview_text IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assistant_message_update_preview ON assistant_messages;
CREATE TRIGGER assistant_message_update_preview
  AFTER INSERT ON assistant_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_preview();
