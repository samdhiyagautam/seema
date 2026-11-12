# 03 — Role-Based Access Control (Module J)

## 1. Roles

| Role | Real person | One-line mandate |
|---|---|---|
| **super_admin** | Seema (owner) | Everything, including user roles |
| **manager** | Front-desk / studio manager | Runs operations + money, cannot manage user roles |
| **staff** | Artist | Sees the diary and own work, sees no money |
| **content_manager** | Freelance social/website person | Catalogue, portfolio, reviews, website copy only |

## 2. Permission matrix (capabilities)

| Capability | super_admin | manager | staff | content_manager |
|---|---|---|---|---|
| bookings.view | ✅ | ✅ | ✅ (money masked) | ❌ |
| bookings.manage (status/reschedule/payments/cancel) | ✅ | ✅ | ❌ | ❌ |
| customers.view | ✅ | ✅ | ✅ | ❌ |
| customers.manage (notes, edit) | ✅ | ✅ | ❌ | ❌ |
| leads.view | ✅ | ✅ | ✅ | ❌ |
| leads.manage | ✅ | ✅ | ❌ | ❌ |
| catalog.manage (services CRUD) | ✅ | ✅ | ❌ | ✅ |
| portfolio.manage | ✅ | ✅ | ❌ | ✅ |
| reviews.moderate | ✅ | ✅ | ❌ | ✅ |
| content.manage (site copy, hours, availability) | ✅ | ✅ | ❌ | ✅ |
| finance.view (dashboard money cards, Ph2 finance) | ✅ | ✅ | ❌ | ❌ |
| analytics.view | ✅ | ✅ | ❌ | ❌ |
| users.manage (roles) | ✅ | ❌ | ❌ | ❌ |

Code: `lib/rbac.ts` (`PERMISSIONS` map + `can()`). UI: `components/admin/Sidebar.tsx` filters nav
by capability; pages hide/mask sections (finance cards render only with `finance.view`).

## 3. Enforcement points (defense in depth)

1. **Middleware** (`middleware.ts`): no session → `/admin/*` redirects to `/admin/login`.
2. **Admin layout**: loads `profiles.role`; a signed-in user without a profile sees "no access".
3. **Server actions**: every mutating action calls `requireRole(capability)` and throws
   `FORBIDDEN` before touching data. UI hiding is convenience, not security.
4. **Database RLS**: the policies in `02-data-model.md` §6 are the final gate — a stolen browser
   session still cannot read bookings without the right role, even via crafted API calls.
5. **RPCs** (`create_booking`, `reschedule_booking`, `submit_review`) validate internally —
   anonymous visitors never need direct insert rights on `bookings`/`reviews`.

## 4. Rules

- Only `super_admin` can change a `profiles.role` (SQL in README §Create the first admin).
- `staff` role sees operational data only; column-level financial masking is UI-level in Phase 1
  and moves to DB views in Phase 3 hardening (documented limitation).
- Every role change and destructive delete is logged to `events` with actor id in meta.
