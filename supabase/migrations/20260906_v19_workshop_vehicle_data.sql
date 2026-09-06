-- VeriDrive V19: workshop vehicle identity confirmation before closing a practice.
-- Check Viaggio is intentionally excluded from these mandatory certificate fields.

alter table public.bookings
  add column if not exists vin text,
  add column if not exists vehicle_mileage integer;

alter table public.bookings
  drop constraint if exists bookings_vehicle_mileage_check;

alter table public.bookings
  add constraint bookings_vehicle_mileage_check
  check (vehicle_mileage is null or vehicle_mileage >= 0);

create index if not exists bookings_vin_idx on public.bookings(vin) where vin is not null;
