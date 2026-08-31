-- VeriDrive V7 · Supabase schema
create extension if not exists "pgcrypto";

create type public.booking_status as enum ('requested','assigned','confirmed','in_progress','completed','cancelled','refunded');
create type public.payout_status as enum ('pending','approved','paid','rejected');

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  owner_auth_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  vat_number text unique,
  email text not null,
  phone text,
  address text,
  city text,
  description text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workshop_id uuid references public.workshops(id) on delete set null,
  plate text not null,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  requested_date date,
  requested_slot text,
  status public.booking_status not null default 'requested',
  customer_price_cents integer not null default 7900 check (customer_price_cents = 7900),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references public.bookings(id) on delete cascade,
  inspector_auth_id uuid references auth.users(id) on delete set null,
  checklist jsonb not null default '[]'::jsonb,
  passed_checks integer not null default 0 check (passed_checks between 0 and 50),
  veriscore integer generated always as (round((passed_checks::numeric / 50) * 100)) stored,
  notes text,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid unique not null references public.inspections(id) on delete cascade,
  public_code text unique not null default upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 12)),
  pdf_path text,
  is_revoked boolean not null default false,
  revoked_reason text,
  issued_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  storage_path text not null,
  caption text,
  check_id integer check (check_id between 1 and 50),
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  booking_id uuid unique not null references public.bookings(id) on delete restrict,
  amount_cents integer not null default 5500 check (amount_cents = 5500),
  status public.payout_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.workshop_closures (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  reason text,
  check (ends_on >= starts_on)
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.is_workshop_owner(workshop uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.workshops w where w.id = workshop and w.owner_auth_id = auth.uid())
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();
drop trigger if exists workshops_touch on public.workshops;
create trigger workshops_touch before update on public.workshops for each row execute function public.touch_updated_at();
drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();
drop trigger if exists inspections_touch on public.inspections;
create trigger inspections_touch before update on public.inspections for each row execute function public.touch_updated_at();

alter table public.customers enable row level security;
alter table public.workshops enable row level security;
alter table public.bookings enable row level security;
alter table public.inspections enable row level security;
alter table public.certificates enable row level security;
alter table public.photos enable row level security;
alter table public.payouts enable row level security;
alter table public.workshop_closures enable row level security;
alter table public.settings enable row level security;

create policy "customers read self" on public.customers for select using (auth_id = auth.uid());
create policy "customers update self" on public.customers for update using (auth_id = auth.uid());
create policy "public read active workshops" on public.workshops for select using (is_active = true or owner_auth_id = auth.uid());
create policy "owners update workshop" on public.workshops for update using (owner_auth_id = auth.uid());
create policy "customers create bookings" on public.bookings for insert with check (customer_id in (select id from public.customers where auth_id = auth.uid()));
create policy "customers read bookings" on public.bookings for select using (customer_id in (select id from public.customers where auth_id = auth.uid()));
create policy "workshops read bookings" on public.bookings for select using (public.is_workshop_owner(workshop_id));
create policy "workshops update bookings" on public.bookings for update using (public.is_workshop_owner(workshop_id));
create policy "customers read inspections" on public.inspections for select using (booking_id in (select b.id from public.bookings b join public.customers c on c.id=b.customer_id where c.auth_id=auth.uid()));
create policy "workshops manage inspections" on public.inspections for all using (booking_id in (select id from public.bookings where public.is_workshop_owner(workshop_id)));
create policy "customers read certificates" on public.certificates for select using (inspection_id in (select i.id from public.inspections i join public.bookings b on b.id=i.booking_id join public.customers c on c.id=b.customer_id where c.auth_id=auth.uid()));
create policy "workshops manage certificates" on public.certificates for all using (inspection_id in (select i.id from public.inspections i join public.bookings b on b.id=i.booking_id where public.is_workshop_owner(b.workshop_id)));
create policy "customers read photos" on public.photos for select using (inspection_id in (select i.id from public.inspections i join public.bookings b on b.id=i.booking_id join public.customers c on c.id=b.customer_id where c.auth_id=auth.uid()));
create policy "workshops manage photos" on public.photos for all using (inspection_id in (select i.id from public.inspections i join public.bookings b on b.id=i.booking_id where public.is_workshop_owner(b.workshop_id)));
create policy "workshops read payouts" on public.payouts for select using (public.is_workshop_owner(workshop_id));
create policy "workshops read closures" on public.workshop_closures for select using (public.is_workshop_owner(workshop_id));
create policy "workshops manage closures" on public.workshop_closures for all using (public.is_workshop_owner(workshop_id));

-- Create the customer profile automatically after Supabase Auth registration.
create or replace function public.create_customer_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.customers (auth_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_customer_profile();


-- Private photo bucket; uploads are restricted to authenticated operators.
insert into storage.buckets (id, name, public) values ('inspection-photos','inspection-photos',false) on conflict (id) do nothing;
create policy "authenticated upload inspection photos" on storage.objects for insert to authenticated with check (bucket_id = 'inspection-photos');
create policy "authenticated read inspection photos" on storage.objects for select to authenticated using (bucket_id = 'inspection-photos');
