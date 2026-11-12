# 00 — Product Overview: Seema Makeover Studio Platform

## 1. What we are building

Seema Makeover Studio is not a website. It is a **beauty business management platform** with a
customer-facing storefront and an internal operations system, sharing one database.

```
┌────────────────────────────────────────────────────────────────────┐
│                        SEEMA MAKEOVER STUDIO                       │
├──────────────────────────────┬─────────────────────────────────────┤
│   STOREFRONT (public)        │   OPERATIONS (admin, /admin)        │
│   • Premium marketing site   │   • Booking dashboard + calendar    │
│   • Service catalogue        │   • Customer CRM                    │
│   • Portfolio                │   • Lead pipeline                   │
│   • Online booking           │   • Services / content / portfolio  │
│   • Enquiry + reviews        │   • Reviews moderation              │
│   • WhatsApp everywhere      │   • Availability & finance (Ph 2)   │
├──────────────────────────────┴─────────────────────────────────────┤
│              Supabase (Postgres + Auth + Storage + RLS)            │
│        One source of truth for customers, bookings, money          │
└────────────────────────────────────────────────────────────────────┘
```

## 2. Who uses it

| Persona | Needs | Surface |
|---|---|---|
| **Bride / customer** | Browse services, trust signals, pick a slot, confirm on WhatsApp | Storefront |
| **Seema (Super Admin / artist)** | One place for bookings, customers, money, content | Admin |
| **Front-desk / manager** | Confirm bookings, chase leads, collect advances | Admin |
| **Staff artist** | See own appointments, no access to money | Admin (restricted) |
| **Content manager** | Update services, prices, photos, copy without touching code | Admin (restricted) |

## 3. Scope discipline (Phase 1 = MVP)

**In scope now:** premium storefront, service catalogue, portfolio, booking with conflict
detection, enquiries/leads, basic CRM, admin auth + dashboard, content management, reviews
moderation, availability blocking, privacy-conscious event tracking.

**Deliberately out of scope now** (documented in `05-roadmap.md`): online payments (Razorpay),
SMS/email reminders, advanced staff scheduling, expenses UI, courses/LMS, WhatsApp Business API
automation, multi-artist slot capacity. Each is a Phase 2/3 item with defined entry criteria —
we do not build features to make the app look bigger.

## 4. Stack decisions and why

| Decision | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 (App Router, TypeScript)** | SEO for discovery, server rendering for speed on Indian mobile networks, server actions for admin mutations |
| Database/Auth/Storage | **Supabase (Postgres)** | Relational data fits bookings/CRM/finance; row-level security gives DB-level RBAC (module J) at zero extra infra |
| Styling | **Tailwind CSS v4** | Fast, consistent, small CSS output |
| Payments | **Offline (cash/UPI) recorded in admin** | Real studio workflow today; online gateway is Phase 2 |
| Reminders | **WhatsApp deep links** (wa.me prefilled) | Zero-cost, matches how Indian beauty clients actually communicate; API automation is Phase 3 |
| Analytics | **First-party event table, no cookies, no PII** | Privacy-conscious (module K), no third-party trackers |
| Money | **INR integers (rupees)** | No floating-point money, ever |

## 5. Repository map

```
app/(site)/…        public storefront pages
app/admin/…         operations console (auth-gated)
components/site/…   storefront components (client + server)
components/admin/…  admin component kit + client managers
lib/                supabase clients, data helpers, rbac, utils, validations
lib/actions/…       server actions (auth, public, admin/*)
supabase/migrations/0001_init.sql   full schema: enums, tables, RLS, RPCs, seed
docs/               this blueprint
```

## 6. Conventions

- Times are **studio-local** (`time` column, no timezone math) — a salon operates in one place.
- Dates are `date` (YYYY-MM-DD), phone numbers stored as plain digits, money as `integer` rupees.
- Every admin mutation is a **server action** that re-checks role (UI hiding is not security);
  RLS policies are the database backstop.
- Public data reads fail **soft**: if Supabase is unreachable the storefront still renders with
  sensible defaults (never a blank site).

## 7. Environment

```
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…   # server-only, optional (seed/bootstrap)
NEXT_PUBLIC_SITE_URL=…        # canonical URL for metadata
```

Setup steps live in the root `README.md`. Production readiness gates live in
`docs/06-acceptance-criteria.md`.
