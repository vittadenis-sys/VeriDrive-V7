-- VeriDrive V7 · Partner requests migration
create table if not exists public.workshop_requests (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  vat_number text not null,
  city text not null,
  address text not null,
  phone text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_requests (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users(id) on delete cascade,
  contact_name text not null,
  business_name text not null,
  vat_number text not null,
  city text not null,
  address text not null,
  phone text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workshop_requests enable row level security;
alter table public.merchant_requests enable row level security;

create policy if not exists "workshop request insert own" on public.workshop_requests
for insert to authenticated with check (auth_id = auth.uid());
create policy if not exists "workshop request read own" on public.workshop_requests
for select to authenticated using (auth_id = auth.uid());

create policy if not exists "merchant request insert own" on public.merchant_requests
for insert to authenticated with check (auth_id = auth.uid());
create policy if not exists "merchant request read own" on public.merchant_requests
for select to authenticated using (auth_id = auth.uid());
