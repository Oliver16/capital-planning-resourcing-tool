-- Add budget percentage columns for projects and backfill values
alter table public.projects
  add column if not exists design_budget_percent numeric,
  add column if not exists construction_budget_percent numeric;

-- Ensure percentage values stay within 0-100
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_design_budget_percent_range'
  ) then
    alter table public.projects
      add constraint projects_design_budget_percent_range
      check (
        design_budget_percent is null
        or (design_budget_percent >= 0 and design_budget_percent <= 100)
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_construction_budget_percent_range'
  ) then
    alter table public.projects
      add constraint projects_construction_budget_percent_range
      check (
        construction_budget_percent is null
        or (construction_budget_percent >= 0 and construction_budget_percent <= 100)
      );
  end if;
end
$$;

-- Populate missing percentage values from existing budget amounts
update public.projects
set design_budget_percent = round((design_budget / total_budget) * 100, 2)
where design_budget_percent is null
  and total_budget is not null
  and total_budget <> 0
  and design_budget is not null;

update public.projects
set construction_budget_percent = round((construction_budget / total_budget) * 100, 2)
where construction_budget_percent is null
  and total_budget is not null
  and total_budget <> 0
  and construction_budget is not null;

-- If only one percentage was available, derive the complement when possible
update public.projects
set design_budget_percent = round(100 - construction_budget_percent, 2)
where design_budget_percent is null
  and construction_budget_percent is not null
  and total_budget is not null
  and total_budget <> 0;

update public.projects
set construction_budget_percent = round(100 - design_budget_percent, 2)
where construction_budget_percent is null
  and design_budget_percent is not null
  and total_budget is not null
  and total_budget <> 0;
