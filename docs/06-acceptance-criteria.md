# 06 — Product Acceptance Criteria & QA Plan

Production gate: every test below passes on a staging build, then re-passes after any pre-launch fix.

## T1 — Customer can submit a valid booking request
1. Open `/book` on a phone. Pick a service → a date → a slot → enter name + 10-digit phone → submit.
2. **Expect:** booking code shown (BK-YYMMDD-XXXX), WhatsApp confirmation button prefilled, entry
   visible in `/admin/bookings` as `pending`.

## T2 — Admin can manage bookings
Confirm a booking → status flips, WhatsApp message button reflects it. Complete it → record
advance + full payment → payment status becomes `paid`. Reschedule → new date/time reflected.
Cancel → status `cancelled`. Every action reloads the list without stale rows.

## T3 — Booking conflicts handled correctly
Same-day, seeded config (10:00–19:00, 30-min grid, one 120-min service booked at 11:00):

| Request | Expect |
|---|---|
| Another service overlapping 11:00–13:00 | rejected `SLOT_TAKEN` |
| Starting 13:00 | allowed |
| Starting 09:00 (before open) | rejected `OUTSIDE_HOURS` |
| Same date, 5-min-granular time not on grid via reschedule | snapped/validated server-side |
| Book for a `blocked_dates` entry | rejected `DATE_BLOCKED` |
| Book for closed weekday | rejected `DAY_CLOSED` |
| Today with < `min_notice_hours` left | rejected `TOO_LATE` |
| Reschedule the 11:00 booking to 12:00 (self-overlap) | allowed (excludes itself) |

## T4 — Admin can update services and prices
Edit a service price → storefront shows the new price. Deactivate → disappears from storefront
**and** `/book` picker; historical bookings keep their snapshot price/name.

## T5 — Admin can upload portfolio images
Upload via `/admin/portfolio` → appears on `/portfolio` with category filter; unpublish → gone
from public page; delete → removed from storage and table.

## T6 — Customer enquiries are stored securely
Submit `/contact` enquiry → visible in `/admin/leads` with source `website`. Direct `curl` with
the anon key `GET /rest/v1/leads` → **empty/unauthorized** for read; `bookings`, `customers`
readable by anon key = never.

## T7 — Financial calculations are correct
Seed: booking A completed (₹10,000, paid ₹10,000), booking B confirmed (₹5,000, advance ₹2,000),
expense ₹1,000 (Phase 2 groundwork). Dashboard must show: collected ₹12,000, recognized revenue
**₹10,000 only**, outstanding ₹3,000, profit (Ph2) ₹9,000. Advances never counted as revenue.

## T8 — Permissions are enforced
Log in as each role. `staff` sees bookings but no money values and no admin links;
`content_manager` sees services/portfolio/reviews/content only; neither can reach
`/admin/bookings` mutations (server actions reject with FORBIDDEN even via direct invocation).

## T9 — Works on mobile and desktop
iPhone Safari + Android Chrome walkthroughs: header menu, service cards, booking form steps,
admin tables scroll/stack legibly. Lighthouse ≥ 85 perf / ≥ 95 a11y on `/` and `/book` (mobile).

## T10 — No critical security vulnerabilities remain
- [ ] Anon key cannot SELECT bookings/customers/leads/profiles/events/expenses (SQL probes)
- [ ] Anon can only INSERT leads/events; reviews only via RPC; bookings only via RPC
- [ ] Service-role key exists only in server env, never bundled client-side (`grep` the build)
- [ ] Admin actions reject unsigned/unprivileged callers; middleware blocks `/admin/*`
- [ ] Storage: public read limited to `media` bucket; uploads require authenticated session
- [ ] All inputs zod-validated server-side; no `dangerouslySetInnerHTML` on user content
- [ ] Dependency audit clean (`npm audit` — no high/critical)

## T11 — Important user journeys pass
Journey A (stranger → customer): ad/Instagram → service page → book → WhatsApp confirm → admin
confirms → completes → review request → verified review appears after moderation.
Journey B (lead → sale): Instagram DM captured as lead → follow-up date set → status converted
→ booking created → revenue visible.
Journey C (content): owner edits hero copy + adds blocked date → storefront and booking form
reflect changes on next load.

## T12 — Production build succeeds
`npm run build` exits 0, zero TypeScript errors; `npm start` serves; sitemap/robots resolve;
no runtime errors in console during the full T1–T11 pass.

---

# Phase 2 gate (Business Operations)

## T13 — Calendar week/month + drag-reschedule re-runs conflicts
1. `/admin/calendar` month view shows bookings, blocked days and the closed weekday.
2. Drag a confirmed chip onto another day → toast "slot re-checked and free", list view shows the new date.
3. Drag it onto a day that already has an overlapping booking → friendly `SLOT_TAKEN` toast; **no move happens** (RPC rejected it).
4. Drag onto a blocked date → `DATE_BLOCKED` toast. Staff role: chips not draggable, no move UI.

## T14 — Finance reconciles (P2.1 / P2.3)
For the current month, compare the admin cards with SQL:

```sql
select * from finance_monthly where month = to_char(current_date, 'YYYY-MM');
```

- [ ] Recognized revenue = Σ net_total of completed bookings only (advances never counted)
- [ ] Advance collections = Σ amount_paid on pending + confirmed bookings
- [ ] Outstanding = Σ balance on confirmed + completed
- [ ] Profit = recognized revenue − expenses; matches after adding an expense in `/admin/finance`
- [ ] Deleting an expense updates profit within one reload

## T15 — Course → registration → fee ledger end-to-end (P2.4)
1. Public `/courses/[slug]` → submit enquiry → appears in `/admin/students` as `new`.
2. Register → choose batch + fee + discount → student created (upsert by phone), enrollment created, enquiry flips `converted`.
3. Record a partial payment → ledger row appears, paid total and "due" update (DB trigger re-summed).
4. Record more than the balance → rejected with the due amount shown. Delete a ledger row → re-summed.
5. Enrollment balance contributes nothing to booking revenue (separate ledger).

## T16 — Notifications digest
`/admin/reminders` lists tomorrow's confirmed bookings with prefilled WhatsApp messages (studio address + time), today's pending bookings, and leads whose follow-up date has arrived. "Copy digest" puts a plain-text digest on the clipboard. No external API keys required.

## T17 — Analytics comparison + CSV export (P2.5)
- [ ] `/admin/analytics` shows this month vs last month (bookings, revenue, avg value, profit) with % deltas
- [ ] Export links download: funnel CSV (events), finance CSV (12 months), customers CSV (LTV + segments)
- [ ] CSV numbers match `/admin/finance` cards and hand-written SQL for the same period
- [ ] `/admin/analytics/export` returns 401 signed-out and 403 for roles without the capability

## Release checklist (beyond tests)
- [ ] Supabase: migrations applied; first admin created with `super_admin`; MFA recommended
- [ ] `.env` secrets set on host (Vercel/custom); anon key only public value
- [ ] Real contact details, WhatsApp number, UPI id, hours set in `/admin/content`
- [ ] Backup schedule noted (Supabase daily backup on paid tier or `pg_dump` cron)
- [ ] Owner walkthrough done; `docs/` handed over
