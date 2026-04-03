-- Run once in Supabase → SQL Editor → New query → paste → Run
-- Keeps data when your web host restarts (free JSON file on disk usually does not).

create table if not exists public.reports (
  id text primary key,
  office_id text not null,
  college text not null default '',
  major text not null default '',
  crowd_level text not null,
  wait_minutes int not null default 0,
  comment text not null default '',
  reason text not null,
  created_at bigint not null
);

create index if not exists reports_created_at_idx on public.reports (created_at desc);

alter table public.reports enable row level security;
-- Service role (used only on your server) bypasses RLS. Public access stays blocked.
