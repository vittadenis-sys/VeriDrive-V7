-- VeriDrive V14: short human-friendly practice codes.
-- Keeps UUIDs internal while exposing VD-00001 ... VD-99999 to users.

alter table public.bookings
  add column if not exists practice_code text;

create unique index if not exists bookings_practice_code_uidx
  on public.bookings(practice_code)
  where practice_code is not null;

create sequence if not exists public.veridrive_practice_code_seq
  minvalue 1
  maxvalue 99999
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
  loop
    next_number := nextval('public.veridrive_practice_code_seq');
    if next_number > 99999 then
      raise exception 'Codici pratica VD esauriti';
    end if;

    begin
      return 'VD-' || lpad(next_number::text, 5, '0');
    exception when unique_violation then
      continue;
    end;
  end loop;
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

update public.bookings
set practice_code = public.next_veridrive_practice_code()
where practice_code is null;
