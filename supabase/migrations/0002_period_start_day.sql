-- Custom pay-cycle periods.
--
-- Adds a per-user `period_start_day` to profiles (1-28). Defines a
-- `public.period_of(date, smallint)` function that mirrors the TS
-- `periodOf()` in `lib/period.ts`. Rewrites the `monthly_totals` and
-- `monthly_income_totals` views to bucket by the user's period instead of
-- the calendar month, so historical aggregations re-bucket automatically
-- when the setting changes.
--
-- Run with: `supabase db push`.

-- ---------------------------------------------------------------------------
-- 1. Column on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists period_start_day smallint not null default 1
  check (period_start_day between 1 and 28);

-- ---------------------------------------------------------------------------
-- 2. period_of(date, smallint) — pure function
-- ---------------------------------------------------------------------------
create or replace function public.period_of(d date, start_day smallint)
returns date
language sql
immutable
parallel safe
as $$
  select date_trunc(
    'month',
    case when extract(day from d)::int >= greatest(1, least(28, start_day::int))
      then (d + interval '1 month')::date
      else d
    end
  )::date;
$$;

-- ---------------------------------------------------------------------------
-- 3. monthly_totals view — rewritten to honor period_start_day
-- ---------------------------------------------------------------------------
drop view if exists public.monthly_totals;
create view public.monthly_totals
with (security_invoker = true)
as
select
  e.user_id,
  public.period_of(e.occurred_at, coalesce(p.period_start_day, 1::smallint)) as month,
  e.category_id,
  sum(e.amount_cents)::bigint as total_cents,
  count(*)::bigint as transactions
from public.expenses e
left join public.profiles p on p.id = e.user_id
group by e.user_id, public.period_of(e.occurred_at, coalesce(p.period_start_day, 1::smallint)), e.category_id;

-- ---------------------------------------------------------------------------
-- 4. monthly_income_totals view
-- ---------------------------------------------------------------------------
drop view if exists public.monthly_income_totals;
create view public.monthly_income_totals
with (security_invoker = true)
as
select
  i.user_id,
  i.applies_to_month as month,
  sum(i.amount_cents)::bigint as total_cents,
  count(*)::bigint as entries
from public.income_entries i
group by i.user_id, i.applies_to_month;

-- ---------------------------------------------------------------------------
-- 5. recompute_income_periods(p_start_day smallint)
-- ---------------------------------------------------------------------------
create or replace function public.recompute_income_periods(p_start_day smallint)
returns integer
language plpgsql
security invoker
as $$
declare
  v_count integer;
begin
  if p_start_day is null or p_start_day < 1 or p_start_day > 28 then
    raise exception 'period_start_day must be between 1 and 28';
  end if;

  update public.income_entries
    set applies_to_month = public.period_of(received_at, p_start_day)
    where user_id = auth.uid();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.period_of(date, smallint) to anon, authenticated;
grant execute on function public.recompute_income_periods(smallint) to authenticated;
