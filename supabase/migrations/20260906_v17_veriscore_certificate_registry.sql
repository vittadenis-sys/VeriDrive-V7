-- VeriDrive V17: immutable public VeriScore certificate registry.
-- Check Viaggio never creates a certificate.

create table if not exists public.veriscore_certificates (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references public.bookings(id) on delete restrict,
  inspection_id uuid unique not null references public.inspections(id) on delete restrict,
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

create index if not exists veriscore_certificates_plate_idx
  on public.veriscore_certificates(vehicle_plate);

create or replace function public.next_veriscore_certificate_code()
returns text
language sql
as $$
  select 'VSC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
$$;

create or replace function public.issue_veriscore_certificate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  w public.workshops%rowtype;
  certificate_code text;
begin
  select * into b from public.bookings where id = new.booking_id;
  if b.id is null then raise exception 'Booking non trovata per il certificato.'; end if;

  if b.service_key not in ('veriscore','veriscore_plus') then
    return new;
  end if;

  if new.completed_at is null then
    return new;
  end if;

  if btrim(coalesce(b.vin,'')) = '' or b.vehicle_mileage is null then
    raise exception 'Impossibile emettere il certificato: VIN e chilometraggio sono obbligatori.';
  end if;

  if btrim(coalesce(b.plate,'')) = '' then
    raise exception 'Impossibile emettere il certificato: targa mancante.';
  end if;

  select * into w from public.workshops where id = b.workshop_id;
  if w.id is null then raise exception 'Officina non associata alla pratica.'; end if;

  if exists (select 1 from public.veriscore_certificates where booking_id = b.id) then
    return new;
  end if;

  certificate_code := public.next_veriscore_certificate_code();

  insert into public.veriscore_certificates (
    booking_id, inspection_id, public_code, vehicle_plate, vehicle_vin,
    vehicle_make, vehicle_model, vehicle_year, vehicle_mileage,
    veriscore, workshop_id
  ) values (
    b.id, new.id, certificate_code, upper(b.plate), upper(b.vin),
    b.vehicle_make, b.vehicle_model, b.vehicle_year, b.vehicle_mileage,
    new.veriscore, b.workshop_id
  );

  return new;
end;
$$;

drop trigger if exists inspection_issue_veriscore_certificate on public.inspections;
create trigger inspection_issue_veriscore_certificate
after update of completed_at on public.inspections
for each row
when (new.completed_at is not null)
execute function public.issue_veriscore_certificate();

-- Protect the registry at database level. Public verification is read-only.
alter table public.veriscore_certificates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='veriscore_certificates' and policyname='public read veriscore certificates'
  ) then
    create policy "public read veriscore certificates"
      on public.veriscore_certificates
      for select
      using (true);
  end if;
end
$$;

revoke insert, update, delete on public.veriscore_certificates from anon, authenticated;
