-- VeriDrive V20: live-certificate compatibility for the current bookings/inspection implementation.
-- The current application stores the 50-point workshop checklist in bookings.overall_notes,
-- so the legacy inspections trigger cannot be used as the issuance mechanism.

create table if not exists public.veriscore_certificates (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references public.bookings(id) on delete restrict,
  public_code text unique not null,
  vehicle_plate text not null,
  vehicle_vin text not null,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  vehicle_mileage integer not null check (vehicle_mileage >= 0),
  veriscore integer not null check (veriscore between 0 and 100),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  issued_at timestamptz not null default now()
);

create unique index if not exists veriscore_certificates_public_code_uidx
  on public.veriscore_certificates(public_code);

create index if not exists veriscore_certificates_booking_idx
  on public.veriscore_certificates(booking_id);

create or replace function public.next_veriscore_certificate_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  loop
    code := 'VSC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.veriscore_certificates where public_code = code);
  end loop;
  return code;
end;
$$;

alter table public.veriscore_certificates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='veriscore_certificates'
      and policyname='public read veriscore certificates'
  ) then
    create policy "public read veriscore certificates"
      on public.veriscore_certificates
      for select
      using (true);
  end if;
end
$$;

revoke insert, update, delete on public.veriscore_certificates from anon, authenticated;
