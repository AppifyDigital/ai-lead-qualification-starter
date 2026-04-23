-- Lead qualification demo schema.
-- Tables: team_members, leads, calls, routing_decisions.
-- All tables use snake_case; the app layer maps to the camelCase UI types.

create extension if not exists "pgcrypto";

create type lead_stage    as enum ('New', 'Contacted', 'Qualified', 'In review');
create type language      as enum ('English', 'Spanish', 'Korean', 'German', 'Mandarin');
create type member_status as enum ('available', 'on-call', 'away', 'offline');
create type call_status   as enum ('queued', 'in-progress', 'completed', 'failed');

create table team_members (
  id            text primary key,
  name          text not null,
  initials      text not null,
  role          text not null,
  email         text not null unique,
  languages     language[] not null default '{}',
  active_leads  int not null default 0,
  status        member_status not null default 'offline',
  created_at    timestamptz not null default now()
);

create table leads (
  id              text primary key default ('ld_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  name            text not null,
  email           text not null,
  phone           text not null,
  zip             text not null,
  amount          int not null,
  term_months     int,
  language        language not null default 'English',
  purpose         text,
  stage           lead_stage not null default 'New',
  score           int not null default 0,
  assignee_id     text references team_members(id) on delete set null,
  received_at     timestamptz not null default now(),
  is_new          boolean not null default true
);

create index leads_received_at_idx on leads (received_at desc);
create index leads_stage_idx       on leads (stage);

create table calls (
  id              uuid primary key default gen_random_uuid(),
  lead_id         text not null references leads(id) on delete cascade,
  vapi_call_id    text unique,
  status          call_status not null default 'queued',
  duration_sec    int,
  language        language,
  transcript      jsonb,          -- TranscriptLine[]: [{ t, who, text }]
  summary         text,
  summary_tail    text,
  estimated_income text,
  extracted_data  jsonb,          -- { confirmedAmount, repaymentPeriodMonths, employmentStatus, loanPurpose, qualificationScore, recommendedNextAction }
  started_at      timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz not null default now()
);

create index calls_lead_id_idx on calls (lead_id);

create table routing_decisions (
  id            uuid primary key default gen_random_uuid(),
  lead_id       text not null references leads(id) on delete cascade,
  assignee_id   text references team_members(id) on delete set null,
  reasoning     text not null,
  created_at    timestamptz not null default now()
);

create index routing_decisions_lead_id_idx on routing_decisions (lead_id, created_at desc);

-- Keep leads.assignee_id in sync with the latest routing decision via app code,
-- not a trigger — so the demo is inspectable.

-- Realtime: enable on leads, calls, routing_decisions.
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table calls;
alter publication supabase_realtime add table routing_decisions;

-- RLS: the CRM uses the service role on the server.
-- We still enable RLS so anon clients (realtime subscribers) can only read.
alter table leads              enable row level security;
alter table calls              enable row level security;
alter table team_members       enable row level security;
alter table routing_decisions  enable row level security;

create policy "read leads (anon)"        on leads              for select using (true);
create policy "read calls (anon)"        on calls              for select using (true);
create policy "read team (anon)"         on team_members       for select using (true);
create policy "read routing (anon)"      on routing_decisions  for select using (true);
