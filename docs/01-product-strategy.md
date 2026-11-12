# 01 — Product Strategy

## 1. The complete customer journey

Every stage has an owner metric and a platform capability that moves it:

| # | Stage | Customer's question | Platform capability | Success metric |
|---|-------|--------------------|---------------------|----------------|
| 1 | **Discovery** | "Is this studio good?" | SEO-ready pages, JSON-LD local business schema, shareable links, Google/Instagram bios → site | Weekly sessions, branded search impressions |
| 2 | **Service Exploration** | "What do they offer, what does it cost?" | Service catalogue with transparent **price + duration**, portfolio proof, reviews | Service-detail views per session |
| 3 | **Enquiry** | "Can I ask something first?" | Enquiry form + WhatsApp CTA on every screen, lead source captured | Enquiry submit rate, response time |
| 4 | **Booking** | "Can I get that Saturday 11 AM slot?" | Self-serve slot picker with live conflict detection | Booking start → submit conversion |
| 5 | **Confirmation** | "Is my slot actually held?" | Instant booking code + prefilled WhatsApp confirmation + UPI advance instructions | % bookings confirmed within 24h |
| 6 | **Appointment** | "Will they remember me?" | Admin dashboard, day-of view, WhatsApp reminder button, blocked-date protection | No-show rate, reschedule rate |
| 7 | **Payment** | "How much and when do I pay?" | Advance/balance recorded per booking; finance module separates advances from earned revenue | % fully paid on completion day |
| 8 | **Feedback** | "Was it worth it?" | Post-visit review request (WhatsApp), moderated reviews with **verified-booking badge** | Reviews submitted per 10 completed bookings |
| 9 | **Repeat Booking** | "I'll come back for the next function" | CRM segments (New / Repeat / VIP), follow-up dates, WhatsApp one-tap rebooking | Repeat rate, 90-day rebooking window |

## 2. The six business outcomes and their levers

| Outcome | Levers the platform pulls | Where it lives |
|---|---|---|
| **Customer acquisition** | Transparent pricing (Google searchers convert), verified reviews, portfolio, WhatsApp shareability | Storefront |
| **Booking conversion** | Slot picker with real availability, 3-step booking, instant code + WhatsApp reassurance, UPI advance | `/book` |
| **Customer retention** | Repeat/VIP segments, follow-up dates on leads AND customers, WhatsApp reminder buttons, review loop | CRM, Leads |
| **Revenue visibility** | One finance truth: advances ≠ revenue; outstanding tracked per booking; expenses groundwork | Finance (Ph 2), dashboard |
| **Operational efficiency** | Single dashboard, statuses instead of chat scrolls, conflict detection instead of diary disputes, content CMS | Admin |
| **Business growth** | Lead pipeline with sources, course module (Ph 2), analytics events feeding decisions | Leads, Events |

## 3. Positioning choices

1. **WhatsApp is the connective tissue.** Every confirmation, reminder, review request and
   follow-up has a prefilled WhatsApp action. This matches real buyer behaviour and costs nothing
   until Phase 3 justifies the Business API.
2. **Self-serve booking, human confirmation.** Customers pick a real slot (system-validated),
   but the studio confirms — protecting against edge cases and creating a personal touchpoint.
3. **Advances are collected via UPI**, recorded as *collections*, and only recognized as
   revenue when the service is delivered (see `02-data-model.md` § Finance). This prevents the
   classic "we made ₹2L!" double-counting mistake.
4. **The studio's diary is the database.** Blocked dates, closed weekdays and working hours are
   config, not code — the owner changes them from the admin panel.

## 4. Anti-goals (what we will NOT do)

- No fake scarcity/counters, no bought reviews, no dark patterns.
- No building Phase 2/3 features before Phase 1 acceptance tests pass (gated in `05-roadmap.md`).
- No personal data collection beyond what operations require (module K privacy rule).
