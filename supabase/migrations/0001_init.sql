-- ============================================================================
-- SEEMA MAKEOVER STUDIO — 0001_init.sql
-- Run top-to-bottom in Supabase SQL Editor (docs/02-data-model.md is the spec).
-- ============================================================================

-- ---------------------------------------------------------------- enums
create type app_role as enum ('super_admin', 'manager', 'staff', 'content_manager');
create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type payment_status as enum ('unpaid', 'advance_paid', 'paid', 'refunded');
create type lead_status as enum ('new', 'contacted', 'follow_up', 'converted', 'lost');
create type source_channel as enum
  ('website', 'instagram', 'whatsapp', 'facebook', 'youtube', 'referral', 'walk_in', 'phone', 'other');

-- ---------------------------------------------------------------- helpers
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Admin',
  email text,
  role app_role not null default 'content_manager',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'content_manager')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role lookup used by every RLS policy (SECURITY DEFINER avoids recursion).
create or replace function public.app_current_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------- staff
create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role_title text not null default 'Artist',
  bio text,
  specialties text[] not null default '{}',
  phone text,
  image_url text,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- services
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null default 'Makeup',
  description text,
  duration_minutes int not null default 60,
  price_inr int not null default 0,
  image_url text,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_services_touch before update on public.services
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text unique not null,
  email text,
  source source_channel,
  notes text,
  created_at timestamptz not null default now(),
  last_visit_at timestamptz
);

-- ---------------------------------------------------------------- bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_id uuid not null references public.customers(id),
  service_id uuid not null references public.services(id),
  service_name text not null,                -- snapshot
  duration_minutes int not null,             -- snapshot
  total_price int not null default 0,        -- snapshot (list price)
  discount_amount int not null default 0,
  amount_paid int not null default 0,
  refund_amount int not null default 0,
  appointment_date date not null,
  appointment_time time not null,
  status booking_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  channel source_channel not null default 'website',
  assigned_staff_id uuid references public.staff_members(id),
  notes text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- Maintain CRM last visit on completion
create or replace function public.set_last_visit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    update public.customers set last_visit_at = (new.appointment_date + new.appointment_time)
    where id = new.customer_id;
  end if;
  return new;
end $$;

create trigger trg_bookings_last_visit after update on public.bookings
  for each row execute function public.set_last_visit();

-- ---------------------------------------------------------------- leads
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  source source_channel not null default 'website',
  service_interest text,
  message text,
  status lead_status not null default 'new',
  follow_up_on date,
  lost_reason text,
  converted_booking_id uuid references public.bookings(id),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  booking_id uuid references public.bookings(id),
  author_name text not null,
  author_phone text,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  is_approved boolean not null default false,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- portfolio
create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Bridal',
  description text,
  image_url text not null,
  is_published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- content CMS
create table public.site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create trigger trg_site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- availability
create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_on date unique not null,
  reason text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- finance (Phase 2 groundwork)
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null,
  category text not null,
  description text,
  amount_inr int not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- analytics events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- indexes
create index idx_bookings_date on public.bookings (appointment_date);
create index idx_bookings_status on public.bookings (status);
create index idx_bookings_customer on public.bookings (customer_id);
create index idx_leads_status on public.leads (status);
create index idx_leads_created on public.leads (created_at desc);
create index idx_reviews_approved on public.reviews (is_approved, created_at desc);
create index idx_services_active on public.services (is_active, display_order);
create index idx_events_name on public.events (name, created_at desc);

-- ============================================================================
-- SCHEDULING RPCs — atomic validation + insert (no anon row access needed)
-- ============================================================================

create or replace function public.assert_slot_free(
  p_date date, p_time time, p_duration int, p_exclude uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_open text; v_close text; v_lead int; v_end time;
begin
  if p_date < current_date then
    raise exception 'DATE_IN_PAST';
  end if;

  if exists (select 1 from public.blocked_dates where blocked_on = p_date) then
    raise exception 'DATE_BLOCKED';
  end if;

  if exists (
    select 1 from public.site_content
    where key = 'closed_weekdays'
      and value::jsonb ? (extract(isodow from p_date))::int::text
  ) then
    raise exception 'DAY_CLOSED';
  end if;

  select coalesce(nullif(value, ''), '10:00') into v_open
    from public.site_content where key = 'open_time';
  select coalesce(nullif(value, ''), '19:00') into v_close
    from public.site_content where key = 'close_time';
  select coalesce(nullif(value, '')::int, 0) into v_lead
    from public.site_content where key = 'min_notice_hours';

  v_end := p_time + make_interval(mins => p_duration);

  if p_date = current_date and p_time < (localtime + make_interval(hours => v_lead)) then
    raise exception 'TOO_LATE';
  end if;

  if p_time < v_open::time or v_end > v_close::time then
    raise exception 'OUTSIDE_HOURS';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.appointment_date = p_date
      and b.status in ('pending', 'confirmed')
      and (p_exclude is null or b.id <> p_exclude)
      and (b.appointment_time, b.appointment_time + make_interval(mins => b.duration_minutes))
          overlaps (p_time, v_end)
  ) then
    raise exception 'SLOT_TAKEN';
  end if;
