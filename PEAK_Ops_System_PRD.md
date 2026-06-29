# PEAK Operations — Product Requirements Document

> Internal management system for PEAK (personalised 3D printed trail map art).
> Hand this document to Claude Code as the build specification.

---

## 1. Overview

A multi-user web app to manage orders, inventory, notes, and reminders for PEAK.
Two roles: **Admin** (Mazen — full access) and **Designer** (3D modeling contractor —
limited access to orders + model production status).

**Stack:**
- Next.js 14+ (App Router), TypeScript
- Supabase (Postgres + Auth + Row Level Security)
- Tailwind CSS + shadcn/ui
- Recharts (dashboard charts)
- Cloudinary (image storage — reference images, Strava screenshots if needed)
- Deployed on Vercel

**Design direction:** Dark mode default. Single accent color: orange `#E5400B`
(matches PEAK brand). Clean, data-dense tables over decorative cards — this is a
daily-use tool, optimized for fast scanning, not browsing. Generous whitespace
where it aids scanability, tight where it aids density (tables).

---

## 2. Roles & Permissions

### Admin (Mazen)
- Full access to everything below.

### Designer (3D modeling contractor)
- Sees: Pending orders assigned to them, Strava link, customer's custom text
  details (name/title/colors), order status.
- Can do: Mark an order's model as "Model Made" / move status forward in the
  production stages they're responsible for.
- Cannot see: amount paid, amount due, revenue, charts, inventory levels, notes,
  reminders, or other team members.

Use Supabase Auth + Row Level Security policies to enforce this — do not rely on
frontend hiding alone.

---

## 3. Data Model

### `orders`
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| customer_name | text | |
| strava_link | text | rendered as a clickable button/icon, opens in new tab |
| customer_notes | text | freeform — name, title, frame color, text color, terrain color, trail line color as sent by customer. Preserve line breaks when rendering. |
| product_type | enum | `frame` (single product type for now, structured as enum for future expansion) |
| amount_due | numeric | |
| amount_paid | numeric | can be partial — show remaining balance as computed field |
| status | enum | see pipeline below |
| source | enum | `whatsapp` \| `shopify` |
| assigned_designer_id | uuid | nullable, FK to users |
| model_made | boolean | designer toggles this |
| created_at | timestamp | |
| updated_at | timestamp | |

**Status pipeline (enum, in order):**
```
pending → confirmed_payment → in_production → printed → shipped → delivered → review_requested
```

### `inventory_items`
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| item_type | enum | `frame` \| `packaging` \| `flyer` |
| quantity | integer | auto-decrements by 1 per order on status = `printed` (or `in_production` — confirm trigger point during build) |
| low_stock_threshold | integer | default 10 |

### `filament_rolls`
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| roll_number | text | manual entry |
| color | enum | black, white, grey, army_green, red, yellow |
| kg_remaining | numeric | 1 roll = 1kg starting value, manually updated by Mazen — NOT auto-decremented |
| low_stock_threshold | numeric | default 0.2 (kg) — flag color, not blocking |

### `hexagon_wraps`
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| units_remaining | integer | **store internally in thirds**: 1 physical wrap = 3 units. Manual entry/update by Mazen. One hexagon order deducts 1 unit (i.e. 1/3 of a wrap). Display to user as both "X wraps" and "X units" for clarity. |
| low_stock_threshold | integer | default 9 (= 3 wraps) |

### `notes`
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| content | text | freeform |
| linked_order_id | uuid | nullable — optional link to an order |
| created_at | timestamp | |

### `reminders`
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| title | text | |
| due_date | timestamp | |
| notes | text | nullable |
| notification_method | enum | `dashboard_flag` (MVP — email/push can be phase 2) |
| completed | boolean | default false |

### `users`
| Field | Type | Notes |
|---|---|---|
| id | uuid | from Supabase Auth |
| name | text | |
| role | enum | `admin` \| `designer` |

---

## 4. Pages / Modules

### `/dashboard` (Admin only)
- Revenue this month (sum of `amount_paid`)
- Total orders / Pending count / Delivered count this month
- Low stock alert banner (any inventory item, filament, or wrap below threshold)
- Charts (Recharts):
  - Orders per week (bar)
  - Revenue over time (line)
  - Order status breakdown (pie or stacked bar)

### `/orders`
- Table view, filterable by status and source (WhatsApp/Shopify)
- Columns: Customer name, Strava link (button), Status, Amount due, Amount paid,
  Balance (computed), Assigned designer, Created date
- Click into a row → detail view showing full `customer_notes`, ability to update
  status, log payment, assign designer
- "Add Order" manual entry form (for WhatsApp orders)
- Designer view: same table, filtered to their assigned orders only, financial
  columns hidden, with a "Mark Model Made" action

### `/inventory`
- Three sections: Frames/Packaging/Flyers (auto-tracked), Filament Rolls (manual),
  Hexagon Wraps (manual)
- Color-coded badges: green (healthy), yellow (approaching threshold), red (below
  threshold)
- Manual +/- controls for filament and wraps
- Manual "Receive Stock" action for frames/packaging/flyers (to add stock back in
  when restocked)

### `/notes`
- Simple list, newest first
- Add note (optionally link to an existing order via searchable dropdown)

### `/reminders`
- List view sorted by due date, upcoming items highlighted
- Mark complete
- Add reminder form

### `/team` (Admin only)
- List of users + roles
- Invite new user (sends Supabase magic link or sets up credentials)

---

## 5. Key UX Behaviors

- Strava links must be rendered as a distinct clickable button/icon per row —
  never just plain text — and open in a new tab.
- `customer_notes` field must preserve line breaks when displayed (use `whitespace-pre-wrap` 
  or equivalent) since this is pasted/typed customer detail (name, title, colors).
- Inventory deduction for frames/packaging/flyers happens automatically — confirm
  the exact trigger point (likely when status moves to `in_production` or `printed`)
  during implementation and make it configurable/clear in code comments.
- Filament and hexagon wrap inventory are NEVER auto-deducted — always manual,
  since usage isn't 1:1 with orders in a clean way.
- All financial data (amount_paid, amount_due, revenue, charts) must be invisible
  to the Designer role at the API/RLS level, not just hidden in the UI.

---

## 6. Out of Scope for V1 (do not build yet)

- Influencer/promo code commission tracking
- Email/push notifications for reminders (dashboard flag only for now)
- Multiple product types beyond frame (structure as enum so it's easy to extend later)
- Customer-facing portal

---

## 7. Design System

- **Mode:** Dark by default
- **Accent:** `#E5400B` (orange) — primary actions, alerts, active states
- **Background:** near-black `#111111` / `#0A0A0A`
- **Typography:** Clean sans-serif (Inter or similar), data-dense tables prioritize
  legibility over personality
- **Components:** shadcn/ui as the base component library, customized to match
  the above palette
- Accessibility: visible keyboard focus states, respect reduced-motion preferences,
  responsive down to mobile (Mazen will check this on his phone regularly)

---

## 8. Build Order Suggestion

1. Supabase schema + RLS policies + Auth setup (admin/designer roles)
2. Orders module (core of the app) — table, detail view, manual add, status pipeline
3. Dashboard — revenue/order counts first, charts second
4. Inventory module — auto-tracked items first, then manual filament/wraps
5. Notes + Reminders (simplest modules, can be done in parallel/last)
6. Team management page
7. Polish pass — empty states, loading states, mobile responsiveness check
