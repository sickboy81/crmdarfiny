-- ============================================================
-- 040: Extended Trello features
-- description, cover, archive, board background, templates
-- ============================================================

-- ============================================================
-- 1. Deals: add description, cover_url, archived
-- ============================================================
ALTER TABLE deals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering archived deals
CREATE INDEX IF NOT EXISTS idx_deals_archived ON deals(archived) WHERE archived = false;

-- ============================================================
-- 2. Pipelines: add board_background
-- ============================================================
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS board_background TEXT;

-- ============================================================
-- 3. Deal templates table
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  checklist_items TEXT[], -- array of checklist item texts
  label_names TEXT[],     -- array of label names to auto-create
  label_colors TEXT[],    -- parallel array of label colors
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_templates_account ON deal_templates(account_id);

ALTER TABLE deal_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_templates_select ON deal_templates;
DROP POLICY IF EXISTS deal_templates_insert ON deal_templates;
DROP POLICY IF EXISTS deal_templates_update ON deal_templates;
DROP POLICY IF EXISTS deal_templates_delete ON deal_templates;

CREATE POLICY deal_templates_select ON deal_templates FOR SELECT USING (is_account_member(account_id));
CREATE POLICY deal_templates_insert ON deal_templates FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY deal_templates_update ON deal_templates FOR UPDATE USING (is_account_member(account_id, 'agent'));
CREATE POLICY deal_templates_delete ON deal_templates FOR DELETE USING (is_account_member(account_id, 'agent'));
