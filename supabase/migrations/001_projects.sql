-- 001_projects.sql
-- Projects table and Row Level Security policies for optional Supabase cloud sync.

create table if not exists public.projects (
  id text primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  version integer not null default 1,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_owner_updated
  on public.projects (owner_id, updated_at desc);

alter table public.projects enable row level security;

-- Authenticated users can read their own projects
create policy "Users can view own projects"
  on public.projects
  for select
  to authenticated
  using (auth.uid() = owner_id);

-- Authenticated users can insert their own projects
create policy "Users can insert own projects"
  on public.projects
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

-- Authenticated users can update their own projects
create policy "Users can update own projects"
  on public.projects
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Authenticated users can delete their own projects
create policy "Users can delete own projects"
  on public.projects
  for delete
  to authenticated
  using (auth.uid() = owner_id);
