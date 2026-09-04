-- VeriDrive V4 migration: weighted VeriScore foundation.
-- Apply after supabase/schema.sql.

create table if not exists public.veriscore_weights (
  area text primary key,
  weight integer not null check (weight > 0),
  updated_at timestamptz not null default now()
);

insert into public.veriscore_weights (area, weight) values
  ('Documenti e identità', 8),
  ('Motore e trasmissione', 22),
  ('Sicurezza', 20),
  ('Carrozzeria e telaio', 22),
  ('Interni e comfort', 8),
  ('Prova e comportamento', 20)
on conflict (area) do update set weight = excluded.weight, updated_at = now();

alter table public.inspections add column if not exists weighted_veriscore integer;
alter table public.inspections add column if not exists critical_findings integer not null default 0;
alter table public.inspections add column if not exists issue_findings integer not null default 0;

create or replace function public.calculate_weighted_veriscore(p_checklist jsonb)
returns integer
language plpgsql
stable
as $$
declare
  score numeric := 0;
  item jsonb;
  area_weight numeric;
  result text;
begin
  for item in select * from jsonb_array_elements(coalesce(p_checklist, '[]'::jsonb)) loop
    result := coalesce(item->>'result', '');
    select weight into area_weight from public.veriscore_weights where area = item->>'area';
    area_weight := coalesce(area_weight, 100.0 / 50.0);
    if result = 'ok' then score := score + area_weight;
    elsif result = 'issue' then score := score + area_weight * 0.65;
    elsif result = 'critical' then score := score;
    end if;
  end loop;
  return greatest(0, least(100, round(score)));
end;
$$;
