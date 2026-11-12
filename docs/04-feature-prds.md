# 04 — Feature PRDs (Modules A–L)

Every module below follows the L-standard: business problem → persona → user stories →
acceptance criteria → database → edge cases → permissions → error/loading states → success
metrics → journey test. Phase tags: **P1** (building now), **P2**, **P3**.

---

## Module A — Product Strategy & Journey *(P1, the frame for everything)*

- **Business problem:** bookings and customer history lived in DMs and a paper diary; nothing
  was measurable, so growth was guesswork.
- **Personas:** customer (bride, mobile-first, WhatsApp-native); owner (wants control + visibility).
- **User stories:** as a *customer*, I can go from first look at the site to a held slot without
  calling anyone; as the *owner*, I can see where every customer came from and what they spent.
- **Acceptance criteria:** all 9 journey stages (01-product-strategy §1) have a measurable
  capability in the product; the 6 outcomes each map to ≥1 feature.
- **Database:** everything downstream — customers, bookings, leads, events.
- **Edge cases:** user lands directly on `/book` (no context) — form is self-explanatory with
  service pre-selected only when query param present.
- **Permissions:** n/a (strategy layer).
- **Error/loading:** n/a.
- **Metrics:** sessions → booking-start rate, enquiry rate, repeat rate (see K).
- **Test:** T11 journey A.

---

## Module A2 — Storefront & Service Catalogue *(P1)*

- **Business problem:** price transparency and trust proof are the #1 conversion drivers for
  bridal clients comparing studios on Instagram and Google.
- **Persona:** bride 22–35, mobile, comparing 3 studios; mother of bride researching price ranges.
- **User stories:** as a customer I can see every service with **price and duration**; filter
  services by category; view real work in the portfolio; read only genuine (moderated) reviews.
- **Acceptance criteria (Given/When/Then):**
  1. Given active services exist, when I open `/services`, then they render grouped by category
     with ₹ price, duration, and a Book button that deep-links into the booking flow.
  2. Given a service detail page, when opened, then it shows full description, CTA
     (Book + WhatsApp), related services, and fires `service_viewed` once.
  3. Given portfolio items, when I open `/portfolio`, then category chips filter the grid client-side.
  4. Given approved reviews, when I open `/reviews` or the home section, then a **Verified**
     badge shows for reviews tied to a booking.
- **Database:** `services`, `portfolio_items`, `reviews` (public read via RLS as configured).
- **Edge cases:** no image → branded placeholder; zero reviews → honest "Be the first to review"
  empty state (no fake content); unknown slug → 404.
- **Permissions:** public read; writes = `catalog.manage` / `portfolio.manage`.
- **Error/loading:** data fetch fails → static fallback content renders; images `next/image` with
  lazy loading; form submissions show inline pending state on the button.
- **Metrics:** service-detail views, `/book` entrances from catalogue, portfolio→book clicks.
- **Test:** T1 (entry), T4, T5.

---

## Module A3 — Booking Flow *(P1 — the core engine)*

- **Business problem:** every booking currently costs a DM conversation; after-hours requests
  are lost; double-bookings cause embarrassing disputes.
- **Persona:** time-poor customer booking between work meetings; owner who cannot answer calls
  during a shoot.
- **User stories:**
  1. As a customer, I pick a service, see only genuinely free slots, and get an instant booking code.
  2. As the studio, an invalid/unavailable request is **rejected with a human reason**, never silently accepted.
  3. As the front desk, I get the booking in my dashboard with contact + notes and a WhatsApp reply button.
- **Acceptance criteria:**
  1. Slot grid derives from `open_time/close_time/slot_interval_minutes`, minus `closed_weekdays`,
     minus `blocked_dates`, minus existing `pending/confirmed` bookings (duration-aware overlap),
     minus past times with `min_notice_hours` on today.
  2. Submitting an overlapping request returns `SLOT_TAKEN` and asks to re-pick (list refreshes).
  3. Success screen shows code, summary, prefilled WhatsApp confirm link, UPI advance line, and
     an .ics download.
  4. Phone validated (10-digit Indian mobile, optional +91); name required; email optional.
  5. Customer auto-created/updated by phone (CRM upsert inside the RPC).
