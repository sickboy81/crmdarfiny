-- Migration: 035_add_openrouter_provider.sql
-- Description: Updates the check constraint on ai_configs table to allow 'openrouter' provider.

ALTER TABLE ai_configs DROP CONSTRAINT IF EXISTS ai_configs_provider_check;
ALTER TABLE ai_configs ADD CONSTRAINT ai_configs_provider_check CHECK (provider IN ('openai', 'anthropic', 'openrouter'));
