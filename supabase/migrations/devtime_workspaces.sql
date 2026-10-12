-- Devtime 2.0: apply ONLY to a dedicated Supabase project.
-- This migration is deliberately not run against unrelated existing projects.
-- All workspace data is private to the authenticated owner.

create table if not exists public.devtime_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  revision bigint not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now(),
  constraint devtime_workspace_is_object
    check (jsonb_typeof(snapshot) = 'object'),
  constraint devtime_workspace_size
    check (octet_length(snapshot::text) <= 1000000)
);

alter table public.devtime_workspaces enable row level security;

revoke all on table public.devtime_workspaces from public, anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.devtime_workspaces to authenticated;

drop policy if exists "devtime_select_own" on public.devtime_workspaces;
create policy "devtime_select_own" on public.devtime_workspaces
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "devtime_insert_own" on public.devtime_workspaces;
create policy "devtime_insert_own" on public.devtime_workspaces
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "devtime_update_own" on public.devtime_workspaces;
create policy "devtime_update_own" on public.devtime_workspaces
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "devtime_delete_own" on public.devtime_workspaces;
create policy "devtime_delete_own" on public.devtime_workspaces
  for delete to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.devtime_workspaces is
  'Private per-user Devtime snapshots, using explicit client-side revision compare-and-swap.';
