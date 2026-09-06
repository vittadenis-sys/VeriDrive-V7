-- VeriDrive V15: use the explicit admins table as the authoritative Admin role.
-- Keeps the account identified by email in the existing Supabase Auth user.

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'admin' check (role in ('super_admin','admin')),
  created_at timestamptz not null default now()
);

create index if not exists admins_auth_id_idx on public.admins(auth_id);
create index if not exists admins_email_idx on public.admins(lower(email));

alter table public.admins enable row level security;

create policy if not exists "admins read own row"
  on public.admins for select
  using (auth_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt()->>'email','')));

insert into public.admins (auth_id, email, role)
select u.id, lower(u.email), 'super_admin'
from auth.users u
where lower(u.email) = 'admin@veridrive.it'
on conflict (email) do update
set auth_id = excluded.auth_id,
    role = 'super_admin';
