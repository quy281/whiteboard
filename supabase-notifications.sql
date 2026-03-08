-- ════════════════════════════════════════════════════════════
-- Migration: Add password to boards + notifications table
-- Run this in your Supabase SQL Editor
-- ════════════════════════════════════════════════════════════

-- 1. Add password column to boards
ALTER TABLE boards ADD COLUMN IF NOT EXISTS password text DEFAULT NULL;

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info', -- 'activity' | 'info'
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 3. Add status column to project_members if not exists
-- (for invitation accept/decline flow)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_members' AND column_name = 'status'
  ) THEN
    ALTER TABLE project_members ADD COLUMN status text DEFAULT 'accepted';
  END IF;
END $$;

-- Index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
