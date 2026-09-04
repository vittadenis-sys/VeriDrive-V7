-- VeriDrive: accounting and identity foundation
create table if not exists public.fiscal_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  profile_type text not null check (profile_type in ('private','merchant','workshop')),
  display_name text not null,
  tax_code text,
  vat_number text,
  sdi_code text,
  pec text,
  address text,
  postal_code text,
  city text,
  province text,
  phone text,
  email text,
  iban text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  company_name text not null,
  vat_number text not null,
  fiscal_code text,
  sdi_code text,
  pec text,
  legal_address text,
  postal_code text,
  city text,
  province text,
  contact_name text,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promo_credits (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchant_accounts(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  workshop_id uuid references public.workshops(id) on delete restrict,
  credit_type text not null default 'promo' check (credit_type = 'promo'),
  status text not null default 'available' check (status in ('available','used','expired','cancelled')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  booking_id uuid references public.bookings(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  check ((merchant_id is not null) <> (customer_id is not null))
);

create index if not exists promo_credits_merchant_idx on public.promo_credits(merchant_id,status,expires_at);
create index if not exists promo_credits_customer_idx on public.promo_credits(customer_id,status,expires_at);

create table if not exists public.credit_history (
  id uuid primary key default gen_random_uuid(),
  promo_credit_id uuid references public.promo_credits(id) on delete cascade,
  merchant_id uuid references public.merchant_accounts(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  action text not null check (action in ('issued','used','expired','cancelled')),
  booking_id uuid references public.bookings(id) on delete set null,
  actor_auth_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique references public.bookings(id) on delete cascade,
  invoice_status text not null default 'to_issue' check (invoice_status in ('to_issue','issued')),
  invoice_number text,
  invoice_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workshop_invoice_records (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  period_month date not null,
  invoice_status text not null default 'pending' check (invoice_status in ('pending','received','paid')),
  invoice_number text,
  invoice_date date,
  received_at timestamptz,
  paid_at timestamptz,
  total_due_cents integer not null default 0 check (total_due_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, period_month)
);

alter table public.promo_credits enable row level security;
alter table public.credit_history enable row level security;
alter table public.fiscal_profiles enable row level security;
alter table public.merchant_accounts enable row level security;
alter table public.invoice_records enable row level security;
alter table public.workshop_invoice_records enable row level security;

create policy if not exists "users read own fiscal profile" on public.fiscal_profiles for select using (auth_id = auth.uid());
create policy if not exists "users manage own fiscal profile" on public.fiscal_profiles for all using (auth_id = auth.uid());
create policy if not exists "merchants read own account" on public.merchant_accounts for select using (auth_id = auth.uid());
create policy if not exists "merchants manage own account" on public.merchant_accounts for all using (auth_id = auth.uid());
create policy if not exists "merchants read own promo credits" on public.promo_credits for select using (merchant_id in (select id from public.merchant_accounts where auth_id = auth.uid()));
create policy if not exists "customers read own promo credits" on public.promo_credits for select using (customer_id in (select id from public.customers where auth_id = auth.uid()));
