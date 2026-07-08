-- ============================================================
-- MIGRATIONS 037 + 038 + 039: Pipeline Trello Features
-- Execute este arquivo único no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 038: Add color column to deals for custom card colors
-- ============================================================
ALTER TABLE deals ADD COLUMN IF NOT EXISTS color TEXT;

-- ============================================================
-- 037: Deal labels, checklists and activity timeline
-- ============================================================

-- DEAL LABELS
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

-- DEAL CHECKLISTS
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

-- DEAL CHECKLIST ITEMS
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

-- DEAL ACTIVITIES (comments + system logs)
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

-- ============================================================
-- 039: Deal attachments (files, images, documents)
-- ============================================================

-- deal_attachments table
CREATE TABLE IF NOT EXISTS deal_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_attachments_deal ON deal_attachments(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_attachments_account ON deal_attachments(account_id);

ALTER TABLE deal_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_attachments_select ON deal_attachments;
DROP POLICY IF EXISTS deal_attachments_insert ON deal_attachments;
DROP POLICY IF EXISTS deal_attachments_delete ON deal_attachments;

CREATE POLICY deal_attachments_select ON deal_attachments FOR SELECT USING (is_account_member(account_id));
CREATE POLICY deal_attachments_insert ON deal_attachments FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY deal_attachments_delete ON deal_attachments FOR DELETE USING (is_account_member(account_id, 'agent'));

-- deal-attachments storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deal-attachments',
  'deal-attachments',
  TRUE,
  20971520,
  ARRAY[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS
DROP POLICY IF EXISTS "Deal attachments publicly readable" ON storage.objects;
CREATE POLICY "Deal attachments publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deal-attachments');

DROP POLICY IF EXISTS "Deal attachments account insert" ON storage.objects;
CREATE POLICY "Deal attachments account insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'deal-attachments'
    AND (storage.foldername(name))[1] = 'account-' || auth.uid()::text
  );

DROP POLICY IF EXISTS "Deal attachments account delete" ON storage.objects;
CREATE POLICY "Deal attachments account delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'deal-attachments'
    AND (storage.foldername(name))[1] = 'account-' || auth.uid()::text
  );
