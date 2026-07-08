const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'vowiojgsgbsqmknfyrbe';
const TOKEN_FILE = path.join(__dirname, '..', '..', 'CRM Whatsapp', 'sb_token.txt');
let ACCESS_TOKEN = process.argv[2];
if (!ACCESS_TOKEN && fs.existsSync(TOKEN_FILE)) {
  ACCESS_TOKEN = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
}

if (!ACCESS_TOKEN) {
  console.log('No access token found.');
  process.exit(1);
}

async function runSQL(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.substring(0, 500)}`);
  return text;
}

// Fixed migration 006: automations WITHOUT FK to contacts(id) (TEXT type)
const fix006 = `
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_active_trigger ON automations(trigger_type) WHERE is_active = TRUE;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own automations" ON automations;
CREATE POLICY "Users can manage own automations" ON automations FOR ALL USING (auth.uid() = user_id);
DROP TRIGGER IF EXISTS set_updated_at ON automations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON automations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS automation_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  parent_step_id UUID REFERENCES automation_steps(id) ON DELETE CASCADE,
  branch TEXT CHECK (branch IN ('yes', 'no')),
  step_type TEXT NOT NULL,
  step_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_steps_automation_id ON automation_steps(automation_id, position);
CREATE INDEX IF NOT EXISTS idx_automation_steps_parent ON automation_steps(parent_step_id) WHERE parent_step_id IS NOT NULL;
ALTER TABLE automation_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage steps of own automations" ON automation_steps;
CREATE POLICY "Users can manage steps of own automations" ON automation_steps FOR ALL USING (EXISTS (SELECT 1 FROM automations a WHERE a.id = automation_steps.automation_id AND a.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  trigger_event TEXT NOT NULL,
  steps_executed JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON automation_logs(automation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_user ON automation_logs(user_id);
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own automation logs" ON automation_logs;
CREATE POLICY "Users can view own automation logs" ON automation_logs FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS automation_pending_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  log_id UUID REFERENCES automation_logs(id) ON DELETE CASCADE,
  parent_step_id UUID REFERENCES automation_steps(id) ON DELETE SET NULL,
  branch TEXT CHECK (branch IN ('yes', 'no')),
  next_step_position INTEGER NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  run_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_pending_due ON automation_pending_executions(run_at) WHERE status = 'pending';
ALTER TABLE automation_pending_executions ENABLE ROW LEVEL SECURITY;
`;

// Fixed migration 009: messages reply_to + reactions WITHOUT FK on messages(id) (TEXT type)
const fix009 = `
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_message_id TEXT REFERENCES messages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('customer', 'agent')),
  actor_id UUID,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, actor_type, actor_id)
);
CREATE INDEX IF NOT EXISTS idx_message_reactions_conversation ON message_reactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see reactions on their conversations" ON message_reactions;
CREATE POLICY "Users see reactions on their conversations" ON message_reactions FOR SELECT USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = message_reactions.conversation_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users insert reactions on their conversations" ON message_reactions;
CREATE POLICY "Users insert reactions on their conversations" ON message_reactions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM conversations c WHERE c.id = message_reactions.conversation_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users delete their own agent reactions" ON message_reactions;
CREATE POLICY "Users delete their own agent reactions" ON message_reactions FOR DELETE USING (actor_type = 'agent' AND actor_id = auth.uid() AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = message_reactions.conversation_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users update their own agent reactions" ON message_reactions;
CREATE POLICY "Users update their own agent reactions" ON message_reactions FOR UPDATE USING (actor_type = 'agent' AND actor_id = auth.uid() AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = message_reactions.conversation_id AND c.user_id = auth.uid()));
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions') THEN ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions; END IF; END $$;
`;

async function main() {
  const fixes = [
    { name: '006_automations (fixed)', sql: fix006 },
    { name: '009_message_actions (fixed)', sql: fix009 },
  ];

  for (const fix of fixes) {
    process.stdout.write(`  RUN   ${fix.name} ... `);
    try {
      await runSQL(fix.sql);
      console.log('OK');
    } catch (err) {
      const msg = err.message;
      if (msg.includes('already exists')) {
        console.log('SKIP (already applied)');
      } else {
        console.log(`FAIL\n        ${msg.substring(0, 400)}`);
      }
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
