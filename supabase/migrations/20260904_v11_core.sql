-- VeriDrive V11: core operational safeguards and merchant credits.
-- Apply after schema.sql + schema_admin_v2.sql.

alter table public.bookings add column if not exists public_reference text;
alter table public.bookings add column if not exists customer_latitude numeric(9,6);
alter table public.bookings add column if not exists customer_longitude numeric(9,6);
alter table public.bookings add column if not exists payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded'));

create unique index if not exists bookings_public_reference_uidx on public.bookings(public_reference) where public_reference is not null;

create table if not exists public.merchant_paid_credits (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant_accounts(id) on delete cascade,
  credits_total integer not null check (credits_total > 0),
  credits_remaining integer not null check (credits_remaining >= 0 and credits_remaining <= credits_total),
  status text not null default 'active' check (status in ('active','exhausted','cancelled')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merchant_paid_credits_lookup_idx on public.merchant_paid_credits(merchant_id,status,created_at);

create table if not exists public.practice_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null,
  from_status public.booking_status,
  to_status public.booking_status,
  actor_auth_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists practice_events_booking_idx on public.practice_events(booking_id,created_at);

alter table public.merchant_paid_credits enable row level security;
alter table public.practice_events enable row level security;
create policy if not exists "merchants read own paid credits" on public.merchant_paid_credits for select using (merchant_id in (select id from public.merchant_accounts where auth_id = auth.uid()));
create policy if not exists "merchant practice events read" on public.practice_events for select using (booking_id in (select b.id from public.bookings b where b.customer_id in (select c.id from public.customers c where c.auth_id=auth.uid())));

create or replace function public.veridrive_public_reference(p_booking_id uuid)
returns text language sql stable as $$
  select 'VRD-' || to_char(b.created_at at time zone 'Europe/Rome','YYMMDD') || '-' || upper(substr(replace(b.id::text,'-',''),1,6))
  from public.bookings b where b.id=p_booking_id;
$$;

create or replace function public.set_booking_public_reference()
returns trigger language plpgsql as $$
begin
  if new.public_reference is null or new.public_reference = '' then
    new.public_reference := public.veridrive_public_reference(new.id);
  end if;
  return new;
end; $$;

drop trigger if exists bookings_public_reference_trigger on public.bookings;
create trigger bookings_public_reference_trigger before insert on public.bookings for each row execute function public.set_booking_public_reference();

create or replace function public.record_booking_status_event()
returns trigger language plpgsql as $$
begin
  if tg_op='UPDATE' and new.status is distinct from old.status then
    insert into public.practice_events(booking_id,event_type,from_status,to_status,note)
    values(new.id,'status_changed',old.status,new.status,null);
  end if;
  return new;
end; $$;

drop trigger if exists bookings_status_event_trigger on public.bookings;
create trigger bookings_status_event_trigger after update of status on public.bookings for each row execute function public.record_booking_status_event();

create or replace function public.prevent_payout_without_invoice()
returns trigger language plpgsql as $$
declare
  invoice_state text;
begin
  if new.status='paid' then
    select invoice_status into invoice_state
    from public.workshop_invoice_records wir
    where wir.workshop_id=new.workshop_id
      and wir.period_month=date_trunc('month',current_date)::date;
    if coalesce(invoice_state,'pending') <> 'received' and coalesce(invoice_state,'pending') <> 'paid' then
      raise exception 'Impossibile liquidare: fattura officina non ricevuta.';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists payouts_invoice_guard on public.payouts;
create trigger payouts_invoice_guard before update of status on public.payouts for each row execute function public.prevent_payout_without_invoice();
