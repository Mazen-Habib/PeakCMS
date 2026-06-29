-- Allow all designers to see and work on all orders (not just assigned ones).
-- Financial columns are still NULL for designers (enforced by the view).
-- Designers can still only change status (in_progress / model_made) and model_link
-- (enforced by the enforce_order_update_scope trigger).

-- 1. Drop and recreate the view without the assigned_designer_id filter.
DROP VIEW IF EXISTS public.orders_view;

CREATE VIEW public.orders_view
WITH (security_invoker = off)
AS
SELECT
  o.id,
  o.customer_name,
  o.strava_link,
  o.model_link,
  o.customer_notes,
  o.product_type,
  CASE WHEN public.is_admin() THEN o.amount_due  ELSE NULL END AS amount_due,
  CASE WHEN public.is_admin() THEN o.amount_paid ELSE NULL END AS amount_paid,
  CASE WHEN public.is_admin() THEN (o.amount_due - o.amount_paid) ELSE NULL END AS balance,
  o.status,
  o.source,
  o.assigned_designer_id,
  u.name AS assigned_designer_name,
  o.created_at,
  o.updated_at
FROM public.orders o
LEFT JOIN public.users u ON u.id = o.assigned_designer_id;
-- No WHERE clause — all authenticated users (admin + designer) see all orders.
-- Financial column visibility is handled by the CASE statements above.

GRANT SELECT ON public.orders_view TO authenticated;

-- 2. Widen the designer SELECT policy to all rows (not just assigned).
DROP POLICY IF EXISTS orders_designer_select ON public.orders;
CREATE POLICY orders_designer_select ON public.orders
  FOR SELECT TO authenticated
  USING (true);
-- Note: admins are already covered by orders_admin_all; this policy adds
-- designers. Both policies apply via OR — having `using (true)` for all
-- authenticated users is fine because the base SELECT grant is the actual
-- gate, and the view NULLs financials for designers.

-- 3. Widen the designer UPDATE policy to all rows.
DROP POLICY IF EXISTS orders_designer_update ON public.orders;
CREATE POLICY orders_designer_update ON public.orders
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
-- The enforce_order_update_scope trigger still limits what columns/statuses
-- designers can actually change — the policy just controls which rows.
