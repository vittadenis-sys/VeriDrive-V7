-- VeriDrive V14: dedicated Check Viaggio travel reliability index.
-- Keeps Check Viaggio separate from VeriScore (0-100).

alter table public.inspections
  add column if not exists check_viaggio_index numeric(3,1)
  check (check_viaggio_index >= 0 and check_viaggio_index <= 10);

alter table public.inspections
  add column if not exists check_viaggio_result text
  check (check_viaggio_result in ('recommended','attention','check_before_departure','not_recommended'));

alter table public.inspections
  add column if not exists check_viaggio_checklist jsonb
  not null default '[]'::jsonb;

comment on column public.inspections.check_viaggio_index is 'Dedicated Check Viaggio travel reliability score from 0.0 to 10.0; never a VeriScore.';
comment on column public.inspections.check_viaggio_result is 'Human-readable travel result derived from the Check Viaggio index.';
comment on column public.inspections.check_viaggio_checklist is 'Short safety checklist used by the workshop for Check Viaggio.';

-- Backward-compatible rule: Check Viaggio does not populate VeriScore semantics.
