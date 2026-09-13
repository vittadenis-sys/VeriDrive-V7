-- VeriDrive V22: compatibility for the live bookings schema.
-- Keep this migration additive and idempotent for legacy databases.
alter table public.bookings add column if not exists practice_code text;
alter table public.bookings add column if not exists vin text;
alter table public.bookings add column if not exists vehicle_mileage integer;
alter table public.bookings drop constraint if exists bookings_vehicle_mileage_check;
alter table public.bookings add constraint bookings_vehicle_mileage_check check (vehicle_mileage is null or vehicle_mileage >= 0);
create unique index if not exists bookings_practice_code_uidx on public.bookings(practice_code) where practice_code is not null;
create index if not exists bookings_vin_idx on public.bookings(vin) where vin is not null;

drop trigger if exists bookings_practice_code_trigger on public.bookings;
create or replace function public.next_veridrive_practice_code()
returns text language sql as $$ select 'VD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)); $$;
create or replace function public.set_booking_practice_code()
returns trigger language plpgsql as $$ begin if new.practice_code is null or btrim(new.practice_code)='' then new.practice_code := public.next_veridrive_practice_code(); end if; return new; end; $$;
create trigger bookings_practice_code_trigger before insert on public.bookings for each row execute function public.set_booking_practice_code();
