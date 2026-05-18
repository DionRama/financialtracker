-- ============================================================================
-- Recurring backfill — rewrites materialize_recurring so a single call
-- catches a rule up across ALL missed cycles, not just one.
--
-- Bug being fixed:
--   The original FOR..LOOP iterated a SELECT snapshot of due rules and
--   advanced next_run_date by one cadence inside the body. A rule that had
--   been due for 12 months would only get 1 expense inserted per call,
--   so the materializer never actually caught up unless the user clicked
--   the manual "Run now" button dozens of times.
--
-- New behaviour:
--   For each due rule, loop *within* the rule until next_run_date strictly
--   exceeds the effective cutoff (least of p_through and end_date). Inner
--   iterations are capped at 500 per rule as a defensive safety against
--   misconfigured cadences.
--
-- Same RLS posture (security invoker), same signature, same grants.
-- Idempotent: running twice the same day produces 0 inserts on the
-- second call because next_run_date is now in the future for every rule.
-- ============================================================================

create or replace function public.materialize_recurring(p_through date default current_date)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_rule_id uuid;
  v_count  int := 0;
  v_iter   int;
  v_cutoff date;
  -- rule fields refreshed per inner iteration via SELECT INTO:
  v_kind          text;
  v_category_id   uuid;
  v_source_id     uuid;
  v_amount_cents  bigint;
  v_description   text;
  v_cadence       text;
  v_interval      int;
  v_end_date      date;
  v_next          date;
  v_user          uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  for v_rule_id in
    select id
      from public.recurring_rules
     where user_id = v_uid
       and is_paused = false
       and next_run_date <= p_through
       and (end_date is null or next_run_date <= end_date)
     order by next_run_date asc
  loop
    v_iter := 0;
    loop
      v_iter := v_iter + 1;
      exit when v_iter > 500;

      select user_id, kind, category_id, source_id, amount_cents,
             description, cadence, interval_count, end_date, next_run_date
        into v_user, v_kind, v_category_id, v_source_id, v_amount_cents,
             v_description, v_cadence, v_interval, v_end_date, v_next
        from public.recurring_rules
       where id = v_rule_id;

      v_cutoff := least(p_through, coalesce(v_end_date, p_through));
      exit when v_next is null or v_next > v_cutoff;

      if v_kind = 'expense' then
        insert into public.expenses
          (user_id, category_id, amount_cents, occurred_at, note, recurring_id)
        values
          (v_user, v_category_id, v_amount_cents, v_next, v_description, v_rule_id);
      elsif v_kind = 'income' then
        insert into public.income_entries
          (user_id, source_id, amount_cents, received_at, note, recurring_id)
        values
          (v_user, v_source_id, v_amount_cents, v_next, v_description, v_rule_id);
      end if;

      update public.recurring_rules
         set next_run_date = case v_cadence
              when 'weekly'   then next_run_date + (v_interval * 7)
              when 'biweekly' then next_run_date + (v_interval * 14)
              when 'monthly'  then (next_run_date + (v_interval || ' months')::interval)::date
              when 'yearly'   then (next_run_date + (v_interval || ' years')::interval)::date
            end
       where id = v_rule_id;

      v_count := v_count + 1;
    end loop;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.materialize_recurring(date) to authenticated;
