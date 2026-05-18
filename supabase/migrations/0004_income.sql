-- ============================================================================
-- Income tracking — additive migration
-- ----------------------------------------------------------------------------
--   * income_sources: per-user paychecks / streams.
--   * income_entries: actual amounts received (mirrors expenses pattern).
--   * savings_goals:  optional savings targets per user.
--   * profiles.monthly_income_cents: optional baseline.
--   * monthly_income_totals view.
--
-- Idempotent: uses `if not exists` and drop/create policy + trigger guards.
-- Conventions match 0001_init.sql:
--   * RLS scoped `to authenticated` with `(select auth.uid())` wrapper.
--   * FK indexes for every reference.
--   * BIGINT cents for money.
--   * Views with security_invoker.
-- ============================================================================

-- ============================================================================
-- income_sources
-- ============================================================================
create table if not exists public.income_sources (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  name                  text not null check (char_length(name) between 1 and 60),
  kind                  text not null default 'salary'
                          check (kind in ('salary','freelance','investment','other')),
  default_amount_cents  bigint not null default 0 check (default_amount_cents >= 0),
  currency              text not null default 'USD'
                          check (char_length(currency) = 3),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.income_sources enable row level security;

drop policy if exists "income_sources_select_own" on public.income_sources;
create policy "income_sources_select_own"
  on public.income_sources for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "income_sources_insert_own" on public.income_sources;
create policy "income_sources_insert_own"
  on public.income_sources for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "income_sources_update_own" on public.income_sources;
create policy "income_sources_update_own"
  on public.income_sources for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "income_sources_delete_own" on public.income_sources;
create policy "income_sources_delete_own"
  on public.income_sources for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists income_sources_user_id_idx
  on public.income_sources (user_id);
create index if not exists income_sources_user_active_idx
  on public.income_sources (user_id, is_active);

drop trigger if exists income_sources_set_updated_at on public.income_sources;
create trigger income_sources_set_updated_at
  before update on public.income_sources
  for each row execute function moddatetime(updated_at);

-- ============================================================================
-- income_entries
-- ============================================================================
create table if not exists public.income_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  source_id     uuid references public.income_sources(id) on delete set null,
  amount_cents  bigint not null check (amount_cents > 0),
  received_at   date not null default (now() at time zone 'utc')::date,
  note          text check (note is null or char_length(note) <= 280),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.income_entries enable row level security;

drop policy if exists "income_entries_select_own" on public.income_entries;
create policy "income_entries_select_own"
  on public.income_entries for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "income_entries_insert_own" on public.income_entries;
create policy "income_entries_insert_own"
  on public.income_entries for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      source_id is null
      or exists (
        select 1 from public.income_sources s
        where s.id = income_entries.source_id and s.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "income_entries_update_own" on public.income_entries;
create policy "income_entries_update_own"
  on public.income_entries for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      source_id is null
      or exists (
        select 1 from public.income_sources s
        where s.id = income_entries.source_id and s.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "income_entries_delete_own" on public.income_entries;
create policy "income_entries_delete_own"
  on public.income_entries for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists income_entries_user_received_idx
  on public.income_entries (user_id, received_at desc)
  include (amount_cents, source_id);
create index if not exists income_entries_source_id_idx
  on public.income_entries (source_id);
create index if not exists income_entries_user_source_idx
  on public.income_entries (user_id, source_id);

drop trigger if exists income_entries_set_updated_at on public.income_entries;
create trigger income_entries_set_updated_at
  before update on public.income_entries
  for each row execute function moddatetime(updated_at);

-- ============================================================================
-- savings_goals
-- ============================================================================
create table if not exists public.savings_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  target_cents  bigint not null check (target_cents > 0),
  saved_cents   bigint not null default 0 check (saved_cents >= 0),
  deadline      date,
  color         text not null default '#16a34a'
                  check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_archived   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.savings_goals enable row level security;

drop policy if exists "savings_goals_select_own" on public.savings_goals;
create policy "savings_goals_select_own"
  on public.savings_goals for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "savings_goals_insert_own" on public.savings_goals;
create policy "savings_goals_insert_own"
  on public.savings_goals for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "savings_goals_update_own" on public.savings_goals;
create policy "savings_goals_update_own"
  on public.savings_goals for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "savings_goals_delete_own" on public.savings_goals;
create policy "savings_goals_delete_own"
  on public.savings_goals for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists savings_goals_user_id_idx
  on public.savings_goals (user_id);
create index if not exists savings_goals_user_archived_idx
  on public.savings_goals (user_id, is_archived);

drop trigger if exists savings_goals_set_updated_at on public.savings_goals;
create trigger savings_goals_set_updated_at
  before update on public.savings_goals
  for each row execute function moddatetime(updated_at);

-- ============================================================================
-- profiles.monthly_income_cents (additive)
-- ============================================================================
alter table public.profiles
  add column if not exists monthly_income_cents bigint
    check (monthly_income_cents is null or monthly_income_cents >= 0);

-- ============================================================================
-- monthly_income_totals view
-- ============================================================================
drop view if exists public.monthly_income_totals;

create view public.monthly_income_totals
with (security_invoker = on)
as
select
  user_id,
  date_trunc('month', received_at)::date as month,
  sum(amount_cents)::bigint as total_cents,
  count(*)::bigint as entries
from public.income_entries
group by 1, 2;

grant select on public.monthly_income_totals to authenticated;
