-- ============================================================================
-- Recurring rules — additive migration
-- ----------------------------------------------------------------------------
--   * recurring_rules: scheduled expenses & income with cadence config.
--   * expenses.recurring_id / income_entries.recurring_id back-references.
--   * materialize_recurring(p_through): per-caller idempotent generator.
--   * upcoming_recurring_30d view.
-- ============================================================================

-- ============================================================================
-- recurring_rules
-- ============================================================================
create table if not exists public.recurring_rules (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  kind            text not null check (kind in ('expense','income')),
  category_id     uuid references public.categories(id) on delete set null,
  source_id       uuid references public.income_sources(id) on delete set null,
  amount_cents    bigint not null check (amount_cents > 0),
  currency        text not null default 'USD'
                    check (char_length(currency) = 3),
  description     text check (description is null or char_length(description) <= 120),
  cadence         text not null check (cadence in ('weekly','biweekly','monthly','yearly')),
  interval_count  int not null default 1 check (interval_count between 1 and 24),
  day_of_month    int check (day_of_month is null or day_of_month between 1 and 31),
  weekday         int check (weekday is null or weekday between 0 and 6),
  start_date      date not null,
  end_date        date check (end_date is null or end_date >= start_date),
  next_run_date   date not null,
  is_paused       boolean not null default false,
  is_subscription boolean not null default false,
  vendor          text check (vendor is null or char_length(vendor) <= 80),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.recurring_rules enable row level security;

drop policy if exists "recurring_rules_select_own" on public.recurring_rules;
create policy "recurring_rules_select_own"
  on public.recurring_rules for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "recurring_rules_insert_own" on public.recurring_rules;
create policy "recurring_rules_insert_own"
  on public.recurring_rules for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = recurring_rules.category_id and c.user_id = (select auth.uid())
      )
    )
    and (
      source_id is null
      or exists (
        select 1 from public.income_sources s
        where s.id = recurring_rules.source_id and s.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "recurring_rules_update_own" on public.recurring_rules;
create policy "recurring_rules_update_own"
  on public.recurring_rules for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = recurring_rules.category_id and c.user_id = (select auth.uid())
      )
    )
    and (
      source_id is null
      or exists (
        select 1 from public.income_sources s
        where s.id = recurring_rules.source_id and s.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "recurring_rules_delete_own" on public.recurring_rules;
create policy "recurring_rules_delete_own"
  on public.recurring_rules for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists recurring_rules_user_next_idx
  on public.recurring_rules (user_id, next_run_date);
create index if not exists recurring_rules_user_sub_paused_idx
  on public.recurring_rules (user_id, is_subscription, is_paused);
create index if not exists recurring_rules_category_id_idx
  on public.recurring_rules (category_id);
create index if not exists recurring_rules_source_id_idx
  on public.recurring_rules (source_id);

drop trigger if exists recurring_rules_set_updated_at on public.recurring_rules;
create trigger recurring_rules_set_updated_at
  before update on public.recurring_rules
  for each row execute function moddatetime(updated_at);

-- ============================================================================
-- back-references on expenses & income_entries
-- ============================================================================
alter table public.expenses
  add column if not exists recurring_id uuid
    references public.recurring_rules(id) on delete set null;

create index if not exists expenses_recurring_id_idx
  on public.expenses (recurring_id);

alter table public.income_entries
  add column if not exists recurring_id uuid
    references public.recurring_rules(id) on delete set null;

create index if not exists income_entries_recurring_id_idx
  on public.income_entries (recurring_id);

-- ============================================================================
-- materialize_recurring
--   Runs under caller RLS (security invoker) so only the caller's own rules
--   are visible and writable. Re-running on the same day is a no-op because
--   each row's next_run_date is advanced atomically before the loop moves on.
-- ============================================================================
create or replace function public.materialize_recurring(p_through date default current_date)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_rule   public.recurring_rules%rowtype;
  v_count  int := 0;
  v_next   date;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  for v_rule in
    select *
      from public.recurring_rules
     where user_id = v_uid
       and is_paused = false
       and next_run_date <= p_through
       and (end_date is null or next_run_date <= end_date)
     order by next_run_date asc
  loop
    if v_rule.kind = 'expense' then
      insert into public.expenses
        (user_id, category_id, amount_cents, occurred_at, note, recurring_id)
      values
        (v_rule.user_id, v_rule.category_id, v_rule.amount_cents,
         v_rule.next_run_date, v_rule.description, v_rule.id);
    elsif v_rule.kind = 'income' then
      insert into public.income_entries
        (user_id, source_id, amount_cents, received_at, note, recurring_id)
      values
        (v_rule.user_id, v_rule.source_id, v_rule.amount_cents,
         v_rule.next_run_date, v_rule.description, v_rule.id);
    end if;

    v_next := case v_rule.cadence
      when 'weekly'   then v_rule.next_run_date + (v_rule.interval_count * 7)
      when 'biweekly' then v_rule.next_run_date + (v_rule.interval_count * 14)
      when 'monthly'  then (v_rule.next_run_date + (v_rule.interval_count || ' months')::interval)::date
      when 'yearly'   then (v_rule.next_run_date + (v_rule.interval_count || ' years')::interval)::date
    end;

    update public.recurring_rules
       set next_run_date = v_next
     where id = v_rule.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.materialize_recurring(date) to authenticated;

-- ============================================================================
-- upcoming_recurring_30d view
-- ============================================================================
drop view if exists public.upcoming_recurring_30d;

create view public.upcoming_recurring_30d
with (security_invoker = on)
as
select *
  from public.recurring_rules
 where is_paused = false
   and next_run_date <= current_date + interval '30 days'
   and (end_date is null or next_run_date <= end_date);

grant select on public.upcoming_recurring_30d to authenticated;
