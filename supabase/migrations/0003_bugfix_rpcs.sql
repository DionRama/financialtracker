-- ============================================================================
-- Bug-fix RPCs
--   * create_category_with_color: atomic per-user color allocation so two
--     concurrent inserts can't pick the same palette slot.
--   * delete_all_user_data: single-call wipe so a failure can't leave the
--     account in a partially-deleted state.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- create_category_with_color
--   Runs under the caller's RLS (security_invoker). Per-user advisory lock
--   serializes concurrent allocations so the palette scan + insert is atomic.
-- ----------------------------------------------------------------------------
create or replace function public.create_category_with_color(p_name text)
returns public.categories
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_palette    text[] := array[
    '#16a34a','#f97316','#0ea5e9','#7c3aed','#ec4899',
    '#ef4444','#a855f7','#14b8a6','#eab308','#3b82f6'
  ];
  v_used       text[];
  v_color      text;
  v_candidate  text;
  v_row        public.categories;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext('cat-color:' || v_uid::text));

  select coalesce(array_agg(lower(color)), array[]::text[])
    into v_used
    from public.categories
   where user_id = v_uid;

  v_color := null;
  foreach v_candidate in array v_palette loop
    if not (lower(v_candidate) = any (v_used)) then
      v_color := v_candidate;
      exit;
    end if;
  end loop;

  if v_color is null then
    v_color := '#' || substr(md5(p_name || ':' || v_uid::text), 1, 6);
  end if;

  insert into public.categories (user_id, name, color)
  values (v_uid, p_name, v_color)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.create_category_with_color(text) to authenticated;

-- ----------------------------------------------------------------------------
-- delete_all_user_data
--   Single transactional wipe of the caller's expenses, budgets, categories.
--   security_definer so all three deletes either succeed or roll back together
--   regardless of cascade ordering.
-- ----------------------------------------------------------------------------
create or replace function public.delete_all_user_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.expenses   where user_id = v_uid;
  delete from public.budgets    where user_id = v_uid;
  delete from public.categories where user_id = v_uid;
end;
$$;

grant execute on function public.delete_all_user_data() to authenticated;
