-- VeriDrive V16: vehicle identity data required before closing VeriScore practices.
-- Check Viaggio does not use this certificate flow.

alter table public.bookings
  add column if not exists vin text,
  add column if not exists vehicle_mileage integer;

alter table public.bookings
  drop constraint if exists bookings_vehicle_mileage_check;
alter table public.bookings
  add constraint bookings_vehicle_mileage_check
  check (vehicle_mileage is null or vehicle_mileage >= 0);

-- Keep VIN normalized enough for reliable verification/search without forcing a format
-- that may reject legitimate manufacturer-specific VIN input.
create index if not exists bookings_vin_idx on public.bookings(vin) where vin is not null;
