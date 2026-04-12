-- Rate limiting table for serverless environments
create table rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  created_at timestamptz not null default now()
);

create index idx_rate_limits_key_created on rate_limits (key, created_at desc);

-- Auto-cleanup: delete entries older than 24h (run periodically or via pg_cron)
-- For manual cleanup: DELETE FROM rate_limits WHERE created_at < now() - interval '24 hours';

alter table rate_limits enable row level security;
