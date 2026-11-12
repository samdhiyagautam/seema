# 05 — Product Roadmap & Prioritization

Gating rule: **Phase 2 work starts only when every Phase 1 acceptance test in
`06-acceptance-criteria.md` passes twice consecutively on a staging build.**

## Phase 1 — MVP (this codebase)

Scope: premium storefront · service catalogue · portfolio · WhatsApp integration · appointment
booking with conflict detection · admin auth · booking dashboard · enquiry/lead management ·
basic CRM · website content management · availability blocking · reviews moderation ·
first-party analytics events.

**Measurable completion criteria (all must be true):**

| # | Criterion | Measured by |
|---|---|---|
| P1.1 | Production build succeeds with zero type errors | `npm run build` green |
| P1.2 | All 12 acceptance tests (T1–T12) pass on desktop + mobile Chrome/Safari | `06-acceptance-criteria.md` checklist signed |
| P1.3 | Booking conflict suite passes: overlapping request → rejected; back-to-back → allowed | T3 scenario table |
| P1.4 | Admin completes confirm → complete → record payment in < 60s | timed T2 run |
| P1.5 | RLS verified: anon key cannot read bookings/customers/leads | T10 SQL probes |
| P1.6 | Lighthouse mobile ≥ 85 perf / ≥ 95 accessibility on home & book pages | DevTools audit |
| P1.7 | Owner completes a full content edit (price change + photo upload) without developer help | observed session |
| P1.8 | 2 weeks of real usage with ≤ 1 critical bug reported by owner | owner log |

## Phase 2 — Business Operations

Scope: advanced week/month calendar view · full customer CRM (segments, lifetime value) ·
revenue/expense module with the finance rules from `02-data-model.md` §4 · course & student
management (no certificates — business confirmed) · notifications (WhatsApp reminder digests;
email optional) · business analytics dashboard with comparisons & CSV export.

**Completion criteria:**

| # | Criterion | Measured by |
|---|---|---|
| P2.1 | Finance report reconciles: recognized revenue + advances + outstanding + refunds = owner's manual ledger, 3 consecutive months | reconciliation sheet |
| P2.2 | Calendar shows week/month; drag-reschedule re-runs conflict detection; 30 scripted scenarios pass | QA script pack |
| P2.3 | Expense entry + monthly profit card match SQL `SELECT` within ₹1 | spot checks |
| P2.4 | Course enquiry → registration → batch → fee ledger flow works end-to-end | walkthrough |
| P2.5 | Analytics dashboard numbers equal hand-written SQL for same period | spot checks |

## Phase 3 — Growth & Automation

Scope: staff scheduling with per-artist capacity · WhatsApp Business API (templated reminders,
review requests) · automated follow-up campaigns (segment-triggered) · marketing analytics by
source (attribution report) · advanced reporting exports · RBAC hardening (column-level finance
masking via views, audit log UI).

**Completion criteria:**

| # | Criterion | Measured by |
|---|---|---|
| P3.1 | Two artists can hold different appointments in the same slot; double-assign impossible | conflict suite |
| P3.2 | Reminder delivery ≥ 95% within 5 min of schedule over 30 days | API logs |
| P3.3 | Lead source attribution report matches CRM source fields ≥ 95% | sample audit |
| P3.4 | Automation runs ≥ 4 weeks without owner intervention and can be paused from admin | ops log |
| P3.5 | Security review: RLS + storage policies re-audited, no public write surfaces beyond forms/RPCs | checklist |

## Sequencing rules

1. Every phase ends with the same gate: **acceptance tests + owner sign-off.**
2. A feature enters a phase only if it maps to a metric in `01-product-strategy.md` §2 — otherwise it goes to the parking lot.
3. Phase 1 bug fixes always outrank Phase 2 features.
