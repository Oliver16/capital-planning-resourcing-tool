-- Add project size category metadata and project effort templates table
alter table public.projects
  add column if not exists size_category text;

create table if not exists public.project_effort_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  project_type_id uuid references public.project_types (id) on delete set null,
  size_category text,
  delivery_type text,
  notes text,
  hours_by_category jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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
