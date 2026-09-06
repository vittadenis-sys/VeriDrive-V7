-- VeriDrive V21: atomic claim for one Autogerma free-booking bonus.
create or replace function public.claim_autogerma_free_booking(customer_uuid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.customers
     set autogerma_free_booking_bonus = autogerma_free_booking_bonus - 1
   where id = customer_uuid
     and auth_id = auth.uid()
     and autogerma_free_booking_bonus > 0;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.claim_autogerma_free_booking(uuid) from public;
grant execute on function public.claim_autogerma_free_booking(uuid) to authenticated;
