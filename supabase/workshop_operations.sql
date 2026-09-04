-- VeriDrive V7 · persistent workshop operations + accounting

create table if not exists public.workshop_operation_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_auth_id uuid references auth.users(id) on delete set null,
  from_status public.booking_status,
  to_status public.booking_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.booking_fiscal_state (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  invoice_status text not null default 'to_issue' check (invoice_status in ('to_issue','issued')),
  invoice_number text,
  invoice_date date,
  marked_issued_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.workshop_monthly_statements (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  period_month date not null,
  completed_count integer not null default 0,
  total_due_cents integer not null default 0,
  invoice_received boolean not null default false,
  invoice_number text,
  invoice_date date,
  invoice_received_at timestamptz,
  paid boolean not null default false,
  paid_at timestamptz,
  unique (workshop_id, period_month)
);

alter table public.workshop_operation_log enable row level security;
alter table public.booking_fiscal_state enable row level security;
alter table public.workshop_monthly_statements enable row level security;

create policy if not exists "workshop reads own operation log" on public.workshop_operation_log
for select using (booking_id in (select b.id from public.bookings b where public.is_workshop_owner(b.workshop_id)));
create policy if not exists "workshop reads own fiscal state" on public.booking_fiscal_state
for select using (booking_id in (select b.id from public.bookings b where public.is_workshop_owner(b.workshop_id)));
create policy if not exists "workshop reads own statements" on public.workshop_monthly_statements
for select using (public.is_workshop_owner(workshop_id));

create or replace function public.close_booking_as_workshop(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
  i public.inspections;
  payout_amount integer;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Prenotazione non trovata'; end if;
  if not public.is_workshop_owner(b.workshop_id) then raise exception 'Non autorizzato'; end if;

  select * into i from public.inspections where booking_id = b.id;
  if not found then raise exception 'Ispezione non presente'; end if;
  if jsonb_array_length(coalesce(i.checklist, '[]'::jsonb)) < 50 then raise exception 'Completa tutti i 50 controlli'; end if;

  update public.bookings set status = 'completed', updated_at = now() where id = b.id returning * into b;

  select coalesce(case when b.urgency then 1500 else 0 end,0) +
         case b.service_key
           when 'check_viaggio' then 3000
           when 'veriscore' then 6000
           when 'veriscore_plus' then 8000
           else 0
         end into payout_amount;

  insert into public.payouts(workshop_id, booking_id, amount_cents, status)
  values (b.workshop_id, b.id, payout_amount, 'pending')
  on conflict (booking_id) do update set amount_cents = excluded.amount_cents;

  insert into public.booking_fiscal_state(booking_id) values (b.id) on conflict do nothing;
  insert into public.workshop_operation_log(booking_id, actor_auth_id, from_status, to_status, note)
  values (b.id, auth.uid(), 'in_progress', 'completed', 'Servizio chiuso dall’officina');

  return b;
end; $$;
