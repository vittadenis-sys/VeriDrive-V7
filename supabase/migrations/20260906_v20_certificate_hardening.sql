-- VeriDrive V20: harden the immutable VeriScore certificate registry.
-- Public API must never expose full plate/VIN. Certificate creation must also
-- work when an inspection is inserted already completed.

create or replace function public.mask_certificate_plate(value text)
returns text
language plpgsql
immutable
as $$
declare
  clean text := upper(trim(coalesce(value, '')));
  i integer;
  out text := '';
begin
  if length(clean) = 0 then return ''; end if;
  for i in 1..length(clean) loop
    if i = 1 or i = 3 or i = length(clean) then
      out := out || substr(clean, i, 1);
    else
      out := out || '*';
    end if;
  end loop;
  return out;
end;
$$;

create or replace function public.mask_certificate_vin(value text)
returns text
language plpgsql
immutable
as $$
declare
  clean text := upper(trim(coalesce(value, '')));
  visible integer := least(8, length(clean));
begin
  if length(clean) = 0 then return ''; end if;
  if length(clean) <= visible then return clean; end if;
  return repeat('*', length(clean) - visible) || right(clean, visible);
end;
$$;

-- Robust issuance trigger: fires both for newly inserted completed inspections
-- and when an existing inspection becomes completed.
create or replace function public.issue_veriscore_certificate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  certificate_code text;
begin
  if new.completed_at is null then
    return new;
  end if;

  select * into b from public.bookings where id = new.booking_id;
  if b.id is null then
    raise exception 'Booking non trovata per il certificato.';
  end if;

  if b.service_key not in ('veriscore','veriscore_plus') then
    return new;
  end if;

  if btrim(coalesce(b.plate,'')) = '' then
    raise exception 'Impossibile emettere il certificato: targa mancante.';
  end if;
  if btrim(coalesce(b.vin,'')) = '' or b.vehicle_mileage is null then
    raise exception 'Impossibile emettere il certificato: VIN e chilometraggio sono obbligatori.';
  end if;

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
after insert or update of completed_at on public.inspections
for each row
when (new.completed_at is not null)
execute function public.issue_veriscore_certificate();

-- Defense in depth: certificates can be inserted by the security-definer issuance
-- function, but once created they cannot be updated or deleted through ordinary
-- table operations. Corrections require a separate/new certificate workflow.
create or replace function public.reject_veriscore_certificate_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'I certificati VeriDrive emessi sono immutabili: usare una nuova pratica/certificato.';
end;
$$;

drop trigger if exists veriscore_certificates_immutable_update on public.veriscore_certificates;
create trigger veriscore_certificates_immutable_update
before update or delete on public.veriscore_certificates
for each row
execute function public.reject_veriscore_certificate_mutation();

revoke insert, update, delete on public.veriscore_certificates from anon, authenticated;
