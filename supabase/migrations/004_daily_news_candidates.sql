-- Daily news candidates for editor curation via Telegram
CREATE TABLE news_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  resumo TEXT NOT NULL,
  fonte TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'not_approved')),
  telegram_message_id BIGINT,
  fetched_at DATE NOT NULL DEFAULT CURRENT_DATE,
  used_in_email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup for approved, unused candidates (anti-repetition)
CREATE INDEX idx_news_candidates_approved_unused
  ON news_candidates(status, fetched_at)
  WHERE status = 'approved' AND used_in_email_id IS NULL;

-- Deduplication by title
CREATE INDEX idx_news_candidates_titulo
  ON news_candidates USING btree (titulo);

ALTER TABLE news_candidates ENABLE ROW LEVEL SECURITY;
