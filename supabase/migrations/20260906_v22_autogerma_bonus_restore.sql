-- VeriDrive V22: rollback helper when a free booking insert fails after bonus claim.
create or replace function public.restore_autogerma_free_booking(customer_uuid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.customers
     set autogerma_free_booking_bonus = autogerma_free_booking_bonus + 1
   where id = customer_uuid;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.restore_autogerma_free_booking(uuid) from public;
grant execute on function public.restore_autogerma_free_booking(uuid) to service_role;
