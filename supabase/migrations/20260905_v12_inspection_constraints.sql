alter table public.inspections
  add column if not exists technician_signed_at timestamptz,
  add column if not exists technician_name text;

create unique index if not exists inspections_booking_id_unique
  on public.inspections (booking_id);

create or replace function public.close_booking_as_workshop(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_passed integer;
  v_inspection uuid;
begin
  select status into v_status from bookings where id = p_booking_id for update;
  if v_status is null then raise exception 'Pratica non trovata'; end if;
  select id, passed_checks into v_inspection, v_passed from inspections where booking_id = p_booking_id limit 1;
  if v_inspection is null or v_passed <> 50 then raise exception 'La checklist deve essere completa'; end if;
  update inspections
    set completed_at = coalesce(completed_at, now()), technician_signed_at = coalesce(technician_signed_at, now())
    where id = v_inspection;
  update bookings set status = 'completed' where id = p_booking_id;
end;
$$;
