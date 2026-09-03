-- VeriDrive admin/officina layer v2.3
-- Adds fiscal workflow, merchant credits and a first-class main workshop identity.

create type public.invoice_status as enum ('to_issue','issued');

create table if not exists public.customer_fiscal_profiles (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  tax_code text not null,
  residence_address text not null,
  residence_postal_code text not null,
  residence_city text not null,
  residence_province text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings add column if not exists invoice_status public.invoice_status not null default 'to_issue';
alter table public.bookings add column if not exists invoice_number text;
alter table public.bookings add column if not exists invoice_issued_at timestamptz;

create table if not exists public.merchant_accounts (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  own_workshop_id uuid references public.workshops(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_promo_credits (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant_accounts(id) on delete cascade,
  own_workshop_id uuid not null references public.workshops(id) on delete restrict,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_at = issued_at + interval '15 days')
);

create table if not exists public.merchant_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant_accounts(id) on delete cascade,
  promo_credit_id uuid references public.merchant_promo_credits(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  transaction_type text not null check (transaction_type in ('promo_issued','promo_used','promo_expired','paid_used')),
  amount_cents integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists merchant_promo_credits_active_idx
  on public.merchant_promo_credits(merchant_id, expires_at)
  where used_at is null;

create or replace function public.create_promo_credit(p_merchant_id uuid, p_workshop_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.merchant_promo_credits (merchant_id, own_workshop_id, expires_at)
  values (p_merchant_id, p_workshop_id, now() + interval '15 days')
  returning id into v_id;
  insert into public.merchant_credit_transactions (merchant_id, promo_credit_id, transaction_type, amount_cents)
  values (p_merchant_id, v_id, 'promo_issued', 0);
  return v_id;
end; $$;

create or replace function public.expire_promo_credits()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.merchant_credit_transactions (merchant_id, promo_credit_id, transaction_type, amount_cents)
  select merchant_id, id, 'promo_expired', 0
  from public.merchant_promo_credits
  where used_at is null and expires_at <= now();
  update public.merchant_promo_credits set used_at = coalesce(used_at, expires_at)
  where used_at is null and expires_at <= now();
end; $$;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.customer_fiscal_profiles enable row level security;
alter table public.merchant_accounts enable row level security;
alter table public.merchant_promo_credits enable row level security;
alter table public.merchant_credit_transactions enable row level security;
alter table public.admin_audit_log enable row level security;

create policy if not exists "customers read own fiscal profile" on public.customer_fiscal_profiles
for select using (customer_id in (select id from public.customers where auth_id = auth.uid()));
create policy if not exists "customers insert own fiscal profile" on public.customer_fiscal_profiles
for insert with check (customer_id in (select id from public.customers where auth_id = auth.uid()));
create policy if not exists "customers update own fiscal profile" on public.customer_fiscal_profiles
for update using (customer_id in (select id from public.customers where auth_id = auth.uid()));
