-- VeriDrive V15: make Admin access and practice-code bootstrap safe/idempotent.
-- Requires the existing admin@veridrive.it auth user created in Supabase.

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique not null references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admins enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admins'
      and policyname = 'admins read self'
  ) then
    create policy "admins read self"
      on public.admins
      for select
      using (auth_id = auth.uid());
  end if;
end
$$;

-- Promote the already-created VeriDrive admin account to Super Admin.
insert into public.admins (auth_id, role)
select id, 'super_admin'
from auth.users
where lower(email) = lower('admin@veridrive.it')
on conflict (auth_id) do update
set role = 'super_admin', updated_at = now();

-- Human-friendly booking codes.
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
language sql
as $$
  select 'VD-' || lpad(nextval('public.veridrive_practice_code_seq')::text, 5, '0');
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

-- Backfill existing bookings oldest first, but only where a code is missing.
do $$
declare
  booking_row record;
begin
  for booking_row in
    select id
    from public.bookings
    where practice_code is null
    order by created_at asc, id asc
  loop
    update public.bookings
    set practice_code = public.next_veridrive_practice_code()
    where id = booking_row.id;
  end loop;
end
$$;

-- Keep the sequence ahead of any existing/imported practice codes.
do $$
declare
  max_number bigint;
  current_number bigint;
begin
  select max(nullif(substring(practice_code from '^VD-(\\d+)$'), '')::bigint)
    into max_number
  from public.bookings;

  if max_number is not null then
    select last_value into current_number
    from public.veridrive_practice_code_seq;

    if current_number < max_number then
      perform setval('public.veridrive_practice_code_seq', max_number, true);
    end if;
  end if;
end
$$;
