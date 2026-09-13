-- VeriDrive V22: make the live bookings contract explicit for the VeriScore close flow.
-- The canonical bookings columns are defined by schema.sql, with vin and
-- vehicle_mileage added by V16/V19 and practice_code added by V15.

alter table public.bookings
  add column if not exists practice_code text;

alter table public.bookings
  add column if not exists vin text,
  add column if not exists vehicle_mileage integer;

alter table public.bookings
  drop constraint if exists bookings_vehicle_mileage_check;

alter table public.bookings
  add constraint bookings_vehicle_mileage_check
  check (vehicle_mileage is null or vehicle_mileage >= 0);

create unique index if not exists bookings_practice_code_uidx
  on public.bookings(practice_code)
  where practice_code is not null;

create index if not exists bookings_vin_idx
  on public.bookings(vin)
  where vin is not null;
