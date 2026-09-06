-- VeriDrive V20: Admin-assigned Autogerma-only free booking bonuses.
-- Customer never sees a wallet/credit balance: only a free-booking option when eligible.

alter table public.customers
  add column if not exists autogerma_free_booking_bonus integer not null default 0;

alter table public.customers
  drop constraint if exists customers_autogerma_free_booking_bonus_check;

alter table public.customers
  add constraint customers_autogerma_free_booking_bonus_check
  check (autogerma_free_booking_bonus >= 0);

alter table public.bookings
  add column if not exists paid_with_autogerma_bonus boolean not null default false;

alter table public.bookings
  drop constraint if exists bookings_bonus_price_check;

alter table public.bookings
  add constraint bookings_bonus_price_check
  check (not paid_with_autogerma_bonus or customer_price_cents = 0);

create index if not exists customers_autogerma_bonus_idx
  on public.customers(autogerma_free_booking_bonus)
  where autogerma_free_booking_bonus > 0;

create or replace function public.claim_autogerma_free_booking(p_customer_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  update public.customers
     set autogerma_free_booking_bonus = autogerma_free_booking_bonus - 1,
         updated_at = now()
   where id = p_customer_id
     and autogerma_free_booking_bonus > 0
  returning autogerma_free_booking_bonus into remaining;

  if remaining is null then
    raise exception 'BONUS_NON_DISPONIBILE';
  end if;

  return remaining;
end;
$$;

grant execute on function public.claim_autogerma_free_booking(uuid) to authenticated;

create or replace function public.restore_autogerma_free_booking(p_customer_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  update public.customers
     set autogerma_free_booking_bonus = autogerma_free_booking_bonus + 1,
         updated_at = now()
   where id = p_customer_id
  returning autogerma_free_booking_bonus into remaining;

  if remaining is null then
    raise exception 'CLIENTE_NON_TROVATO';
  end if;

  return remaining;
end;
$$;

grant execute on function public.restore_autogerma_free_booking(uuid) to service_role;
