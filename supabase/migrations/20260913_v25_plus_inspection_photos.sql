-- VeriDrive V25: live schema required by VeriScore Plus inspection/photo flow.
-- Additive and idempotent. Run this migration on the live Supabase project.

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references public.bookings(id) on delete cascade,
  inspector_auth_id uuid references auth.users(id) on delete set null,
  checklist jsonb not null default '[]'::jsonb,
  passed_checks integer not null default 0 check (passed_checks between 0 and 50),
  notes text,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.inspections enable row level security;

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  storage_path text not null,
  caption text,
  check_id integer check (check_id between 1 and 50),
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

create index if not exists photos_inspection_created_at_idx on public.photos(inspection_id, created_at);

insert into storage.buckets (id, name, public)
values ('inspection-photos', 'inspection-photos', false)
on conflict (id) do nothing;
