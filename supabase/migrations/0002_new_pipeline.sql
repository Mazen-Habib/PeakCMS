-- Migration: simplify order status pipeline, add model_link, remove model_made boolean.
-- Run this in the Supabase SQL Editor.

-- 1. Add model_link column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS model_link text;

-- 2. Drop the view (depends on old enum + model_made column)
DROP VIEW IF EXISTS public.orders_view;

-- 3. Create new status enum
CREATE TYPE order_status_new AS ENUM (
  'pending',
  'in_progress',
  'model_made',
  'revise',
  'printed',
  'shipped',
  'delivered'
);

-- 4. Drop the column default before changing the type
--    (Postgres cannot cast a typed enum default automatically)
ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT;

-- 5. Convert existing rows to new enum (map old values → closest new ones)
ALTER TABLE public.orders
  ALTER COLUMN status TYPE order_status_new
  USING (
    CASE status::text
      WHEN 'confirmed_payment' THEN 'pending'::order_status_new
      WHEN 'in_production'     THEN 'in_progress'::order_status_new
      WHEN 'review_requested'  THEN 'delivered'::order_status_new
      ELSE status::text::order_status_new
    END
  );

-- 6. Swap enum names
DROP TYPE public.order_status;
ALTER TYPE order_status_new RENAME TO order_status;

-- 7. Restore the column default using the new type
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending'::order_status;

-- 8. Drop model_made boolean (status now captures this)
ALTER TABLE public.orders DROP COLUMN IF EXISTS model_made;

-- 9. Recreate orders_view with model_link, without model_made
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
LEFT JOIN public.users u ON u.id = o.assigned_designer_id
WHERE public.is_admin() OR o.assigned_designer_id = auth.uid();

GRANT SELECT ON public.orders_view TO authenticated;

-- 10. Update designer scope enforcement:
--     Designers may only change status (in_progress / model_made) and model_link.
CREATE OR REPLACE FUNCTION public.enforce_order_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN new;
  END IF;

  -- Designers are limited to in_progress and model_made.
  IF new.status NOT IN ('in_progress', 'model_made') THEN
    RAISE EXCEPTION 'Designers can only set status to in_progress or model_made.';
  END IF;

  -- Designers cannot touch any other column.
  IF new.customer_name           IS DISTINCT FROM old.customer_name
     OR new.strava_link          IS DISTINCT FROM old.strava_link
     OR new.customer_notes       IS DISTINCT FROM old.customer_notes
     OR new.product_type         IS DISTINCT FROM old.product_type
     OR new.amount_due           IS DISTINCT FROM old.amount_due
     OR new.amount_paid          IS DISTINCT FROM old.amount_paid
     OR new.source               IS DISTINCT FROM old.source
     OR new.assigned_designer_id IS DISTINCT FROM old.assigned_designer_id
     OR new.created_at           IS DISTINCT FROM old.created_at THEN
    RAISE EXCEPTION 'Designers may only update status and model_link.';
  END IF;

  RETURN new;
END;
$$;
