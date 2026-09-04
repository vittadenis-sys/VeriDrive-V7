-- VeriDrive V7 · workshop dashboard query helpers

create or replace view public.workshop_completed_vehicles as
select
  b.workshop_id,
  b.id as booking_id,
  b.plate,
  b.vehicle_make,
  b.vehicle_model,
  b.vehicle_year,
  b.service_key,
  b.requested_date,
  b.requested_slot,
  b.urgency,
  p.amount_cents,
  b.updated_at as completed_at
from public.bookings b
join public.payouts p on p.booking_id = b.id
where b.status = 'completed';

create or replace view public.workshop_monthly_due as
select
  b.workshop_id,
  date_trunc('month', b.updated_at)::date as period_month,
  count(*)::integer as completed_count,
  coalesce(sum(p.amount_cents),0)::integer as total_due_cents
from public.bookings b
join public.payouts p on p.booking_id = b.id
where b.status = 'completed'
group by b.workshop_id, date_trunc('month', b.updated_at)::date;
