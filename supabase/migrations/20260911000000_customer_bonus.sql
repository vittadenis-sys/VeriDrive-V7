create table if not exists public.customer_bonus (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  free_bookings integer not null default 0 check (free_bookings >= 0),
  updated_at timestamptz not null default now()
);

alter table public.customer_bonus enable row level security;

create policy "customer_bonus_admin_all"
on public.customer_bonus
for all
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where a.auth_id = auth.uid()
      and a.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.admins a
    where a.auth_id = auth.uid()
      and a.role in ('admin', 'super_admin')
  )
);

create policy "customer_bonus_customer_select"
on public.customer_bonus
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.id = customer_bonus.customer_id
      and c.auth_id = auth.uid()
  )
);
