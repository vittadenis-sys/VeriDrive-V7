-- Seed the Autogerma workshop and its standard weekly availability.
-- Safe to run more than once.

insert into public.workshops (id, name, city, address)
select gen_random_uuid(), 'Autogerma Como', 'Como', 'Via Pasquale Paoli 114, 22100 Como'
where not exists (
  select 1 from public.workshops
  where lower(name) = lower('Autogerma Como')
);

insert into public.workshop_settings (workshop_id, max_daily_inspections, accepts_urgent)
select w.id, 6, true
from public.workshops w
where lower(w.name) = lower('Autogerma Como')
  and not exists (
    select 1 from public.workshop_settings ws where ws.workshop_id = w.id
  );

insert into public.workshop_schedule (workshop_id, weekday, slot_time, active)
select w.id, d.weekday, d.slot_time::time, true
from public.workshops w
cross join (
  values
    (1, '09:00'), (1, '11:00'), (1, '14:00'), (1, '16:00'),
    (2, '09:00'), (2, '11:00'), (2, '14:00'), (2, '16:00'),
    (3, '09:00'), (3, '11:00'), (3, '14:00'), (3, '16:00'),
    (4, '09:00'), (4, '11:00'), (4, '14:00'), (4, '16:00'),
    (5, '09:00'), (5, '11:00'), (5, '14:00'), (5, '16:00'),
    (6, '09:00'), (6, '11:00'), (6, '14:00'), (6, '16:00')
) as d(weekday, slot_time)
where lower(w.name) = lower('Autogerma Como')
  and not exists (
    select 1
    from public.workshop_schedule s
    where s.workshop_id = w.id
      and s.weekday = d.weekday
      and s.slot_time = d.slot_time::time
  );
