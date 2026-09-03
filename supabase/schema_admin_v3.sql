-- Safe idempotent migration. Run in Supabase SQL editor after the base schema.

do $$ begin
  create type public.invoice_status as enum ('da_emettere','emessa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.credit_kind as enum ('promo','paid');
exception when duplicate_object then null; end $$;

alter table public.customers add column if not exists first_name text;
alter table public.customers add column if not exists last_name text;
alter table public.customers add column if not exists tax_code text;
alter table public.customers add column if not exists residence_address text;
alter table public.customers add column if not exists residence_postal_code text;
alter table public.customers add column if not exists residence_city text;
alter table public.customers add column if not exists residence_province text;
alter table public.customers add column if not exists email text;

alter table public.bookings add column if not exists invoice_status public.invoice_status not null default 'da_emettere';
alter table public.bookings add column if not exists invoice_number text;
alter table public.bookings add column if not exists invoice_issued_at timestamptz;
alter table public.bookings add column if not exists workshop_payout_status public.payout_status not null default 'pending';
alter table public.bookings add column if not exists workshop_payout_matured_at timestamptz;

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete set null,
  company_name text not null,
  vat_number text not null,
  tax_code text,
  sdi_or_pec text,
  legal_address text,
  legal_postal_code text,
  legal_city text,
  legal_province text,
  contact_name text,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_credits (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  kind public.credit_kind not null,
  service_key text not null default 'veriscore',
  remaining_quantity integer not null default 1 check (remaining_quantity >= 0),
  expires_at timestamptz,
  workshop_scope text not null default 'primary_workshop',
  created_at timestamptz not null default now()
);

create table if not exists public.promo_credits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  merchant_id uuid references public.merchants(id) on delete cascade,
  service_key text not null default 'veriscore',
  workshop_scope text not null default 'primary_workshop',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  booking_id uuid references public.bookings(id) on delete set null,
  check (((customer_id is not null)::int + (merchant_id is not null)::int) = 1),
  check (expires_at = issued_at + interval '15 days')
);

create table if not exists public.credit_history (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  credit_id uuid,
  action text not null,
  quantity integer not null default 1,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_auth_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workshop_monthly_settlements (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  period_month date not null,
  invoice_number text,
  invoice_received_at timestamptz,
  total_completed_cents integer not null default 0,
  paid_at timestamptz,
  unique(workshop_id, period_month)
);
