-- ============================================================
-- 037: Deal labels, checklists and activity timeline
-- ============================================================

-- ============================================================
-- DEAL LABELS
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_labels_deal ON deal_labels(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_labels_account ON deal_labels(account_id);

ALTER TABLE deal_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_labels_select ON deal_labels;
DROP POLICY IF EXISTS deal_labels_insert ON deal_labels;
DROP POLICY IF EXISTS deal_labels_update ON deal_labels;
DROP POLICY IF EXISTS deal_labels_delete ON deal_labels;

CREATE POLICY deal_labels_select ON deal_labels FOR SELECT USING (is_account_member(account_id));
CREATE POLICY deal_labels_insert ON deal_labels FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY deal_labels_update ON deal_labels FOR UPDATE USING (is_account_member(account_id, 'agent'));
CREATE POLICY deal_labels_delete ON deal_labels FOR DELETE USING (is_account_member(account_id, 'agent'));

-- ============================================================
-- DEAL CHECKLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_checklists_deal ON deal_checklists(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_checklists_account ON deal_checklists(account_id);

ALTER TABLE deal_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_checklists_select ON deal_checklists;
DROP POLICY IF EXISTS deal_checklists_insert ON deal_checklists;
DROP POLICY IF EXISTS deal_checklists_update ON deal_checklists;
DROP POLICY IF EXISTS deal_checklists_delete ON deal_checklists;

CREATE POLICY deal_checklists_select ON deal_checklists FOR SELECT USING (is_account_member(account_id));
CREATE POLICY deal_checklists_insert ON deal_checklists FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY deal_checklists_update ON deal_checklists FOR UPDATE USING (is_account_member(account_id, 'agent'));
CREATE POLICY deal_checklists_delete ON deal_checklists FOR DELETE USING (is_account_member(account_id, 'agent'));

-- ============================================================
-- DEAL CHECKLIST ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES deal_checklists(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_checklist_items_checklist ON deal_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_deal_checklist_items_account ON deal_checklist_items(account_id);

ALTER TABLE deal_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_checklist_items_select ON deal_checklist_items;
DROP POLICY IF EXISTS deal_checklist_items_insert ON deal_checklist_items;
DROP POLICY IF EXISTS deal_checklist_items_update ON deal_checklist_items;
DROP POLICY IF EXISTS deal_checklist_items_delete ON deal_checklist_items;

CREATE POLICY deal_checklist_items_select ON deal_checklist_items FOR SELECT USING (is_account_member(account_id));
CREATE POLICY deal_checklist_items_insert ON deal_checklist_items FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY deal_checklist_items_update ON deal_checklist_items FOR UPDATE USING (is_account_member(account_id, 'agent'));
CREATE POLICY deal_checklist_items_delete ON deal_checklist_items FOR DELETE USING (is_account_member(account_id, 'agent'));

-- ============================================================
-- DEAL ACTIVITIES (comments + system logs)
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL DEFAULT 'comment' CHECK (activity_type IN ('comment', 'system')),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_activities_deal ON deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_account ON deal_activities(account_id);

ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_activities_select ON deal_activities;
DROP POLICY IF EXISTS deal_activities_insert ON deal_activities;
DROP POLICY IF EXISTS deal_activities_update ON deal_activities;
DROP POLICY IF EXISTS deal_activities_delete ON deal_activities;

CREATE POLICY deal_activities_select ON deal_activities FOR SELECT USING (is_account_member(account_id));
CREATE POLICY deal_activities_insert ON deal_activities FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY deal_activities_update ON deal_activities FOR UPDATE USING (is_account_member(account_id, 'agent'));
CREATE POLICY deal_activities_delete ON deal_activities FOR DELETE USING (is_account_member(account_id, 'agent'));
