# Seema Makeover Studio — Business Platform

A beauty business management platform: premium customer-facing storefront **plus** an internal
operations console (bookings, CRM, leads, content, availability), on one Supabase database.

**Read the blueprint first:** `docs/00-overview.md` → strategy, data model, RBAC, feature PRDs,
roadmap and the QA plan that gates production (`docs/06-acceptance-criteria.md`).

## Stack

- Next.js 15 (App Router, TypeScript, Server Actions)
- Supabase (Postgres + Auth + Storage + Row-Level Security)
- Tailwind CSS v4

## 1. Create the database

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → paste the entire contents of `supabase/migrations/0001_init.sql` → Run.
   This creates enums, tables, indexes, RLS policies, storage bucket, scheduling RPCs and seed data.

## 2. Create the first admin

1. Authentication → Users → **Add user** (email + password, auto-confirm).
2. SQL Editor → promote the account (the signup trigger already created their profile):

```sql
update public.profiles set role = 'super_admin' where email = 'you@example.com';
```

If the profile row is missing (user created before the trigger was deployed):

```sql
insert into public.profiles (id, full_name, email, role)
select id, 'Super Admin', email, 'super_admin' from auth.users where email = 'you@example.com'
on conflict (id) do update set role = 'super_admin';
```

Roles: `super_admin` (everything), `manager` (operations + money), `staff` (diary only, no money),
`content_manager` (services/portfolio/reviews/content only). Matrix: `docs/03-rbac.md`.

## 3. Configure the app

```bash
cp .env.example .env.local   # fill in from Supabase → Settings → API
npm install
npm run dev
```

- Storefront: `http://localhost:3000`
- Admin console: `http://localhost:3000/admin` (login with the admin user)

## 4. First-run checklist (owner)

1. `/admin/content` — set real name, phone, **WhatsApp number (digits incl. 91)**, UPI ID,
   address, hours, closed weekday.
2. `/admin/services` — adjust prices/durations to the actual menu.
3. `/admin/portfolio` — upload real work photos.
4. `/admin/availability` — block upcoming holidays.
5. Change the seeded placeholder data anywhere it appears.

## 5. How booking conflicts work (summary)

`create_booking()` / `reschedule_booking()` RPCs validate — atomically, in the database — that
the slot is: inside `open_time`–`close_time`, on an open weekday, not a `blocked_date`, respecting
`min_notice_hours` for same-day, and not overlapping any `pending`/`confirmed` booking
(duration-aware). Rejections surface as human messages on the booking form.
Details: `docs/02-data-model.md` §5.

## 6. Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Develop locally |
| `npm run build` | Production build (must pass before release) |
| `npm start` | Serve the production build |
| `npm run typecheck` | TypeScript only |

## 7. Deploy (Vercel or any Node host)

- Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SITE_URL`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only or unset — the app doesn't
  need it for normal operation.
- Add your production URL to Supabase → Auth → URL configuration.
- Run `npm run build` locally first — green build is acceptance criterion T12.

## 8. Security notes

- All public writes go through validated forms and SECURITY DEFINER RPCs — the anon key can
  never read bookings/customers/leads or write bookings directly (verify with `docs/06` T10).
- Row-level security mirrors the permission matrix; admin server actions re-check roles.
- Analytics is first-party and PII-free (`events` table, no cookies).

## 9. Docs map

| Doc | Contents |
|---|---|
| `docs/00-overview.md` | Product definition, stack, conventions |
| `docs/01-product-strategy.md` | Journey, outcomes, positioning |
| `docs/02-data-model.md` | Schema, finance math, RLS, conflict model |
| `docs/03-rbac.md` | Roles & permission matrix |
| `docs/04-feature-prds.md` | Module PRDs (10-point standard each) |
| `docs/05-roadmap.md` | Phases + measurable completion criteria |
| `docs/06-acceptance-criteria.md` | T1–T12 production gate + release checklist |
