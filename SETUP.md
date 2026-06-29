# PEAK Operations — Setup Guide

## 1. Create a Supabase project

1. Go to supabase.com → New project.
2. Save the **Project URL**, **anon key**, and **service_role key** from  
   Settings → API.

## 2. Apply the database migration

In your Supabase dashboard → SQL Editor, open and run:

```
supabase/migrations/0001_init.sql
```

This creates all tables, enums, RLS policies, views, and triggers.

## 3. Create your admin user

In Supabase → Authentication → Users → Invite user (or Add user):

- Enter your email (`mazenhabib007@gmail.com`)
- After accepting the invite, go to SQL Editor and run:

```sql
update public.users
set name = 'Mazen', role = 'admin'
where id = '<your-user-uuid>';
```

(Find your UUID in Authentication → Users.)

## 4. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # change to your Vercel URL in production
```

## 5. Run locally

```bash
npm run dev
```

Visit http://localhost:3000 → redirects to `/login` → sign in → `/dashboard`.

## 6. Deploy to Vercel

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add the same env vars in Vercel → Settings → Environment Variables.
4. Set `NEXT_PUBLIC_SITE_URL` to your Vercel production URL.
5. In Supabase → Authentication → URL Configuration, add your Vercel URL to  
   **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

## 7. Invite the designer

From the `/team` page, enter the designer's email and set role = Designer.  
They receive a Supabase magic-link invite. Once they accept, they land on `/orders`  
filtered to their assigned orders only. Financial columns are hidden at the  
database level, not just the UI.

---

## Key design decisions

| Decision | Rationale |
|---|---|
| Stock decrements on `printed` | Closest to physical consumption (settled during build) |
| `orders_view` SECURITY DEFINER | Designers get NULL financials at DB level; no UI-only hiding |
| `hexagon_wraps` always manual | Usage is not 1:1 with orders; manual tracking per PRD |
| 1 physical wrap = 3 units internally | Stored in thirds so fractional usage is trackable |
