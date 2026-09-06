-- VeriDrive V20: internal free-booking test bonus for private customers.
-- Bonus is never exposed as a wallet; it is usable only for Autogerma.

alter table public.customers
  add column if not exists autogerma_free_booking_bonus integer not null default 0;

alter table public.customers
  drop constraint if exists customers_autogerma_free_booking_bonus_check;
alter table public.customers
  add constraint customers_autogerma_free_booking_bonus_check
  check (autogerma_free_booking_bonus >= 0);

alter table public.bookings
  add column if not exists paid_with_autogerma_bonus boolean not null default false;

create index if not exists customers_autogerma_bonus_idx
  on public.customers(autogerma_free_booking_bonus)
  where autogerma_free_booking_bonus > 0;
