-- supabase/migrations/002_telegram_approval.sql
ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS approval_status TEXT
    CHECK (approval_status IN ('pending_approval','pending_feedback','approved','sent','skipped')),
  ADD COLUMN IF NOT EXISTS approval_feedback TEXT,
  ADD COLUMN IF NOT EXISTS preview_token UUID,
  ADD COLUMN IF NOT EXISTS preview_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT,
  ADD COLUMN IF NOT EXISTS send_immediately BOOLEAN NOT NULL DEFAULT FALSE;

-- Fast lookup of drafts awaiting action
CREATE INDEX IF NOT EXISTS emails_approval_active
  ON emails(approval_status)
  WHERE approval_status IN ('pending_approval', 'pending_feedback');
