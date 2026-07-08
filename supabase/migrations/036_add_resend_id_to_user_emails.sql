-- Add resend_id column to user_emails for webhook tracking
ALTER TABLE public.user_emails
ADD COLUMN IF NOT EXISTS resend_id text;

-- Add index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_emails_resend_id ON user_emails(resend_id);
