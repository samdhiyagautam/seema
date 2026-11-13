-- ============================================================================
-- SEEMA MAKEOVER STUDIO — 0002_phase2.sql
-- Phase 2 "Business Operations": courses & students, fee ledger, course
-- enquiries, plus verification views for the finance math (docs/02 §4).
-- Run AFTER 0001_init.sql in the Supabase SQL Editor.
-- ============================================================================

-- ---------------------------------------------------------------- enums
create type enrollment_status as enum ('active', 'completed', 'dropped');
create type batch_status as enum ('upcoming', 'ongoing', 'completed');

-- ---------------------------------------------------------------- courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null default 'Makeup',
  summary text,
  description text,
  syllabus text,                              -- one topic per line
  duration_days int not null default 30,
  fee_inr int not null default 0,
  kit_included boolean not null default false,
  image_url text,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_courses_touch before update on public.courses
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- batches
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,                         -- e.g. "April 2026 - Morning"
  start_date date not null,
  end_date date,
  schedule text,                              -- e.g. "Mon-Fri, 11am-2pm"
  capacity int not null default 6,
  status batch_status not null default 'upcoming',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- students
create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text unique not null,
  email text,
  source source_channel not null default 'walk_in',
  notes text,
  joined_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- enrollments
-- Fee header. `course_name` and `fee_inr` are SNAPSHOTS (same rule as
-- bookings): later price edits never rewrite a student's ledger.
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id),
  batch_id uuid references public.batches(id),
  course_name text not null,                  -- snapshot
  fee_inr int not null default 0,             -- snapshot (list fee)
  discount_amount int not null default 0,
  amount_paid int not null default 0,         -- maintained by fee_payments trigger
  status enrollment_status not null default 'active',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_enrollments_touch before update on public.enrollments
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------ fee_payments
-- Itemized fee ledger. Insert a payment row -> trigger re-sums the student's
-- `amount_paid`. Delete a row (typo fix) -> re-summed the same way.
create table public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  paid_on date not null default current_date,
  amount_inr int not null check (amount_inr > 0),
  method text not null default 'upi',         -- upi | cash | bank | other
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.sync_enrollment_paid() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_enrollment uuid;
begin
  v_enrollment := coalesce(new.enrollment_id, old.enrollment_id);
  if v_enrollment is not null then
    update public.enrollments
      set amount_paid = (
        select coalesce(sum(p.amount_inr), 0)
        from public.fee_payments p
        where p.enrollment_id = v_enrollment
      )
    where id = v_enrollment;
  end if;
  return coalesce(new, old);
end $$;

create trigger trg_fee_payments_sync
after insert or update or delete on public.fee_payments
for each row execute function public.sync_enrollment_paid();

-- -------------------------------------------------------- course_enquiries
-- Public "I want to learn" form. Reuses lead_status for the pipeline.
create table public.course_enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  course_id uuid references public.courses(id),
  course_name text,                           -- free text when course row missing
  message text,
  status lead_status not null default 'new',
  converted_enrollment_id uuid references public.enrollments(id),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_course_enquiries_touch before update on public.course_enquiries
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- indexes
create index idx_courses_active on public.courses (is_active, display_order);
create index idx_batches_course on public.batches (course_id, start_date);
create index idx_enrollments_student on public.enrollments (student_id);
create index idx_enrollments_batch on public.enrollments (batch_id);
create index idx_fee_payments_enrollment on public.fee_payments (enrollment_id, paid_on);
create index idx_course_enquiries_status on public.course_enquiries (status, created_at desc);

-- ============================================================================
-- FINANCE VIEWS — the exact math from docs/02 §4, so the owner can verify
-- every admin number with one SELECT (acceptance P2.1 / P2.3 / P2.5).
-- security_invoker = on keeps RLS: viewers only see what their role can see.
-- ============================================================================

create or replace view public.finance_monthly
with (security_invoker = true) as
with months as (
  select (date_trunc('month', current_date) - (n || ' months')::interval)::date as month
  from generate_series(0, 11) as n
),
b as (
  select
    date_trunc('month', appointment_date) as month,
    sum(total_price - discount_amount) filter (where status = 'completed') as recognized_revenue,
    count(*) filter (where status = 'completed') as completed_bookings,
    sum(amount_paid) filter (where status in ('pending','confirmed')) as advance_collections,
    sum(greatest(total_price - discount_amount - amount_paid, 0))
      filter (where status in ('confirmed','completed')) as outstanding,
    sum(refund_amount) filter (where payment_status = 'refunded') as refunds,
    count(*) as all_bookings,
    count(*) filter (where status in ('completed','cancelled','no_show')) as closed_bookings
  from public.bookings
  group by 1
),
e as (
  select date_trunc('month', spent_on) as month, sum(amount_inr) as expenses
  from public.expenses
  group by 1
)
select
  to_char(m.month, 'YYYY-MM') as month,
  coalesce(b.recognized_revenue, 0) as recognized_revenue,
  coalesce(b.completed_bookings, 0) as completed_bookings,
  coalesce(b.advance_collections, 0) as advance_collections,
  coalesce(b.outstanding, 0) as outstanding,
  coalesce(b.refunds, 0) as refunds,
  coalesce(e.expenses, 0) as expenses,
  coalesce(b.recognized_revenue, 0) - coalesce(e.expenses, 0) as estimated_profit,
  round(
    coalesce(b.recognized_revenue, 0)
    / greatest(b.completed_bookings, 1)
  )::int as avg_booking_value,
  round(
    100.0 * coalesce(b.closed_bookings, 0) / greatest(b.all_bookings, 1)
  )::int as completion_rate_pct
