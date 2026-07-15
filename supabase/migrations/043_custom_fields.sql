-- ============================================================
-- 043: Custom fields for pipelines
-- ============================================================

-- Field definitions per pipeline
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'number', 'date', 'select', 'boolean'
  options JSONB, -- for select type: ["Option 1", "Option 2"]
  position INT NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_field_defs_pipeline ON custom_field_definitions(pipeline_id);

ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cfd_select ON custom_field_definitions;
DROP POLICY IF EXISTS cfd_insert ON custom_field_definitions;
DROP POLICY IF EXISTS cfd_update ON custom_field_definitions;
DROP POLICY IF EXISTS cfd_delete ON custom_field_definitions;

CREATE POLICY cfd_select ON custom_field_definitions
  FOR SELECT USING (is_account_member(account_id));
CREATE POLICY cfd_insert ON custom_field_definitions
  FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY cfd_update ON custom_field_definitions
  FOR UPDATE USING (is_account_member(account_id, 'agent'));
CREATE POLICY cfd_delete ON custom_field_definitions
  FOR DELETE USING (is_account_member(account_id, 'agent'));

-- Field values per deal
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  field_definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, field_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_values_deal ON custom_field_values(deal_id);

ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cfv_select ON custom_field_values;
DROP POLICY IF EXISTS cfv_insert ON custom_field_values;
DROP POLICY IF EXISTS cfv_update ON custom_field_values;
DROP POLICY IF EXISTS cfv_delete ON custom_field_values;

CREATE POLICY cfv_select ON custom_field_values
  FOR SELECT USING (
    deal_id IN (SELECT id FROM deals WHERE is_account_member(account_id))
  );
CREATE POLICY cfv_insert ON custom_field_values
  FOR INSERT WITH CHECK (
    deal_id IN (SELECT id FROM deals WHERE is_account_member(account_id, 'agent'))
  );
CREATE POLICY cfv_update ON custom_field_values
  FOR UPDATE USING (
    deal_id IN (SELECT id FROM deals WHERE is_account_member(account_id, 'agent'))
  );
CREATE POLICY cfv_delete ON custom_field_values
  FOR DELETE USING (
    deal_id IN (SELECT id FROM deals WHERE is_account_member(account_id, 'agent'))
  );
