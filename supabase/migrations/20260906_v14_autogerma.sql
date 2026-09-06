-- VeriDrive V14: seed first real workshop (Autogerma SAS) and one-hour schedule.
-- Owner linkage is intentionally left NULL until the Admin account UUID is known to the DB migration.

insert into public.workshops (
  name, email, phone, address, city, postal_code, is_active, radius_km, description
)
select
  'Autogerma SAS',
  'autogerma@hotmail.it',
  '031-991304',
  'Via Fornace, 1',
  'Faloppio',
  null,
  true,
  25,
  'Officina VeriDrive principale.'
where not exists (
  select 1 from public.workshops where lower(email)=lower('autogerma@hotmail.it')
);

insert into public.workshop_settings (workshop_id, max_daily_inspections, accepts_urgent)
select w.id, 8, true
from public.workshops w
where lower(w.email)=lower('autogerma@hotmail.it')
on conflict (workshop_id) do update
set max_daily_inspections=excluded.max_daily_inspections,
    accepts_urgent=excluded.accepts_urgent,
    updated_at=now();

insert into public.workshop_schedule (workshop_id, weekday, slot_time, active)
select w.id, s.weekday, s.slot_time, true
from public.workshops w
cross join (values
  (1,'08:30'),(1,'09:30'),(1,'10:30'),(1,'11:30'),(1,'12:30'),(1,'13:30'),(1,'14:30'),(1,'15:30'),(1,'16:30'),(1,'17:30'),
  (2,'08:30'),(2,'09:30'),(2,'10:30'),(2,'11:30'),(2,'12:30'),(2,'13:30'),(2,'14:30'),(2,'15:30'),(2,'16:30'),(2,'17:30'),
  (3,'08:30'),(3,'09:30'),(3,'10:30'),(3,'11:30'),(3,'12:30'),(3,'13:30'),(3,'14:30'),(3,'15:30'),(3,'16:30'),(3,'17:30'),
  (4,'08:30'),(4,'09:30'),(4,'10:30'),(4,'11:30'),(4,'12:30'),(4,'13:30'),(4,'14:30'),(4,'15:30'),(4,'16:30'),(4,'17:30'),
  (5,'08:30'),(5,'09:30'),(5,'10:30'),(5,'11:30'),(5,'12:30'),(5,'13:30'),(5,'14:30'),(5,'15:30'),(5,'16:30'),(5,'17:30'),
  (6,'08:30'),(6,'09:30'),(6,'10:30'),(6,'11:30')
) as s(weekday,slot_time) on true
where lower(w.email)=lower('autogerma@hotmail.it')
on conflict (workshop_id, weekday, slot_time) do update set active=true;
