-- ============================================================================
-- Notifications — additive migration
-- ----------------------------------------------------------------------------
-- Caller supplies a `dedupe_key` (e.g. "budget_exceeded:cat_id:2025-01") so the
-- same alert can't be created twice for the same user/period; enforced by the
-- (user_id, dedupe_key) unique constraint.
-- ============================================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (char_length(kind) between 1 and 60),
  payload     jsonb not null default '{}'::jsonb,
  severity    text not null default 'info'
                check (severity in ('info','warning','critical')),
  is_read     boolean not null default false,
  created_at  timestamptz not null default now(),
  dedupe_key  text not null,
  unique (user_id, dedupe_key)
);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own"
  on public.notifications for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read, created_at desc);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
