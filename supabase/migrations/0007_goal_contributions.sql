-- ============================================================================
-- Goal contributions — additive migration
-- ----------------------------------------------------------------------------
--   * goal_contributions: per-contribution ledger (positive = add, negative
--     = withdraw). Enables history, sparklines, projected completion, undo.
--   * savings_goals.emoji: optional personal emoji per goal.
--   * RPCs (security_invoker, RLS-safe):
--       contribute_to_goal(p_goal_id, p_amount_cents, p_note)
--       move_between_goals(p_from, p_to, p_amount_cents, p_note)
--       delete_contribution(p_id)
--     All three are atomic and eliminate the read-modify-write race in
--     the previous server action.
--   * Backfill: one historical contribution row per existing goal whose
--     saved_cents > 0, so sparkline / history isn't empty for legacy data.
--
-- Conventions match 0001_init.sql / 0004_income.sql:
--   * RLS scoped `to authenticated` with `(select auth.uid())` wrapper.
--   * FK indexes for every reference.
--   * BIGINT cents for money.
--   * security_invoker so RLS still applies inside functions.
-- ============================================================================

-- ============================================================================
-- savings_goals.emoji (additive)
-- ============================================================================
alter table public.savings_goals
  add column if not exists emoji text
    check (emoji is null or char_length(emoji) between 1 and 8);

-- ============================================================================
-- goal_contributions
-- ============================================================================
create table if not exists public.goal_contributions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  goal_id      uuid not null references public.savings_goals(id) on delete cascade,
  amount_cents bigint not null check (amount_cents <> 0),
  note         text check (note is null or char_length(note) between 0 and 200),
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table public.goal_contributions enable row level security;

drop policy if exists "goal_contributions_select_own" on public.goal_contributions;
create policy "goal_contributions_select_own"
  on public.goal_contributions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "goal_contributions_insert_own" on public.goal_contributions;
create policy "goal_contributions_insert_own"
  on public.goal_contributions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "goal_contributions_update_own" on public.goal_contributions;
create policy "goal_contributions_update_own"
  on public.goal_contributions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "goal_contributions_delete_own" on public.goal_contributions;
create policy "goal_contributions_delete_own"
  on public.goal_contributions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists goal_contributions_user_goal_occurred_idx
  on public.goal_contributions (user_id, goal_id, occurred_at desc);
create index if not exists goal_contributions_user_occurred_idx
  on public.goal_contributions (user_id, occurred_at desc);
create index if not exists goal_contributions_goal_id_idx
  on public.goal_contributions (goal_id);

-- ============================================================================
-- contribute_to_goal(p_goal_id, p_amount_cents, p_note)
--   * Inserts a contribution row + updates saved_cents atomically.
--   * Positive amount = add; negative amount = withdraw.
--   * security invoker: RLS on savings_goals + goal_contributions enforces
--     that the goal belongs to the caller.
--   * Returns the new saved_cents (clamped to >= 0 by table check).
-- ============================================================================
create or replace function public.contribute_to_goal(
  p_goal_id      uuid,
  p_amount_cents bigint,
  p_note         text default null
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_new bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_amount_cents = 0 then
    raise exception 'amount must be non-zero';
  end if;

  insert into public.goal_contributions (user_id, goal_id, amount_cents, note)
  values (v_uid, p_goal_id, p_amount_cents, nullif(trim(p_note), ''));

  update public.savings_goals
     set saved_cents = greatest(0, saved_cents + p_amount_cents)
   where id = p_goal_id
   returning saved_cents into v_new;

  if v_new is null then
    raise exception 'goal not found or not owned by caller';
  end if;

  return v_new;
end;
$$;

revoke all on function public.contribute_to_goal(uuid, bigint, text) from public;
grant execute on function public.contribute_to_goal(uuid, bigint, text) to authenticated;

-- ============================================================================
-- move_between_goals(p_from, p_to, p_amount_cents, p_note)
--   * Atomic transfer: negative contribution on `from`, positive on `to`.
--   * Both rows + both saved_cents updates in one transaction.
-- ============================================================================
create or replace function public.move_between_goals(
  p_from         uuid,
  p_to           uuid,
  p_amount_cents bigint,
  p_note         text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_note text := nullif(trim(p_note), '');
begin
  if p_from = p_to then
    raise exception 'source and destination must differ';
  end if;
  if p_amount_cents <= 0 then
    raise exception 'amount must be positive';
  end if;

  perform public.contribute_to_goal(p_from, -p_amount_cents, coalesce(v_note, 'Move out'));
  perform public.contribute_to_goal(p_to,    p_amount_cents, coalesce(v_note, 'Move in'));
end;
$$;

revoke all on function public.move_between_goals(uuid, uuid, bigint, text) from public;
grant execute on function public.move_between_goals(uuid, uuid, bigint, text) to authenticated;

-- ============================================================================
-- delete_contribution(p_id)
--   * Reverses a contribution: deletes the row + decrements saved_cents by
--     the original amount. Used by undo toast.
-- ============================================================================
create or replace function public.delete_contribution(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_goal   uuid;
  v_amount bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.goal_contributions
   where id = p_id and user_id = v_uid
   returning goal_id, amount_cents into v_goal, v_amount;

  if v_goal is null then
    raise exception 'contribution not found';
  end if;

  update public.savings_goals
     set saved_cents = greatest(0, saved_cents - v_amount)
   where id = v_goal;
end;
$$;

revoke all on function public.delete_contribution(uuid) from public;
grant execute on function public.delete_contribution(uuid) to authenticated;

-- ============================================================================
-- Backfill: one historic row per goal with saved_cents > 0 (only if no
-- contributions exist yet for that goal). Uses created_at as the date so
-- the sparkline / projection has something to work with.
-- ============================================================================
insert into public.goal_contributions (user_id, goal_id, amount_cents, note, occurred_at, created_at)
select g.user_id, g.id, g.saved_cents, 'Initial balance', g.created_at, g.created_at
  from public.savings_goals g
 where g.saved_cents > 0
   and not exists (
     select 1 from public.goal_contributions c where c.goal_id = g.id
   );
