-- ============================================================
-- 039: Deal attachments (files, images, documents)
-- ============================================================

-- ============================================================
-- 1. deal_attachments table
-- ============================================================
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

-- ============================================================
-- 2. deal-attachments storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deal-attachments',
  'deal-attachments',
  TRUE,
  20971520, -- 20 MB
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

-- ============================================================
-- 3. Storage RLS — account-scoped writes, public reads
-- ============================================================
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