- **Database:** `bookings` (+ snapshots), `customers` upsert, config from `site_content` + `blocked_dates`; RPC `create_booking`.
- **Edge cases:** double-submit guarded (button disabled during transition); service deactivated
  mid-flow → `SELECTED_SERVICE_UNAVAILABLE`; date rolled past midnight while form open →
  `DATE_IN_PAST`; slot stolen between render and submit → server is truth, client re-picks.
- **Permissions:** anon insert **only** via `create_booking` RPC; no direct table access.
- **Error/loading:** step errors inline; submit button shows "Confirming…"; conflict error names
  the problem and auto-scrolls to slot grid.
- **Metrics:** booking_started rate, submit success rate, % bookings confirmed < 24h.
- **Test:** T1, T3 (full conflict matrix).

---

## Module B — Customer CRM *(basic P1, full P2)*

- **Business problem:** repeat clients are the profit engine but the studio can't answer
  "who hasn't come back in 6 months?" or "what did Priya book last time?".
- **Persona:** front-desk manager preparing for the day; owner planning a re-engagement offer.
- **User stories:**
  1. As staff, I search a customer by phone/name and see history, spend, preferences, notes.
  2. As owner, I see segments (New / Repeat / VIP) and last-visit recency.
  3. As manager, I add a walk-in customer without a booking.
- **Acceptance criteria:** profile shows contact info, lifetime visits (completed), lifetime spend
  (Σ net totals of completed), last visit, preferred service (mode), editable notes, and the full
  booking list; search filters by name/phone; segment rules: New = 1 visit, Repeat = 2+,
  VIP = lifetime spend ≥ ₹50,000.
- **Database:** `customers` (phone unique), `bookings` join; `last_visit_at` maintained by trigger on completion.
- **Edge cases:** two people sharing one phone → records merge by design (family bookings);
  duplicate creation prevented by upsert-on-phone; customer with only cancelled bookings →
  spend ₹0, still visible with correct segment.
- **Permissions:** view = `customers.view` (staff allowed, money masked); manage = `customers.manage`.
- **Error/loading:** empty search → helpful empty state; profile 404 → back link.
- **Metrics:** repeat-customer rate, VIP count, note-usage on bookings.
- **Test:** T8 (masking), T2 follow-through.

---

## Module C — Smart Scheduling *(core P1, advanced calendar P2)*

- **Business problem:** double-bookings and forgotten appointments; blocked dates lived in the owner's head.
- **Persona:** owner checking the diary at night; front desk confirming tomorrow.
- **User stories:**
  1. As staff, I see the day's/week's appointments grouped by date with status colours.
  2. As owner, I block a date (festival/leave) and no one can book it.
  3. As manager, I reschedule with the same conflict safety as booking.
  4. As anyone, I tap WhatsApp to send a reminder (prefilled) — P1; automated reminders are P3.
- **Acceptance criteria:** admin bookings list filters by status/date/search and groups by day;
  reschedule runs `reschedule_booking` (excludes itself, re-validates hours/closed/blocked);
  cancellation requires reason note (stored in `admin_notes`); status set: pending → confirmed →
  completed | cancelled | no_show; blocked-dates manager lists upcoming with reason.
- **Database:** `bookings.appointment_date/time`, `blocked_dates`, config in `site_content`; RPC `reschedule_booking`.
- **Edge cases:** reschedule onto today < notice window → rejected; moving a completed booking →
  rejected; week containing closed days → shown with "Closed" divider; two managers reschedule
  concurrently → last-write-wins with fresh conflict check (RPC re-validates at write time).
- **Permissions:** view = `bookings.view`; manage = `bookings.manage`; blocked dates = `content.manage`.
- **Error/loading:** conflict error surfaces with the reason code; list shows skeletons only on
  filter change (fast local render otherwise).
- **Metrics:** no-show rate, reschedule rate, % days with blocked-date disputes (target: zero).
- **Test:** T3 matrix, T2.

---

## Module D — Financial Management *(rules + schema P1, UI P2)*

- **Business problem:** advances and revenue were mixed in one bank balance, so profit was a guess.
- **Persona:** owner doing monthly accounts.
- **User stories:** as owner, I see total sales, advances held, outstanding, refunds, discounts,
  expenses and estimated profit — filterable by date/service/payment status; **advances are never
  revenue** until service completion.
- **Acceptance criteria:** formulas exactly as `02-data-model.md` §4; per-booking payment
  lifecycle: unpaid → advance_paid → paid (+ refunded branch); recording a payment never mutates
  `total_price` snapshot.
