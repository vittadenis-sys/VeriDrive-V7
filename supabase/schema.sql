create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  phone text,
  plate text not null,
  vehicle text,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);
create table if not exists inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  veriscore integer check (veriscore between 0 and 100),
  checklist jsonb not null default '[]'::jsonb,
  notes text,
  completed_at timestamptz
);
alter table bookings enable row level security;
alter table inspections enable row level security;