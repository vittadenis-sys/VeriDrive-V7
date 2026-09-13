-- VeriDrive V23: reliable Plus photo storage/index compatibility.
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