end $$;

-- Public booking creation: validates slot, upserts customer by phone, inserts booking.
-- Returns the booking code. Raises coded exceptions mapped in lib/validations.ts.
create or replace function public.create_booking(
  p_name text, p_phone text, p_email text default null,
  p_service_id uuid, p_date date, p_time time,
  p_notes text default null, p_source source_channel default 'website'
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_service public.services;
  v_customer uuid;
  v_code text;
begin
  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'INVALID_NAME';
  end if;
  if p_phone is null or p_phone !~ '^(\+?91[-\s]?)?[6-9]\d{9}$' then
    raise exception 'INVALID_PHONE';
  end if;

  select * into v_service from public.services
    where id = p_service_id and is_active;
  if not found then
    raise exception 'SELECTED_SERVICE_UNAVAILABLE';
  end if;

  perform public.assert_slot_free(p_date, p_time, v_service.duration_minutes);

  insert into public.customers (full_name, phone, email, source)
  values (trim(p_name), p_phone, nullif(trim(coalesce(p_email, '')), ''), p_source)
  on conflict (phone) do update
    set full_name = excluded.full_name,
        email = coalesce(excluded.email, public.customers.email)
  returning id into v_customer;

  loop
    v_code := 'BK-' || to_char(p_date, 'YYMMDD') || '-' ||
              upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    exit when not exists (select 1 from public.bookings where code = v_code);
  end loop;

  insert into public.bookings
    (code, customer_id, service_id, service_name, duration_minutes, total_price,
     appointment_date, appointment_time, channel, notes)
  values
    (v_code, v_customer, p_service_id, v_service.name, v_service.duration_minutes,
     v_service.price_inr, p_date, p_time, p_source, nullif(trim(coalesce(p_notes, '')), ''));

  return v_code;
end $$;

-- Admin reschedule with the same conflict safety (excludes the booking itself).
create or replace function public.reschedule_booking(
  p_booking_id uuid, p_date date, p_time time
) returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
begin
  if public.app_current_role() not in ('super_admin', 'manager') then
    raise exception 'FORBIDDEN';
  end if;

  select * into b from public.bookings where id = p_booking_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if b.status in ('completed', 'cancelled') then raise exception 'INVALID_STATUS'; end if;

  perform public.assert_slot_free(p_date, p_time, b.duration_minutes, p_booking_id);

  update public.bookings
    set appointment_date = p_date, appointment_time = p_time, updated_at = now()
  where id = p_booking_id;
end $$;

-- Public review submission; verified when booking code + phone match.
create or replace function public.submit_review(
  p_name text, p_phone text, p_rating int, p_comment text, p_booking_code text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'INVALID_RATING'; end if;
  if p_name is null or length(trim(p_name)) < 2 then raise exception 'INVALID_NAME'; end if;
  if p_comment is null or length(trim(p_comment)) < 10 then raise exception 'INVALID_COMMENT'; end if;

  if p_booking_code is not null and length(trim(p_booking_code)) > 3 then
    select b.* into v_booking
    from public.bookings b
    join public.customers c on c.id = b.customer_id
    where upper(b.code) = upper(trim(p_booking_code)) and c.phone = p_phone
    limit 1;
  end if;

  insert into public.reviews
    (author_name, author_phone, rating, comment, booking_id, customer_id, is_verified, is_approved)
  values
    (trim(p_name), p_phone, p_rating, trim(p_comment),
     v_booking.id, v_booking.customer_id, v_booking.id is not null, false);
end $$;

grant execute on function public.create_booking(text, text, text, uuid, date, time, text, source_channel)
  to anon, authenticated;
grant execute on function public.submit_review(text, text, int, text, text) to anon, authenticated;
grant execute on function public.reschedule_booking(uuid, date, time) to authenticated;
grant execute on function public.assert_slot_free(date, time, int, uuid) to authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.staff_members  enable row level security;
alter table public.services       enable row level security;
alter table public.customers      enable row level security;
alter table public.bookings       enable row level security;
alter table public.leads          enable row level security;
alter table public.reviews        enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.site_content   enable row level security;
alter table public.blocked_dates  enable row level security;
alter table public.expenses       enable row level security;
alter table public.events         enable row level security;

-- profiles ------------------------------------------------------------------
create policy "profiles read own" on public.profiles for select
  to authenticated using (id = auth.uid());
create policy "profiles admins read" on public.profiles for select
  to authenticated using (public.app_current_role() in ('super_admin', 'manager'));
create policy "profiles super admin manage" on public.profiles for update
  to authenticated using (public.app_current_role() = 'super_admin');

-- staff_members -------------------------------------------------------------
create policy "staff read all" on public.staff_members for select using (true);
create policy "staff leadership write" on public.staff_members for all
  to authenticated using (public.app_current_role() in ('super_admin', 'manager'))
  with check (public.app_current_role() in ('super_admin', 'manager'));

-- services ------------------------------------------------------------------
create policy "services public read active" on public.services for select
  using (is_active);
create policy "services admin read all" on public.services for select
  to authenticated using (public.app_current_role() is not null);
create policy "services catalog write" on public.services for insert
  to authenticated with check (public.app_current_role() in ('super_admin', 'manager', 'content_manager'));
create policy "services catalog update" on public.services for update
  to authenticated using (public.app_current_role() in ('super_admin', 'manager', 'content_manager'));
create policy "services catalog delete" on public.services for delete
  to authenticated using (public.app_current_role() in ('super_admin', 'manager', 'content_manager'));

-- customers (anon access only via create_booking RPC) ------------------------
create policy "customers ops read" on public.customers for select
  to authenticated using (public.app_current_role() in ('super_admin', 'manager', 'staff'));
create policy "customers manage" on public.customers for update
  to authenticated using (public.app_current_role() in ('super_admin', 'manager'));
create policy "customers admin create" on public.customers for insert
  to authenticated with check (public.app_current_role() in ('super_admin', 'manager'));

-- bookings (anon access only via RPCs) ---------------------------------------
create policy "bookings ops read" on public.bookings for select
  to authenticated using (public.app_current_role() in ('super_admin', 'manager', 'staff'));
create policy "bookings manage" on public.bookings for update
  to authenticated using (public.app_current_role() in ('super_admin', 'manager'));
create policy "bookings super admin delete" on public.bookings for delete
  to authenticated using (public.app_current_role() = 'super_admin');

-- leads ----------------------------------------------------------------------
create policy "leads public submit" on public.leads for insert
  to anon, authenticated with check (true);
create policy "leads ops read" on public.leads for select
  to authenticated using (public.app_current_role() in ('super_admin', 'manager', 'staff'));
create policy "leads manage" on public.leads for update
  to authenticated using (public.app_current_role() in ('super_admin', 'manager'));
create policy "leads admin create" on public.leads for insert
  to authenticated with check (public.app_current_role() in ('super_admin', 'manager'));
create policy "leads admin delete" on public.leads for delete
  to authenticated using (public.app_current_role() in ('super_admin', 'manager'));

-- reviews (anon submit only via submit_review RPC) ---------------------------
create policy "reviews public read approved" on public.reviews for select
  using (is_approved);
create policy "reviews admin read all" on public.reviews for select
  to authenticated using (public.app_current_role() is not null);
create policy "reviews moderate" on public.reviews for update
  to authenticated using (public.app_current_role() in ('super_admin', 'manager', 'content_manager'));
create policy "reviews delete" on public.reviews for delete
  to authenticated using (public.app_current_role() in ('super_admin', 'manager', 'content_manager'));

-- portfolio ------------------------------------------------------------------
create policy "portfolio public read published" on public.portfolio_items for select
  using (is_published);
create policy "portfolio admin read all" on public.portfolio_items for select
  to authenticated using (public.app_current_role() is not null);
create policy "portfolio write" on public.portfolio_items for all
  to authenticated
  using (public.app_current_role() in ('super_admin', 'manager', 'content_manager'))
  with check (public.app_current_role() in ('super_admin', 'manager', 'content_manager'));

-- site_content ----------------------------------------------------------------
create policy "content public read" on public.site_content for select using (true);
create policy "content write" on public.site_content for all
  to authenticated
  using (public.app_current_role() in ('super_admin', 'manager', 'content_manager'))
  with check (public.app_current_role() in ('super_admin', 'manager', 'content_manager'));

-- blocked_dates ---------------------------------------------------------------
create policy "blocked public read" on public.blocked_dates for select using (true);
create policy "blocked write" on public.blocked_dates for all
  to authenticated
  using (public.app_current_role() in ('super_admin', 'manager', 'content_manager'))
  with check (public.app_current_role() in ('super_admin', 'manager', 'content_manager'));

-- expenses ----------------------------------------------------------------------
create policy "expenses finance" on public.expenses for all
  to authenticated using (public.app_current_role() in ('super_admin', 'manager'))
  with check (public.app_current_role() in ('super_admin', 'manager'));

-- events -------------------------------------------------------------------------
create policy "events public insert" on public.events for insert
  to anon, authenticated with check (true);
create policy "events analytics read" on public.events for select
  to authenticated using (public.app_current_role() in ('super_admin', 'manager'));
create policy "events admin delete" on public.events for delete
  to authenticated using (public.app_current_role() = 'super_admin');

-- ============================================================================
-- STORAGE — one public "media" bucket for portfolio & service images
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media public read" on storage.objects for select
  using (bucket_id = 'media');
create policy "media authed upload" on storage.objects for insert
  to authenticated with check (bucket_id = 'media');
create policy "media authed manage" on storage.objects for update
  to authenticated using (bucket_id = 'media');
create policy "media authed delete" on storage.objects for delete
  to authenticated using (bucket_id = 'media');

-- ============================================================================
-- SEED — idempotent
-- ============================================================================

insert into public.site_content (key, value) values
  ('studio_name', 'Seema Makeover Studio'),
  ('tagline', 'Bridal & occasion makeup artistry'),
  ('years_experience', '8'),
  ('happy_clients', '1200'),
  ('hero_kicker', 'Bridal • Party • Occasion Makeup'),
  ('hero_title', 'Look effortlessly radiant on your biggest day'),
  ('hero_subtitle', 'Professional makeup and hairstyling by Seema — premium products, a fully hygienic kit, and a look that lasts from the mandap to midnight.'),
  ('about_title', 'Meet Seema'),
  ('about_body', 'Seema is a professional makeup artist with 8+ years of experience in bridal, party and occasion looks. Trained in HD and airbrush techniques, she works only with premium, skin-safe products and maintains a fully sanitised kit for every client. Every look starts with understanding you — your outfit, your event, your comfort — so you feel like yourself, only luminous.'),
  ('phone', '+91 98765 43210'),
  ('whatsapp_number', '919876543210'),
  ('upi_id', 'seema@upi'),
  ('address_line', 'Shop 12, Sunrise Plaza, MG Road'),
  ('city', 'Indore'),
  ('maps_url', 'https://maps.google.com/?q=Seema+Makeover+Studio'),
  ('open_time', '10:00'),
  ('close_time', '19:00'),
  ('slot_interval_minutes', '30'),
  ('min_notice_hours', '3'),
  ('closed_weekdays', '["1"]'),
  ('advance_note', 'Pay ₹2,000 advance via UPI to hold your slot. Balance after your session.'),
  ('instagram_url', 'https://instagram.com/seemamakeover'),
  ('facebook_url', ''),
  ('youtube_url', '')
on conflict (key) do nothing;

insert into public.services (slug, name, category, description, duration_minutes, price_inr, display_order) values
  ('bridal-hd-makeup',
   'Bridal HD Makeup',
   'Bridal',
   'Complete bridal look with HD makeup — long-wear base that photographs beautifully, eye detailing, lashes, and draping-friendly finishing. Includes skin prep and a trial consultation on the day.',
   180, 15000, 1),
  ('bridal-airbrush-makeup',
   'Bridal Airbrush Makeup',
   'Bridal',
   'Feather-light airbrush base for a flawless, sweat-proof finish — our most requested bridal package. Includes lashes, hair styling and draping support.',
   180, 20000, 2),
  ('engagement-makeup',
   'Engagement Makeup',
   'Bridal',
   'Soft-glam engagement look with a luminous base, defined eyes and a hairstyle that holds through photos and rings. Perfect for half-day functions.',
   120, 7000, 3),
  ('reception-glam',
   'Reception Glam Makeup',
   'Bridal',
   'Statement evening glam — bold eyes, sculpted base and a red-carpet finish for your reception look.',
   150, 9000, 4),
  ('party-makeup',
   'Party Makeup',
   'Occasion',
   'Quick glamour for parties, sangeets and dinners — fresh base, styled hair and a look that turns heads without going overboard.',
   60, 3500, 5),
  ('haldi-mehendi-look',
   'Haldi / Mehendi Look',
   'Occasion',
   'Bright, breezy day-function makeup with a dewy finish — made to look perfect in daylight photos. Light hair styling included.',
   90, 4000, 6),
  ('hairstyling',
   'Hairstyling',
   'Add-on',
   'Buns, curls, braids or sleek styles tailored to your outfit and occasion. Works beautifully as an add-on to any makeup package.',
   45, 2500, 7),
  ('saree-draping',
   'Saree Draping',
   'Add-on',
   'Perfect pleats and pallu styles — classic, butterfly or lehenga drape — so your saree sits right all day.',
   30, 1500, 8)
on conflict (slug) do nothing;

insert into public.staff_members (full_name, role_title, bio, specialties, display_order) values
  ('Seema', 'Founder & Lead Artist',
   'Founder of the studio and lead artist for every bridal booking. Specialises in HD and airbrush bridal makeup, and personally trains every artist who joins the team.',
   ARRAY['Bridal HD Makeup', 'Airbrush Makeup', 'Hairstyling', 'Draping'], 1)
on conflict do nothing;
