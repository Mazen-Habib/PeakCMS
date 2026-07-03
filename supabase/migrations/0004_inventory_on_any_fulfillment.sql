-- Fix: deduct inventory whenever an order first enters the fulfillment zone
-- (printed / shipped / delivered), not only on 'printed'.
-- Moving between fulfillment statuses (printed → shipped → delivered) does NOT
-- deduct again — the old status must be outside the zone.

CREATE OR REPLACE FUNCTION public.decrement_inventory_on_print()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- "Entering" fulfillment = new status is printed/shipped/delivered
  --                         AND old status was none of those three.
  IF new.status IN ('printed', 'shipped', 'delivered')
     AND old.status NOT IN ('printed', 'shipped', 'delivered') THEN
    UPDATE public.inventory_items
    SET quantity = GREATEST(quantity - 1, 0)
    WHERE item_type IN ('frame', 'packaging', 'flyer');
  END IF;
  RETURN new;
END;
$$;
