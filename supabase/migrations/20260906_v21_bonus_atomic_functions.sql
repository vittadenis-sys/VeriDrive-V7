-- VeriDrive V21: atomic Autogerma bonus claim/restore for operational testing.
-- Bonus is internal only and never exposed as a customer wallet.

create or replace function public.claim_autogerma_free_booking(customer_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.customers
     set autogerma_free_booking_bonus = autogerma_free_booking_bonus - 1
   where id = customer_uuid
     and autogerma_free_booking_bonus > 0
  returning true;
$$;

create or replace function public.restore_autogerma_free_booking(customer_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.customers
     set autogerma_free_booking_bonus = autogerma_free_booking_bonus + 1
   where id = customer_uuid
  returning true;
$$;

revoke all on function public.claim_autogerma_free_booking(uuid) from public, anon;
revoke all on function public.restore_autogerma_free_booking(uuid) from public, anon;
grant execute on function public.claim_autogerma_free_booking(uuid) to service_role;
grant execute on function public.restore_autogerma_free_booking(uuid) to service_role;
