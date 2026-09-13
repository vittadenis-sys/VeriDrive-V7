-- VeriDrive V24: live compatibility for real inspection/photo workflow.
create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references public.bookings(id) on delete cascade,
  inspector_auth_id uuid references auth.users(id) on delete set null,
  checklist jsonb not null default '[]'::jsonb,
  passed_checks integer not null default 0 check (passed_checks between 0 and 50),
  veriscore integer not null default 0 check (veriscore between 0 and 100),
  notes text,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists inspections_booking_id_idx on public.inspections(booking_id);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  storage_path text not null,
  caption text,
  check_id integer check (check_id between 1 and 50),
  created_at timestamptz not null default now()
);

create index if not exists photos_inspection_created_at_idx on public.photos(inspection_id, created_at);

insert into storage.buckets (id, name, public) values ('inspection-photos','inspection-photos',false) on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='authenticated upload inspection photos') then
    create policy "authenticated upload inspection photos" on storage.objects for insert to authenticated with check (bucket_id='inspection-photos');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='authenticated read inspection photos') then
    create policy "authenticated read inspection photos" on storage.objects for select to authenticated using (bucket_id='inspection-photos');
  end if;
end $$;
