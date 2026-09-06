-- VeriDrive V13: per-customer demo access controlled by Admin.
alter table public.customers
  add column if not exists demo_access boolean not null default false;

create index if not exists customers_demo_access_idx
  on public.customers(demo_access);