from months m
left join b on b.month = m.month
left join e on e.month = m.month
order by m.month desc;

create or replace view public.customer_stats
with (security_invoker = true) as
select
  c.id,
  c.full_name,
  c.phone,
  count(b.id) as total_bookings,
  count(*) filter (where b.status = 'completed') as visits,
  coalesce(sum(b.total_price - b.discount_amount) filter (where b.status = 'completed'), 0) as lifetime_value,
  coalesce(sum(greatest(b.total_price - b.discount_amount - b.amount_paid, 0))
    filter (where b.status in ('confirmed','completed')), 0) as outstanding,
  max(b.appointment_date) filter (where b.status = 'completed') as last_completed_on
from public.customers c
left join public.bookings b on b.customer_id = c.id
group by c.id;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.courses          enable row level security;
alter table public.batches          enable row level security;
alter table public.students         enable row level security;
alter table public.enrollments      enable row level security;
alter table public.fee_payments     enable row level security;
alter table public.course_enquiries enable row level security;

-- courses (same posture as services) -----------------------------------------
create policy "courses public read active" on public.courses for select
  using (is_active);
create policy "courses admin read all" on public.courses for select
  to authenticated using (public.app_current_role() is not null);
create policy "courses write" on public.courses for all
  to authenticated
  using (public.app_current_role() in ('super_admin', 'manager'))
  with check (public.app_current_role() in ('super_admin', 'manager'));

-- batches (public site shows upcoming batches) --------------------------------
create policy "batches public read" on public.batches for select using (true);
create policy "batches write" on public.batches for all
  to authenticated
  using (public.app_current_role() in ('super_admin', 'manager'))
  with check (public.app_current_role() in ('super_admin', 'manager'));

-- students --------------------------------------------------------------------
create policy "students ops read" on public.students for select
  to authenticated using (public.app_current_role() in ('super_admin', 'manager', 'staff'));
create policy "students manage" on public.students for all
  to authenticated
  using (public.app_current_role() in ('super_admin', 'manager'))
  with check (public.app_current_role() in ('super_admin', 'manager'));

-- enrollments -----------------------------------------------------------------
create policy "enrollments ops read" on public.enrollments for select
  to authenticated using (public.app_current_role() in ('super_admin', 'manager', 'staff'));
create policy "enrollments manage" on public.enrollments for all
  to authenticated
  using (public.app_current_role() in ('super_admin', 'manager'))
  with check (public.app_current_role() in ('super_admin', 'manager'));

-- fee_payments (money ledger: super_admin + manager only) ---------------------
create policy "fee payments finance" on public.fee_payments for all
  to authenticated using (public.app_current_role() in ('super_admin', 'manager'))
  with check (public.app_current_role() in ('super_admin', 'manager'));

-- course_enquiries -------------------------------------------------------------
create policy "course enquiries public submit" on public.course_enquiries for insert
  to anon, authenticated with check (true);
create policy "course enquiries ops read" on public.course_enquiries for select
  to authenticated using (public.app_current_role() in ('super_admin', 'manager', 'staff'));
create policy "course enquiries manage" on public.course_enquiries for all
  to authenticated
  using (public.app_current_role() in ('super_admin', 'manager'))
  with check (public.app_current_role() in ('super_admin', 'manager'));

-- ============================================================================
-- SEED — starter course catalogue (idempotent)
-- ============================================================================

insert into public.courses
  (slug, name, category, summary, description, syllabus, duration_days, fee_inr, kit_included, display_order)
values
  ('professional-makeup-course',
   'Professional Makeup Artistry Course',
   'Makeup',
   'Our flagship course: from skin prep to bridal finishes, taught hands-on on real models.',
   'A complete foundation for a career in makeup artistry. You practise on real models every week, learn kit building on a budget, and finish with a portfolio shoot that gets your first clients.',
   E'Skin prep and hygiene\nBase work for every Indian skin tone\nEyes: from soft glam to bold bridal\nBrow and lash techniques\nDraping and hairstyle basics\nClient handling and pricing\nPortfolio shoot day',
   45, 45000, true, 1),
  ('advanced-bridal-course',
   'Advanced Bridal Makeup Course',
   'Makeup',
   'For working artists who want the bridal edge: HD, airbrush and long-wear techniques.',
   'Level-up training for artists already doing client work. Covers HD and airbrush machines, sweat-proof monsoon bases, and the full bridal workflow from trial to reception touch-ups.',
   E'HD vs airbrush: when and why\nAirbrush machine hands-on\nSweat-proof and photo-ready bases\nInternational bridal trends\nTrial consultations that convert\nDay-of workflow and team coordination',
   21, 30000, false, 2),
  ('self-grooming-course',
   'Self Grooming Course',
   'Personal',
   'Look polished every day: personal makeup and hairstyling in six friendly sessions.',
   'Learn to do your own everyday and occasion makeup, drape any saree in minutes, and style your hair for every function. Small batch, lots of individual attention, zero pressure.',
   E'Everyday 5-minute base\nOffice and college looks\nFestive makeup\nSaree and dupatta draping\nBasic hairstyling for yourself\nSkincare habits that matter',
   12, 8000, false, 3)
on conflict (slug) do nothing;
