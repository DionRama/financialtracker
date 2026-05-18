-- ============================================================================
-- Financial Tracker — initial schema
-- ----------------------------------------------------------------------------
-- Single, self-contained migration.
-- Apply once via Supabase SQL editor (or `supabase db push`).
--
-- What this file does:
--   * Enables required extensions.
--   * Creates 4 tables: profiles, categories, expenses, budgets.
--   * Enables Row Level Security and writes explicit owner-only policies
--     for SELECT / INSERT / UPDATE / DELETE on every table.
--   * Adds indexes on policy columns and common query paths.
--   * Adds updated_at triggers via moddatetime.
--   * Creates a trigger on auth.users that seeds a profile + a starter
--     pack of categories whenever a new user signs up.
--   * Creates a `monthly_totals` view with security_invoker so RLS
--     applies through it.
--
-- Money is stored as integer cents in BIGINT columns. Never use floats.
--
-- Performance & security audit applied (per supabase-postgres-best-practices):
--   * RLS policies wrap auth.uid() in (select auth.uid()) so the function
--     is evaluated once per query instead of once per row (5-10x faster).
--   * Every policy is scoped `to authenticated`.
--   * Every foreign-key column has its own index so ON DELETE CASCADE /
--     SET NULL can use an index instead of a sequential scan.
--   * The expenses hot index uses INCLUDE so the dashboard / budget
--     aggregations can run as index-only scans.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "moddatetime";

-- ============================================================================
-- profiles
-- ============================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  currency     text not null default 'USD'
                check (char_length(currency) between 3 and 3),
  locale       text not null default 'en-US'
                check (char_length(locale) between 2 and 16),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using ((select auth.uid()) = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function moddatetime(updated_at);

-- ============================================================================
-- categories
-- ============================================================================
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  color        text not null default '#94a3b8'
                check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon         text not null default 'tag'
                check (char_length(icon) between 1 and 40),
  is_archived  boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;

drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own"
  on public.categories for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own"
  on public.categories for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own"
  on public.categories for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own"
  on public.categories for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists categories_user_id_idx
  on public.categories (user_id);
create index if not exists categories_user_archived_idx
  on public.categories (user_id, is_archived);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function moddatetime(updated_at);

-- ============================================================================
-- expenses
-- ============================================================================
create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  category_id   uuid references public.categories(id) on delete set null,
  amount_cents  bigint not null check (amount_cents > 0),
  occurred_at   date not null default (now() at time zone 'utc')::date,
  note          text check (note is null or char_length(note) <= 280),
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.expenses enable row level security;

drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own"
  on public.expenses for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own"
  on public.expenses for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = expenses.category_id and c.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own"
  on public.expenses for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = expenses.category_id and c.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own"
  on public.expenses for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Hot path: list / aggregate a user's expenses for a month range.
-- INCLUDE turns dashboard & budget rollups into index-only scans.
create index if not exists expenses_user_occurred_idx
  on public.expenses (user_id, occurred_at desc)
  include (amount_cents, category_id);
-- Standalone FK index so ON DELETE SET NULL from categories
-- uses an index instead of a sequential scan over expenses.
create index if not exists expenses_category_id_idx
  on public.expenses (category_id);
create index if not exists expenses_user_category_idx
  on public.expenses (user_id, category_id);
create index if not exists expenses_user_created_idx
  on public.expenses (user_id, created_at desc);

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function moddatetime(updated_at);

-- ============================================================================
-- budgets
-- ============================================================================
create table if not exists public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  -- always the first of the month (UTC)
  month         date not null check (extract(day from month) = 1),
  amount_cents  bigint not null check (amount_cents >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, category_id, month)
);

alter table public.budgets enable row level security;

drop policy if exists "budgets_select_own" on public.budgets;
create policy "budgets_select_own"
  on public.budgets for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "budgets_insert_own" on public.budgets;
create policy "budgets_insert_own"
  on public.budgets for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.categories c
      where c.id = budgets.category_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "budgets_update_own" on public.budgets;
create policy "budgets_update_own"
  on public.budgets for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.categories c
      where c.id = budgets.category_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "budgets_delete_own" on public.budgets;
create policy "budgets_delete_own"
  on public.budgets for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists budgets_user_month_idx
  on public.budgets (user_id, month);
create index if not exists budgets_user_category_idx
  on public.budgets (user_id, category_id);
-- Standalone FK index so ON DELETE CASCADE from categories
-- uses an index instead of a sequential scan over budgets.
create index if not exists budgets_category_id_idx
  on public.budgets (category_id);

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function moddatetime(updated_at);

-- ============================================================================
-- monthly_totals view
--   Total spend per user per month per category. security_invoker = on so
--   the view runs under the caller's RLS, never the view-owner's.
-- ============================================================================
drop view if exists public.monthly_totals;

create view public.monthly_totals
with (security_invoker = on)
as
select
  e.user_id,
  date_trunc('month', e.occurred_at)::date as month,
  e.category_id,
  sum(e.amount_cents)::bigint as total_cents,
  count(*)::bigint as transactions
from public.expenses e
group by e.user_id, date_trunc('month', e.occurred_at)::date, e.category_id;

grant select on public.monthly_totals to authenticated;

-- ============================================================================
-- New-user trigger: seed profile + starter categories
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, color, icon, sort_order) values
    (new.id, 'Groceries',           '#16a34a', 'shopping-cart',  10),
    (new.id, 'Dining',              '#f97316', 'utensils',       20),
    (new.id, 'Transport',           '#0ea5e9', 'car',            30),
    (new.id, 'Car Loan Payment',    '#dc2626', 'car-front',      35),
    (new.id, 'Loan Payment',        '#b45309', 'landmark',       36),
    (new.id, 'Credit Card Payment', '#1d4ed8', 'credit-card',    37),
    (new.id, 'Housing',             '#7c3aed', 'home',            40),
    (new.id, 'Utilities',           '#0891b2', 'plug',            50),
    (new.id, 'Entertainment',       '#ec4899', 'film',            60),
    (new.id, 'Health',              '#ef4444', 'heart',           70),
    (new.id, 'Shopping',            '#a855f7', 'shopping-bag',    80),
    (new.id, 'Travel',              '#14b8a6', 'plane',           90),
    (new.id, 'Other',               '#94a3b8', 'tag',            100)
  on conflict (user_id, name) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Done. To verify after applying:
--   select tablename, rowsecurity from pg_tables
--     where schemaname = 'public'
--       and tablename in ('profiles','categories','expenses','budgets');
--   -- all rows must show rowsecurity = true
-- ============================================================================
