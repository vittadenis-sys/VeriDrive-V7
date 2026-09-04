-- VeriDrive V8 additions
-- Run after supabase/schema.sql and supabase/schema_admin_v2.sql.

alter table public.customers add column if not exists first_name text;
alter table public.customers add column if not exists last_name text;
alter table public.customers add column if not exists tax_code text;
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists postal_code text;
alter table public.customers add column if not exists city text;
alter table public.customers add column if not exists province text;
alter table public.customers add column if not exists email text;

alter table public.bookings add column if not exists practice_number text;
alter table public.bookings add column if not exists payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded'));
alter table public.bookings add column if not exists workshop_payout_status text not null default 'pending' check (workshop_payout_status in ('pending','approved','paid','rejected'));
alter table public.bookings add column if not exists customer_latitude numeric(9,6);
alter table public.bookings add column if not exists customer_longitude numeric(9,6);
alter table public.bookings add column if not exists assigned_at timestamptz;
alter table public.bookings add column if not exists cancelled_at timestamptz;
alter table public.bookings add column if not exists cancellation_reason text;
create unique index if not exists bookings_practice_number_uidx on public.bookings(practice_number) where practice_number is not null;
create index if not exists bookings_customer_status_idx on public.bookings(customer_id,status,created_at desc);
create index if not exists bookings_workshop_date_idx on public.bookings(workshop_id,requested_date,status);

alter table public.promo_credits add column if not exists source text not null default 'admin' check (source in ('admin','campaign'));

create table if not exists public.merchant_credit_wallet (
  merchant_id uuid primary key references public.merchant_accounts(id) on delete cascade,
  paid_credits integer not null default 0 check (paid_credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant_accounts(id) on delete cascade,
  credit_kind text not null check (credit_kind in ('paid','promo')),
  delta integer not null,
  booking_id uuid references public.bookings(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists merchant_credit_ledger_idx on public.merchant_credit_ledger(merchant_id,created_at desc);

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_auth_id uuid references auth.users(id) on delete set null,
  message text,
  created_at timestamptz not null default now()
);
create index if not exists booking_events_idx on public.booking_events(booking_id,created_at desc);

create table if not exists public.public_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid unique not null references public.certificates(id) on delete cascade,
  public_code text unique not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.next_practice_number()
returns text language plpgsql as $$
declare
  candidate text;
begin
  candidate := 'VRD-' || to_char(now(),'YYYYMMDD') || '-' || lpad((floor(random()*900)+100)::int::text,3,'0');
  while exists(select 1 from public.bookings where practice_number=candidate) loop
    candidate := 'VRD-' || to_char(now(),'YYYYMMDD') || '-' || lpad((floor(random()*900)+100)::int::text,3,'0');
  end loop;
  return candidate;
end; $$;

create or replace function public.sync_booking_payout_status()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' then
    new.workshop_payout_status := 'pending';
  end if;
  return new;
end; $$;

drop trigger if exists booking_sync_payout_status on public.bookings;
create trigger booking_sync_payout_status before update on public.bookings for each row execute function public.sync_booking_payout_status();

create policy if not exists "customers read own booking events" on public.booking_events for select using (booking_id in (select b.id from public.bookings b join public.customers c on c.id=b.customer_id where c.auth_id=auth.uid()));
create policy if not exists "workshops read booking events" on public.booking_events for select using (booking_id in (select b.id from public.bookings b where public.is_workshop_owner(b.workshop_id)));
create policy if not exists "public read certificate" on public.public_certificates for select using (true);
