-- VeriDrive V21: align the live certificate registry with the current application flow.
-- The current close endpoint creates certificates from bookings and stores the
-- checklist in bookings.overall_notes, so inspection_id must be optional here.

alter table public.veriscore_certificates
  drop constraint if exists veriscore_certificates_inspection_id_key;

alter table public.veriscore_certificates
  alter column inspection_id drop not null;

create index if not exists veriscore_certificates_inspection_idx
  on public.veriscore_certificates(inspection_id)
  where inspection_id is not null;