- **Database:** `bookings.total_price/discount_amount/amount_paid/refund_amount/payment_status`;
  `expenses` (schema now, UI P2).
- **Edge cases:** overpayment > net total → capped by validation warning; refund after completion
  → `payment_status='refunded'`, revenue reduced in reports by rule; discount entered at booking
  time only (P2 adds approval flow); partial refund recorded as negative collection.
- **Permissions:** `finance.view` (manager+); staff UI masks all money.
- **Error/loading:** payment inputs validate integers ≥ 0; save shows inline pending; invalid
  amount rejected with message.
- **Metrics:** outstanding aging (P2), collection rate on completion day, margin vs expenses.
- **Test:** T7.

---

## Module E — Lead & Marketing Management *(P1 pipeline, P2 analytics)*

- **Business problem:** Instagram/WhatsApp enquiries died in inboxes; nobody knew which channel
  produced paying clients.
- **Persona:** manager triaging today's enquiries; owner planning where to spend ad money.
- **User stories:**
  1. As a manager, every enquiry (website form, or entered manually from a DM/call) lands in one
     pipeline with source.
  2. As a manager, I set follow-up dates and see what's due.
  3. As owner, I see conversion and lost-reason totals per source.
- **Acceptance criteria:** pipeline statuses new → contacted → follow_up → converted | lost;
  website form captures source automatically (`website`); follow-up date + status change are
  one-click from the row; "lost" requires a reason; converted leads link `converted_booking_id`
  when a booking is created from them (manual tie-in P1).
- **Database:** `leads` (+ unique-ish identity by phone in CRM on conversion), `source_channel`.
- **Edge cases:** duplicate enquiry from same phone → allowed (new intent), but CRM link shows
  existing customer; follow-up date in past → shows red "overdue"; lead converted then booking
  cancelled → status stays converted with note (truth of process).
- **Permissions:** view = `leads.view`; manage = `leads.manage`.
- **Error/loading:** status select optimistic with rollback on failure + toast; empty pipeline →
  guided empty state.
- **Metrics:** lead→booking conversion rate, response time, source mix, overdue follow-ups = 0.
- **Test:** T11 journey B.

---

## Module F — Staff Management *(profile layer P1, scheduling P3)*

- **Business problem:** the business will hire; there's no record of skills, schedules or output.
- **Persona:** owner onboarding an assistant artist.
- **User stories:** as owner, I maintain staff profiles (role, specialties, bio, photo, active);
  as P3, bookings assign to artists and performance reports rank them.
- **Acceptance criteria (P1):** staff list + edit form; founder card renders on the home About
  section; `assigned_staff_id` column exists and is settable (nullable) so P3 lands without
  migration pain; commission fields deferred to P3 (not built — no fake features).
- **Database:** `staff_members`, nullable FK on `bookings`.
- **Edge cases:** deactivating staff with future bookings → warning lists affected bookings;
  two staff with same name → distinguished by id.
- **Permissions:** manage = `users.manage` (owner) + manager for operational fields.
- **Error/loading:** form validation inline; delete blocked when bookings exist (soft-deactivate instead).
- **Metrics:** bookings per artist (P3), utilization.
- **Test:** owner can add/edit a staff card (P1 scope).

---

## Module G — Course & Student Management *(P2)*

- **Business problem:** makeup classes are the biggest margin line but run entirely on WhatsApp.
- **Persona:** aspiring student; owner managing batches + fees.
- **User stories:** as a student, I enquire/register for a course; as owner, I manage a course
  catalogue, batches with seats, attendance, fee instalments, progress notes.
- **Acceptance criteria (P2 definition):** course catalogue page + enquiry form (reuses lead
  pipeline tagged `course_enquiry`); student profile = customer profile + course records;
  batch = dates, seats, roster; fee ledger per student (instalments); progress checklist.
  **Certificates: NOT built** — business confirmed they don't issue certificates. Revisit only
  on owner request.
- **Database (P2):** `courses`, `batches`, `batch_students`, `attendance`, `course_fees`.
- **Edge cases:** batch full → waitlist state; fee part-paid at batch end → flagged outstanding;
  student switches batch mid-course → history preserved.
