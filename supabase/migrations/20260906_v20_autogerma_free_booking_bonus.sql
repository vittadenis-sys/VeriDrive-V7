-- VeriDrive V20: Admin-managed free booking bonuses valid only at Autogerma.
alter table public.customers
  add column if not exists autogerma_free_booking_bonus integer not null default 0;

alter table public.customers
  drop constraint if exists customers_autogerma_free_booking_bonus_check;
alter table public.customers
  add constraint customers_autogerma_free_booking_bonus_check
  check (autogerma_free_booking_bonus >= 0);

create index if not exists customers_autogerma_bonus_idx
  on public.customers(autogerma_free_booking_bonus);

alter table public.bookings
  add column if not exists paid_with_autogerma_bonus boolean not null default false;

create index if not exists bookings_autogerma_bonus_idx
  on public.bookings(paid_with_autogerma_bonus)
  where paid_with_autogerma_bonus = true;
