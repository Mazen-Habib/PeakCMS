-- PEAK Operations — initial schema, RLS, views and triggers.
-- Roles: admin (full access) and designer (assigned orders only, no financials).
--
-- Financial invisibility for designers is enforced at the DB layer, not the UI:
--   * Base `orders` table SELECT is revoked from the `authenticated` role.
--   * All reads go through `orders_view`, a SECURITY DEFINER view that filters
--     rows and NULLs financial columns for non-admins.
--   * Writes go to the base table, guarded by RLS + a trigger that stops
--     designers editing anything beyond status / model_made.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('admin', 'designer');

create type order_status as enum (
  'pending',
  'confirmed_payment',
  'in_production',
  'printed',
  'shipped',
  'delivered',
  'review_requested'
);

create type order_source as enum ('whatsapp', 'shopify');
create type product_type as enum ('frame');
create type inventory_item_type as enum ('frame', 'packaging', 'flyer');
create type filament_color as enum (
  'black', 'white', 'grey', 'army_green', 'red', 'yellow'
);
create type reminder_method as enum ('dashboard_flag');

-- ---------------------------------------------------------------------------
-- Users (profile rows keyed to auth.users)
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  role user_role not null default 'designer'
);

-- SECURITY DEFINER so it bypasses RLS on `users` (avoids policy recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  strava_link text,
  customer_notes text,
  product_type product_type not null default 'frame',
  amount_due numeric not null default 0,
  amount_paid numeric not null default 0,
  status order_status not null default 'pending',
  source order_source not null default 'whatsapp',
  assigned_designer_id uuid references public.users (id) on delete set null,
  model_made boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_status_idx on public.orders (status);
create index orders_source_idx on public.orders (source);
create index orders_assigned_idx on public.orders (assigned_designer_id);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Inventory: frames / packaging / flyers (auto-tracked)
-- ---------------------------------------------------------------------------
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  item_type inventory_item_type not null unique,
  quantity integer not null default 0,
  low_stock_threshold integer not null default 10
);

-- Filament rolls (manual; NEVER auto-decremented)
create table public.filament_rolls (
  id uuid primary key default gen_random_uuid(),
  roll_number text not null,
  color filament_color not null,
  kg_remaining numeric not null default 1,
  low_stock_threshold numeric not null default 0.2
);

-- Hexagon wraps — packaging bubble-wrap. Stored internally in thirds:
-- 1 physical wrap = 3 units. Manual only.
create table public.hexagon_wraps (
  id uuid primary key default gen_random_uuid(),
  units_remaining integer not null default 0,
  low_stock_threshold integer not null default 9
);

-- ---------------------------------------------------------------------------
-- Notes & reminders
-- ---------------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  linked_order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_date timestamptz not null,
  notes text,
  notification_method reminder_method not null default 'dashboard_flag',
  completed boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Auto-decrement inventory when an order is marked `printed`.
-- Trigger point chosen during build (see lib/constants.ts STOCK_DEDUCTION_STATUS).
-- Decrements frame, packaging and flyer by 1 each, clamped at 0.
-- ---------------------------------------------------------------------------
create or replace function public.decrement_inventory_on_print()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'printed' and old.status is distinct from 'printed' then
    update public.inventory_items
    set quantity = greatest(quantity - 1, 0)
    where item_type in ('frame', 'packaging', 'flyer');
  end if;
  return new;
end;
$$;

create trigger orders_decrement_inventory
  after update on public.orders
  for each row execute function public.decrement_inventory_on_print();

-- ---------------------------------------------------------------------------
-- New auth user -> profile row. Role/name come from invite metadata.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'designer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Designer write guard: designers may only change status & model_made.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_order_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  -- Non-admin (designer): every column except status/model_made/updated_at
  -- must be unchanged.
  if new.customer_name      is distinct from old.customer_name
     or new.strava_link        is distinct from old.strava_link
     or new.customer_notes     is distinct from old.customer_notes
     or new.product_type       is distinct from old.product_type
     or new.amount_due         is distinct from old.amount_due
     or new.amount_paid        is distinct from old.amount_paid
     or new.source             is distinct from old.source
     or new.assigned_designer_id is distinct from old.assigned_designer_id
     or new.created_at         is distinct from old.created_at then
    raise exception 'Designers may only update status and model_made';
  end if;
  return new;
end;
$$;

create trigger orders_enforce_update_scope
  before update on public.orders
  for each row execute function public.enforce_order_update_scope();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.inventory_items enable row level security;
alter table public.filament_rolls enable row level security;
alter table public.hexagon_wraps enable row level security;
alter table public.notes enable row level security;
alter table public.reminders enable row level security;

-- users: read own row; admin reads all; admin manages all.
create policy users_select_self on public.users
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy users_admin_all on public.users
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- orders: admin full access; designers may SELECT/UPDATE assigned rows only.
-- (SELECT on the base table is revoked below, so designer SELECT effectively
--  flows through orders_view; the policy still scopes any row access.)
create policy orders_admin_all on public.orders
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy orders_designer_select on public.orders
  for select to authenticated
  using (assigned_designer_id = auth.uid());

create policy orders_designer_update on public.orders
  for update to authenticated
  using (assigned_designer_id = auth.uid())
  with check (assigned_designer_id = auth.uid());

-- Admin-only tables.
create policy inventory_admin_all on public.inventory_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy filament_admin_all on public.filament_rolls
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy hexagon_admin_all on public.hexagon_wraps
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy notes_admin_all on public.notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy reminders_admin_all on public.reminders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- orders_view — the only read surface for orders.
-- SECURITY DEFINER (default): runs as the view owner, so it can read the base
-- table even though `authenticated` cannot. It re-implements access control:
--   * rows: admin sees all, designer sees only their assigned orders
--   * financial columns: NULL for non-admins
-- ===========================================================================
create view public.orders_view
with (security_invoker = off)
as
select
  o.id,
  o.customer_name,
  o.strava_link,
  o.customer_notes,
  o.product_type,
  case when public.is_admin() then o.amount_due else null end as amount_due,
  case when public.is_admin() then o.amount_paid else null end as amount_paid,
  case when public.is_admin() then (o.amount_due - o.amount_paid) else null end as balance,
  o.status,
  o.source,
  o.assigned_designer_id,
  u.name as assigned_designer_name,
  o.model_made,
  o.created_at,
  o.updated_at
from public.orders o
left join public.users u on u.id = o.assigned_designer_id
where public.is_admin() or o.assigned_designer_id = auth.uid();

-- ===========================================================================
-- Privileges
-- ===========================================================================
-- Lock down the base orders table: no direct SELECT for app users.
revoke all on public.orders from anon, authenticated;
grant insert, update, delete on public.orders to authenticated;

-- The view is the read surface.
grant select on public.orders_view to authenticated;

-- ---------------------------------------------------------------------------
-- Seed singleton inventory rows (one per auto-tracked item type).
-- ---------------------------------------------------------------------------
insert into public.inventory_items (item_type, quantity, low_stock_threshold)
values
  ('frame', 0, 10),
  ('packaging', 0, 10),
  ('flyer', 0, 10)
on conflict (item_type) do nothing;

-- A single hexagon-wrap stock row (manual tracking).
insert into public.hexagon_wraps (units_remaining, low_stock_threshold)
values (0, 9);