- **Permissions:** manage = manager+; enquiries visible to `leads.view`.
- **Error/loading:** standard form patterns; fee ledger validates totals against course price.
- **Metrics:** course enquiry conversion, seats filled %, instalment collection rate.
- **Test:** walkthrough P2.4.

---

## Module H — Reviews & Customer Retention *(P1 moderation, P2 campaigns)*

- **Business problem:** genuine 5-star WhatsApp messages were invisible to new customers; there
  was no structured follow-up.
- **Persona:** bride deciding between studios; owner wanting social proof.
- **User stories:** as a customer, I leave a rating + comment (optionally tied to my booking code);
  as owner, I approve/reject; as system, verified-booking reviews show a badge; as owner, I run
  follow-up lists (P2: automated).
- **Acceptance criteria:** review submit → `is_approved=false`, never publicly visible until
  approved; if `booking_code + phone` match a booking → `is_verified=true` + linked booking +
  customer; admin sees pending queue with approve/reject(+reason)/delete; public pages show only
  approved; retention lists (New/Repeat/VIP + last-visit recency) drive WhatsApp campaigns in P2.
- **Database:** `reviews` (rating 1–5 check constraint), links to `bookings`/`customers`.
- **Edge cases:** review code belongs to another phone → saved unverified (no error, honest badge);
  rating bounds enforced server-side; spam repetition from same phone → rate-limited by simple
  same-phone pending check; owner's own edits never alter customer text (moderation = approve/hide only).
- **Permissions:** submit = anon via `submit_review` RPC; moderate = `reviews.moderate`.
- **Error/loading:** stars widget with keyboard/touch targets; success = "submitted for approval";
  rejection toast on validation failure.
- **Metrics:** verified-review share, reviews per 10 completed bookings, repeat rate trend.
- **Test:** T11 journey A tail.

---

## Module I — Business Intelligence Dashboard *(lite P1, full P2)*

- **Business problem:** the owner needs one screen that says "how is the business doing today?"
- **Persona:** owner, morning coffee, 60 seconds.
- **User stories:** as owner, I see today's diary, pending confirmations, this month's collected/
  recognized/outstanding money, new leads, pending reviews — and drill into each.
- **Acceptance criteria:** cards compute from live DB per `02-data-model.md` §4; finance cards
  render only for `finance.view` roles; each card links to its filtered list.
- **Database:** aggregate queries over `bookings`, `leads`, `reviews`.
- **Edge cases:** month boundary mid-session → filters use explicit month range (no "last 30 days"
  ambiguity); no data → zeroed cards with "no bookings yet" copy.
- **Permissions:** `bookings.view` for operational cards; `finance.view` gates money cards.
- **Error/loading:** graceful "—" on query failure, never a crash.
- **Metrics:** time-to-answer (the card set should answer: work today? money healthy? leads alive?).
- **Test:** T7 numbers.

---

## Module J — Role-Based Access Control *(P1 core, P3 hardening)*

Full spec: `03-rbac.md`. Key acceptance: middleware + layout + action-level `requireRole` +
RLS policies all active; role escalation only by super_admin; staff never sees money. **Test: T8, T10.**

---

## Module K — Product Analytics *(P1)*

- **Business problem:** we can't improve conversion we can't see.
- **User stories:** as owner, I know how many service views became bookings this week; as
  developer, I have one `track()` call and one table.
- **Acceptance criteria:** events tracked exactly: `service_viewed`, `booking_started`,
  `booking_submitted`, `booking_confirmed` (admin confirm action logs actor), `enquiry_submitted`,
  `whatsapp_cta_clicked`, `course_enquiry_submitted` (P2). Payload = name + path + non-personal
  meta only. Insert = anon RLS insert; reads manager+.
- **Edge cases:** ad-blocker/Supabase down → tracking silently no-ops (never breaks UX); duplicate
  service_viewed on refresh accepted (sessionless honesty).
- **Permissions:** public insert, `analytics.view` read.
- **Error/loading:** n/a (fire-and-forget).
- **Metrics:** funnel service_viewed → booking_started → booking_submitted; enquiry rate.
- **Test:** rows appear in `events` after a scripted journey (part of T11).

---

## Module L — Standards *(how every module above was built)*

The 10-point list is applied per module (visible in each section above). Journey tests map to
`06-acceptance-criteria.md`. Anything without a metric or a journey test was cut — the parking
lot lives in the roadmap's sequencing rules.
