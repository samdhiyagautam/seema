# 02 — Data Model (Postgres / Supabase)

Source of truth: `supabase/migrations/0001_init.sql`. This document explains **why**, the SQL is the **what**.

## 1. Entity relationships

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "1:1 (trigger-created)"
    PROFILES {
      enum role "super_admin|manager|staff|content_manager"
    }
    CUSTOMERS ||--o{ BOOKINGS : "has"
    SERVICES ||--o{ BOOKINGS : "booked as"
    STAFF_MEMBERS ||--o{ BOOKINGS : "assigned (nullable, Ph3)"
    BOOKINGS ||--o| REVIEWS : "verified by booking code"
    LEADS ||--o| BOOKINGS : "converted to"
    PORTFOLIO_ITEMS }o--|| CATEGORY : "text tag"
    SITE_CONTENT { text key value }
    BLOCKED_DATES { date blocked_on }
    EXPENSES { date spent_on }
    EVENTS { text name jsonb meta }
```

## 2. Tables

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | Admin/staff identities + role | `id=auth.users.id`, `role app_role` |
| `services` | Catalogue | `slug`, `category`, `duration_minutes`, `price_inr`, `is_active`, `display_order` |
| `staff_members` | Team (public profiles + Ph3 scheduling anchor) | `specialties text[]`, `is_active` |
| `customers` | CRM | `phone UNIQUE`, `source`, `notes`, `last_visit_at` |
| `bookings` | The diary | `code UNIQUE (BK-YYMMDD-XXXX)`, `appointment_date/time`, `status`, `payment_status`, **snapshots** `service_name, duration_minutes, total_price` |
| `leads` | Enquiry pipeline | `source`, `status`, `follow_up_on`, `lost_reason`, `converted_booking_id` |
| `reviews` | Social proof | `rating 1-5`, `is_approved`, `is_verified` (has booking), `booking_id` |
| `portfolio_items` | Gallery | `image_url`, `category`, `is_published`, `display_order` |
| `site_content` | CMS key-values (hours, hero, contacts) | `key PK`, `value text` |
| `blocked_dates` | Studio-unavailable dates | `blocked_on UNIQUE`, `reason` |
| `expenses` | Phase 2 finance groundwork | `spent_on`, `category`, `amount_inr` |
| `events` | First-party analytics (no PII) | `name`, `path`, `meta jsonb` |

**Snapshot rule:** bookings copy `service_name`, `duration_minutes`, `total_price` at booking time.
Later price edits never rewrite history — financial reports stay truthful.

## 3. Enums

```sql
app_role        : super_admin | manager | staff | content_manager
booking_status  : pending | confirmed | completed | cancelled | no_show
payment_status  : unpaid | advance_paid | paid | refunded
lead_status     : new | contacted | follow_up | converted | lost
source_channel  : website | instagram | whatsapp | facebook | youtube | referral | walk_in | phone | other
```

## 4. Finance math (single source of definitions)

Per booking: `net_total = total_price − discount_amount`, `balance = net_total − amount_paid`.

| Metric | Formula |
|---|---|
| **Recognized revenue** (period = appointment month) | `Σ net_total` where `status = 'completed'` |
| **Advance collections** | `Σ amount_paid` where `status IN ('pending','confirmed')` — **liability, not revenue** |
| **Outstanding** | `Σ balance` where `status IN ('confirmed','completed')` and `balance > 0` |
| **Refunds** | `Σ refund_amount` where `payment_status = 'refunded'` |
| **Estimated profit** | recognized revenue − `Σ expenses.amount_inr` (same period) |
| **Average booking value** | recognized revenue ÷ completed bookings |

Double-counting is prevented by rule: an advance on a pending booking is *collected cash*, it
becomes revenue **only** when that booking flips to `completed`. Cancellation policy (MVP,
manual): refund recorded via `refund_amount`, booking becomes `cancelled`.

## 5. Slot & conflict model

- Studio-local times. Config in `site_content`: `open_time`, `close_time`,
  `slot_interval_minutes`, `min_notice_hours`, `closed_weekdays` (JSON array of ISO day numbers,
  e.g. `["1"]` = Monday closed), plus hard `blocked_dates`.
- Capacity = **1 concurrent appointment** (single artist). Overlap test in SQL:
  `(b.time, b.time + b.duration) OVERLAPS (p.time, p.time + p.duration)`.
- Enforced by `assert_slot_free()` inside `create_booking()` / `reschedule_booking()` —
  both `SECURITY DEFINER` RPCs, so no anonymous row access is ever needed and the check is
  atomic with the insert. Error codes: `SLOT_TAKEN, DATE_BLOCKED, DAY_CLOSED, DATE_IN_PAST,
  OUTSIDE_HOURS, TOO_LATE, SELECTED_SERVICE_UNAVAILABLE`.
- Rescheduling excludes the booking itself; completed/cancelled bookings cannot move.

## 6. Row-Level Security (the RBAC backstop)

Helper: `app_current_role()` — `SECURITY DEFINER`, reads `profiles` for `auth.uid()`
(declared STABLE). Used by every policy, so **no RLS recursion**.

| Table | anon (public) | staff | manager | super_admin | content_manager |
|---|---|---|---|---|---|
| services (active) / (all) | read | read all | all | all | read+write |
| portfolio (published)/(all) | read | read | all | all | read+write |
| site_content | read | read | write | write | write |
| blocked_dates | read | read | write | write | write |
| reviews (approved)/(all) | read approved, **no direct insert** (RPC only) | read | moderate | moderate | moderate |
| bookings | none | read | read+update | read+update | none |
| customers | none | read | read+update | read+update | none |
| leads | insert only | read | read+update | read+update | none |
| profiles | — | own | read | read+update roles | own |
| events | insert only | — | read | read | — |
| expenses | none | — | all | all | — |

Storage bucket `media` (public read; authenticated staff-role users upload/delete portfolio & service images).

## 7. Privacy & retention

- `events` stores **event name, page path, and non-personal meta only** — never names/phones.
- Customer records exist because the business must serve them; export/delete requests are a
  Super Admin action (manual, documented) — we don't build what the business can't yet operate.
- No third-party trackers, no cookies beyond the Supabase auth session.

## 8. Indexes

`bookings(appointment_date)`, `bookings(status)`, `bookings(customer_id)`,
`leads(status)`, `leads(created_at desc)`, `reviews(is_approved)`,
`services(is_active, display_order)`, `events(name, created_at)`.
