-- Add project complexity metadata and project effort templates table with budget targeting
alter table public.projects
  add column if not exists complexity text;

update public.projects
set complexity = size_category
where size_category is not null
  and (complexity is null or btrim(complexity) = '');

alter table public.projects
  alter column complexity set default 'Normal';

update public.projects
set complexity = 'Normal'
where complexity is null or btrim(complexity) = '';

alter table public.projects
  drop column if exists size_category;

create table if not exists public.project_effort_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  project_type_id uuid references public.project_types (id) on delete set null,
  complexity text,
  min_total_budget numeric,
  max_total_budget numeric,
  delivery_type text,
  notes text,
  hours_by_category jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.project_effort_templates
  add column if not exists complexity text;

alter table public.project_effort_templates
  add column if not exists min_total_budget numeric;

alter table public.project_effort_templates
  add column if not exists max_total_budget numeric;

update public.project_effort_templates
set complexity = size_category
where size_category is not null
  and (complexity is null or btrim(complexity) = '');

alter table public.project_effort_templates
  drop column if exists size_category;

create index if not exists project_effort_templates_org_idx
  on public.project_effort_templates (organization_id);

alter table public.project_effort_templates enable row level security;

drop trigger if exists project_effort_templates_set_updated_at on public.project_effort_templates;
create trigger project_effort_templates_set_updated_at
before update on public.project_effort_templates
for each row execute function public.set_updated_at();

-- Multi-tenant access policies

drop policy if exists "Members can view project effort templates" on public.project_effort_templates;
create policy "Members can view project effort templates" on public.project_effort_templates
for select
using (public.is_organization_member(organization_id));

drop policy if exists "Editors manage project effort templates" on public.project_effort_templates;
create policy "Editors manage project effort templates" on public.project_effort_templates
for all
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));
