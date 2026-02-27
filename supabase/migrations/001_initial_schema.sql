-- Subscribers: one row per lead captured
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text,
  hospital text,
  city text,
  state text,
  source text,
  status text not null default 'pending', -- pending / active / unsubscribed / bounced
  lead_score int not null default 0,
  confirmation_token uuid default gen_random_uuid(),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Emails: one row per newsletter edition
create table emails (
  id uuid primary key default gen_random_uuid(),
  subject text,
  preview_text text,
  content_html text,
  model_outputs jsonb, -- stores all 3 model outputs + evaluator justification
  winning_model text,
  evaluator_justification text,
  status text not null default 'draft', -- draft / scheduled / sent
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Email events: one row per open/click/unsubscribe/bounce
create table email_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references subscribers(id) on delete cascade,
  email_id uuid references emails(id) on delete cascade,
  event_type text not null, -- open / click / unsubscribe / bounce
  url_clicked text,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index on subscribers(lead_score desc);
create index on subscribers(status);
create index on email_events(subscriber_id);
create index on email_events(email_id);
create index on email_events(event_type);

-- Row Level Security: block all direct client access (all writes go through server-side API routes)
alter table subscribers enable row level security;
alter table emails enable row level security;
alter table email_events enable row level security;
