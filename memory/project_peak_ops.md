---
name: project-peak-ops
description: PEAK Operations internal management system — stack, key decisions, and setup state
metadata:
  type: project
---

PEAK Ops is a dark-mode Next.js 16 (App Router) + Supabase + Tailwind v4 + shadcn-style app at `C:\Users\Mazen\OneDrive\Strava all\CMS`. It manages orders, inventory, notes, reminders, and team for PEAK (3D-printed trail map art).

**Why:** Mazen runs PEAK and needed an internal ops tool for order tracking, designer assignment, and inventory management.

**How to apply:** All future changes should stay in this directory; refer to `SETUP.md` for the deployment checklist. The project uses `src/proxy.ts` (not `middleware.ts`) for route guarding — Next.js 16 renamed the file convention.

Key decisions recorded in code:
- Stock auto-decrements on `printed` status (not `in_production`)
- Financials hidden from designers via `orders_view` SECURITY DEFINER in Postgres — not UI-only
- `hexagon_wraps` is manual-only packaging inventory (not a product type); 1 wrap = 3 internal units
- `product_type` enum only has `frame` (hexagon wraps are a packing material)
- npm path issue: use `C:\Program Files\nodejs\npm.cmd` directly — `C:\Users\Mazen\node_modules\npm` (v2.x) shadows it

**Status as of 2026-06-24:** Full build scaffolded and passing `next build` clean. Not yet wired to a live Supabase project (`.env.local` not created yet). Next step: Mazen creates a Supabase project and runs `supabase/migrations/0001_init.sql`.
