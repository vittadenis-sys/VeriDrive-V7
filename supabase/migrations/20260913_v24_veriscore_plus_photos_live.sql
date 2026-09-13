-- VeriDrive V24: repair live Plus photo storage linkage.
-- The live app may have bookings without an inspections row yet. The photo API
-- now creates the inspection row before storing Plus photos.

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  storage_path text not null,
  caption text,
  check_id integer check (check_id between 1 and 50),
  created_at timestamptz not null default now()
);

create index if not exists photos_inspection_created_at_idx
  on public.photos(inspection_id, created_at);

insert into storage.buckets (id, name, public)
values ('inspection-photos', 'inspection-photos', false)
on conflict (id) do nothing;
