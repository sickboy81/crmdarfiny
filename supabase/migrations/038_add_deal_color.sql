-- ============================================================
-- 038: Add color column to deals for custom card colors
-- ============================================================
ALTER TABLE deals ADD COLUMN IF NOT EXISTS color TEXT;
