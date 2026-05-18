-- ============================================================================
-- 0002_seed_extra_categories.sql
--
-- Adds three new starter categories for loan / credit-card payments and
-- backfills them for every existing user. Idempotent — safe to re-run.
--
-- New categories (sort 35–37, slotted between Transport (30) and Housing (40)):
--   * Car Loan Payment    — car-front  #dc2626
--   * Loan Payment        — landmark   #b45309
--   * Credit Card Payment — credit-card #1d4ed8
--
-- The handle_new_user() trigger in 0001_init.sql has been updated separately
-- so newly-created accounts already receive these categories.
-- ============================================================================

insert into public.categories (user_id, name, color, icon, sort_order)
select u.id, c.name, c.color, c.icon, c.sort_order
from auth.users u
cross join (values
  ('Car Loan Payment',    '#dc2626', 'car-front',   35),
  ('Loan Payment',        '#b45309', 'landmark',    36),
  ('Credit Card Payment', '#1d4ed8', 'credit-card', 37)
) as c(name, color, icon, sort_order)
on conflict (user_id, name) do nothing;
