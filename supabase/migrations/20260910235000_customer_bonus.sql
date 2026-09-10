create table if not exists public.customer_bonus (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  free_bookings integer not null default 0 check (free_bookings >= 0),
  updated_at timestamptz not null default now()
);

alter table public.customer_bonus enable row level security;

create policy "service role manages customer bonus"
on public.customer_bonus
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
