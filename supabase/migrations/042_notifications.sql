-- ============================================================
-- 042: Notifications table
-- Real notifications for comments, mentions, etc.
-- ============================================================

-- Create table (skip if exists)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'comment',
  title TEXT NOT NULL,
  body TEXT,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table already existed with old "read" column, rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'read'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE notifications RENAME COLUMN "read" TO is_read;
  END IF;
END $$;

-- Indexes (safe to re-run)
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_deal ON notifications(deal_id);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select ON notifications;
DROP POLICY IF EXISTS notifications_insert ON notifications;
DROP POLICY IF EXISTS notifications_update ON notifications;
DROP POLICY IF EXISTS notifications_delete ON notifications;

CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_insert ON notifications
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE id = account_id AND is_account_member(account_id))
  );

CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY notifications_delete ON notifications
  FOR DELETE USING (user_id = auth.uid());
