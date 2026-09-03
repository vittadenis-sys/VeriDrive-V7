-- VeriDrive V7 · schema extensions: fiscal profiles, invoice workflow, workshop branding, merchant promo credits

alter table public.customers add column if not exists first_name text;
alter table public.customers add column if not exists last_name text;
alter table public.customers add column if not exists tax_code text;
alter table public.customers add column if not exists residence_address text;
alter table public.customers add column if not exists residence_postal_code text;
alter table public.customers add column if not exists residence_city text;
alter table public.customers add column if not exists residence_province text;

alter table public.workshops add column if not exists display_name text;
alter table public.workshops add column if not exists is_primary boolean not null default false;

create type public.invoice_status as enum ('to_issue','issued');
alter table public.bookings add column if not exists invoice_status public.invoice_status not null default 'to_issue';
alter table public.bookings add column if not exists invoice_number text;
alter table public.bookings add column if not exists invoice_issued_at timestamptz;

create table if not exists public.merchant_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete set null,
  business_name text not null,
  email text,
  phone text,
  own_workshop_id uuid references public.workshops(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_credits (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant_accounts(id) on delete cascade,
  type text not null check (type in ('promo','paid')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  used_at timestamptz,
  used_booking_id uuid references public.bookings(id) on delete set null,
  workshop_id uuid references public.workshops(id) on delete set null,
  created_at timestamptz not null default now(),
  check (type <> 'promo' or (expires_at is not null and workshop_id is not null))
);

create table if not exists public.merchant_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant_accounts(id) on delete cascade,
  credit_id uuid references public.merchant_credits(id) on delete set null,
  action text not null check (action in ('issued','used','expired','disabled')),
  booking_id uuid references public.bookings(id) on delete set null,
  workshop_id uuid references public.workshops(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists merchant_credits_available_idx on public.merchant_credits (merchant_id, type, used_at, expires_at);
create index if not exists merchant_credit_transactions_merchant_idx on public.merchant_credit_transactions (merchant_id, created_at desc);

create or replace function public.set_workshop_display_name()
returns trigger language plpgsql as $$
begin
  new.display_name := case
    when coalesce(nullif(trim(new.city), ''), '') = '' then 'VeriDrive — ' || new.name
    else 'VeriDrive ' || trim(new.city) || ' — ' || new.name
  end;
  return new;
end; $$;

drop trigger if exists workshops_display_name on public.workshops;
create trigger workshops_display_name before insert or update of name,city on public.workshops
for each row execute function public.set_workshop_display_name();

create or replace function public.issue_promo_credit(p_merchant_id uuid)
returns public.merchant_credits
language plpgsql
security definer
set search_path = public
as $$
declare
  primary_workshop uuid;
  issued public.merchant_credits;
begin
  select id into primary_workshop from public.workshops where is_primary = true limit 1;
  if primary_workshop is null then raise exception 'Officina principale non configurata'; end if;
  insert into public.merchant_credits (merchant_id,type,expires_at,workshop_id)
  values (p_merchant_id,'promo',now() + interval '15 days',primary_workshop)
  returning * into issued;
  insert into public.merchant_credit_transactions (merchant_id,credit_id,action,workshop_id,note)
  values (p_merchant_id,issued.id,'issued',primary_workshop,'Credito promo amministrativo +1');
  return issued;
end; $$;

-- Seed the primary VeriDrive workshop without inventing fiscal/contact values.
update public.workshops
set is_primary = false
where is_primary = true;

insert into public.workshops (name, city, is_active, is_primary, email, display_name)
select 'Autogerma', 'Faloppio', true, true, coalesce(value->>'email',''), 'VeriDrive Faloppio — Autogerma'
from public.settings
where key = 'primary_workshop'
and not exists (select 1 from public.workshops where is_primary = true)
limit 1;

create index if not exists bookings_invoice_status_idx on public.bookings(invoice_status, created_at desc);
