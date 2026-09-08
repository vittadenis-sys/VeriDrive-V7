create table if not exists public.workshop_requests (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null,
  vat_number text not null,
  city text not null,
  address text not null,
  phone text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workshop_requests enable row level security;

create policy if not exists "users create own workshop request"
on public.workshop_requests for insert to authenticated
with check (auth_id = auth.uid());

create policy if not exists "users read own workshop request"
on public.workshop_requests for select to authenticated
using (auth_id = auth.uid());

create or replace function public.approve_workshop_request(request_id uuid)
returns public.workshops
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.workshop_requests;
  created_workshop public.workshops;
  current_role text;
begin
  select role into current_role from public.admins where auth_id = auth.uid() and role in ('admin','super_admin');
  if current_role is null then raise exception 'Unauthorized'; end if;

  select * into req from public.workshop_requests where id = request_id for update;
  if not found then raise exception 'Workshop request not found'; end if;
  if req.status <> 'pending' then raise exception 'Workshop request is not pending'; end if;

  insert into public.workshops (owner_auth_id, name, vat_number, email, phone, address, city, is_active)
  values (req.auth_id, req.business_name, req.vat_number, coalesce((select email from auth.users where id=req.auth_id), ''), req.phone, req.address, req.city, true)
  on conflict (owner_auth_id) do update set
    name = excluded.name,
    vat_number = excluded.vat_number,
    phone = excluded.phone,
    address = excluded.address,
    city = excluded.city,
    is_active = true,
    updated_at = now()
  returning * into created_workshop;

  update public.workshop_requests
    set status='approved', reviewed_at=now(), reviewed_by=auth.uid(), updated_at=now()
    where id=req.id;

  return created_workshop;
end;
$$;

revoke all on function public.approve_workshop_request(uuid) from public;
grant execute on function public.approve_workshop_request(uuid) to authenticated;
