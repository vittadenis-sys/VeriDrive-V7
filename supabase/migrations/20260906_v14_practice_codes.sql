-- VeriDrive V14: short human-friendly practice codes.
-- UUIDs remain internal; user-facing codes are VD-00001, VD-00002, ...
-- After 99999 the format naturally continues as VD-100000, etc.

alter table public.bookings
  add column if not exists practice_code text;

create unique index if not exists bookings_practice_code_uidx
  on public.bookings(practice_code)
  where practice_code is not null;

create sequence if not exists public.veridrive_practice_code_seq
  minvalue 1
  start 1
  increment 1
  cache 1;

create or replace function public.next_veridrive_practice_code()
returns text
language plpgsql
as $$
declare
  next_number bigint;
begin
  next_number := nextval('public.veridrive_practice_code_seq');
  return 'VD-' || lpad(next_number::text, 5, '0');
end;
$$;

create or replace function public.set_booking_practice_code()
returns trigger
language plpgsql
as $$
begin
  if new.practice_code is null or btrim(new.practice_code) = '' then
    new.practice_code := public.next_veridrive_practice_code();
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_practice_code_trigger on public.bookings;
create trigger bookings_practice_code_trigger
before insert on public.bookings
for each row execute function public.set_booking_practice_code();

with missing as (
  select id
  from public.bookings
  where practice_code is null
  order by created_at asc, id asc
)
update public.bookings b
set practice_code = public.next_veridrive_practice_code()
from missing m
where b.id = m.id;

select setval(
  'public.veridrive_practice_code_seq',
  greatest(
    coalesce((select max(nullif(regexp_replace(practice_code, '^VD-', ''), '')::bigint) from public.bookings where practice_code ~ '^VD-[0-9]+$'), 0),
    (select last_value from public.veridrive_practice_code_seq)
  ),
  true
);
