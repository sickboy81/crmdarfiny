-- ============================================================
-- 041: Deal watchers
-- Track which users watch which deals for notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS deal_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_watchers_deal ON deal_watchers(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_watchers_user ON deal_watchers(user_id);

ALTER TABLE deal_watchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_watchers_select ON deal_watchers;
DROP POLICY IF EXISTS deal_watchers_insert ON deal_watchers;
DROP POLICY IF EXISTS deal_watchers_delete ON deal_watchers;

CREATE POLICY deal_watchers_select ON deal_watchers
  FOR SELECT USING (
    deal_id IN (SELECT id FROM deals WHERE is_account_member(account_id))
  );

CREATE POLICY deal_watchers_insert ON deal_watchers
  FOR INSERT WITH CHECK (
    deal_id IN (SELECT id FROM deals WHERE is_account_member(account_id))
  );

CREATE POLICY deal_watchers_delete ON deal_watchers
  FOR DELETE USING (
    deal_id IN (SELECT id FROM deals WHERE is_account_member(account_id))
  );
