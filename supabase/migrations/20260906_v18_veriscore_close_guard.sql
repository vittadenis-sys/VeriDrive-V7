-- VeriDrive V18: server-side guard for closing VeriScore / VeriScorePlus practices.
-- A workshop cannot close these services until mandatory vehicle identity data exists.

create or replace function public.prevent_invalid_veriscore_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  service_key_value text;
  vin_value text;
  mileage_value integer;
  plate_value text;
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    select service_key, vin, vehicle_mileage, plate
      into service_key_value, vin_value, mileage_value, plate_value
    from public.bookings
    where id = new.id;

    if service_key_value in ('veriscore','veriscore_plus') then
      if btrim(coalesce(plate_value,'')) = '' then
        raise exception 'Pratica VeriScore non chiudibile: targa mancante.';
      end if;
      if btrim(coalesce(vin_value,'')) = '' then
        raise exception 'Pratica VeriScore non chiudibile: inserire il VIN/telaio.';
      end if;
      if mileage_value is null then
        raise exception 'Pratica VeriScore non chiudibile: inserire i chilometri.';
      end if;

      if not exists (
        select 1 from public.inspections i
        where i.booking_id = new.id
          and i.completed_at is not null
      ) then
        raise exception 'Pratica VeriScore non chiudibile: verifica officina non completata.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_veriscore_close_guard on public.bookings;
create trigger bookings_veriscore_close_guard
before update of status on public.bookings
for each row
when (new.status = 'completed')
execute function public.prevent_invalid_veriscore_close();
