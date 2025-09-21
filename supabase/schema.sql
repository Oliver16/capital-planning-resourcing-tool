-- Vector Supabase schema
-- Run this script in the Supabase SQL editor (or via the Supabase CLI) before
-- using the application. It provisions multi-tenant tables, helper functions,
-- and row-level security policies that align with the React client.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'organization_role') then
    create type public.organization_role as enum ('viewer', 'editor', 'admin', 'superuser');
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'organization_role'::regtype
      and enumlabel = 'superuser'
  ) then
    alter type public.organization_role add value 'superuser';
  end if;
end
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.organization_role not null default 'viewer',
  can_edit boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);
create index if not exists memberships_user_id_idx on public.memberships (user_id);
create index if not exists memberships_organization_id_idx on public.memberships (organization_id);

create table if not exists public.project_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, name)
);
create index if not exists project_types_organization_id_idx on public.project_types (organization_id);

create table if not exists public.funding_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, name)
);
create index if not exists funding_sources_organization_id_idx on public.funding_sources (organization_id);

create table if not exists public.staff_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  hourly_rate numeric,
  pm_capacity numeric,
  design_capacity numeric,
  construction_capacity numeric,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, name)
);
create index if not exists staff_categories_organization_id_idx on public.staff_categories (organization_id);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  category_id uuid references public.staff_categories (id) on delete set null,
  pm_availability numeric,
  design_availability numeric,
  construction_availability numeric,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists staff_members_organization_id_idx on public.staff_members (organization_id);
create index if not exists staff_members_category_id_idx on public.staff_members (category_id);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  type text not null default 'project',
  project_type_id uuid references public.project_types (id) on delete set null,
  funding_source_id uuid references public.funding_sources (id) on delete set null,
  total_budget numeric,
  design_budget numeric,
  construction_budget numeric,
  annual_budget numeric,
  design_duration integer,
  construction_duration integer,
  design_start_date date,
  construction_start_date date,
  design_budget_percent numeric,
  construction_budget_percent numeric,
  continuous_pm_hours numeric,
  continuous_design_hours numeric,
  continuous_construction_hours numeric,
  continuous_hours_by_category jsonb,
  program_start_date date,
  program_end_date date,
  priority text default 'Medium',
  description text,
  delivery_type text default 'self-perform',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists projects_organization_id_idx on public.projects (organization_id);
create index if not exists projects_project_type_id_idx on public.projects (project_type_id);
create index if not exists projects_funding_source_id_idx on public.projects (funding_source_id);

create table if not exists public.staff_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  category_id uuid not null references public.staff_categories (id) on delete cascade,
  pm_hours numeric,
  design_hours numeric,
  construction_hours numeric,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, project_id, category_id)
);
create index if not exists staff_allocations_organization_id_idx on public.staff_allocations (organization_id);
create index if not exists staff_allocations_project_id_idx on public.staff_allocations (project_id);
create index if not exists staff_allocations_category_id_idx on public.staff_allocations (category_id);

create table if not exists public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  staff_id uuid not null references public.staff_members (id) on delete cascade,
  pm_hours numeric,
  design_hours numeric,
  construction_hours numeric,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, project_id, staff_id)
);
create index if not exists staff_assignments_organization_id_idx on public.staff_assignments (organization_id);
create index if not exists staff_assignments_project_id_idx on public.staff_assignments (project_id);
create index if not exists staff_assignments_staff_id_idx on public.staff_assignments (staff_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists memberships_set_updated_at on public.memberships;
create trigger memberships_set_updated_at
before update on public.memberships
for each row execute function public.set_updated_at();

drop trigger if exists project_types_set_updated_at on public.project_types;
create trigger project_types_set_updated_at
before update on public.project_types
for each row execute function public.set_updated_at();

drop trigger if exists funding_sources_set_updated_at on public.funding_sources;
create trigger funding_sources_set_updated_at
before update on public.funding_sources
for each row execute function public.set_updated_at();

drop trigger if exists staff_categories_set_updated_at on public.staff_categories;
create trigger staff_categories_set_updated_at
before update on public.staff_categories
for each row execute function public.set_updated_at();

drop trigger if exists staff_members_set_updated_at on public.staff_members;
create trigger staff_members_set_updated_at
before update on public.staff_members
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists staff_allocations_set_updated_at on public.staff_allocations;
create trigger staff_allocations_set_updated_at
before update on public.staff_allocations
for each row execute function public.set_updated_at();

drop trigger if exists staff_assignments_set_updated_at on public.staff_assignments;
create trigger staff_assignments_set_updated_at
before update on public.staff_assignments
for each row execute function public.set_updated_at();

create or replace function public.is_superuser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.role::text = 'superuser'
  );
$$;

grant execute on function public.is_superuser to authenticated;

create or replace function public.is_organization_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_superuser()
    or exists (
      select 1
      from public.memberships m
      where m.organization_id = org_id
        and m.user_id = auth.uid()
    );
$$;

grant execute on function public.is_organization_member to authenticated;

create or replace function public.can_edit_organization(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_superuser()
    or exists (
      select 1
      from public.memberships m
      where m.organization_id = org_id
        and m.user_id = auth.uid()
        and (
          m.can_edit = true
          or m.role::text = 'superuser'
        )
    );
$$;

grant execute on function public.can_edit_organization to authenticated;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.project_types enable row level security;
alter table public.funding_sources enable row level security;
alter table public.staff_categories enable row level security;
alter table public.staff_members enable row level security;
alter table public.projects enable row level security;
alter table public.staff_allocations enable row level security;
alter table public.staff_assignments enable row level security;

drop policy if exists "Members can view organizations" on public.organizations;
create policy "Members can view organizations" on public.organizations
for select
using (public.is_organization_member(id) or created_by = auth.uid());

drop policy if exists "Authenticated users can create organizations" on public.organizations;
create policy "Authenticated users can create organizations" on public.organizations
for insert
with check (auth.role() = 'authenticated');

drop policy if exists "Editors can update organizations" on public.organizations;
create policy "Editors can update organizations" on public.organizations
for update
using (public.can_edit_organization(id))
with check (public.can_edit_organization(id));

drop policy if exists "Editors can delete organizations" on public.organizations;
create policy "Editors can delete organizations" on public.organizations
for delete
using (public.can_edit_organization(id));

drop policy if exists "Users can view their memberships" on public.memberships;
create policy "Users can view their memberships" on public.memberships
for select
using (user_id = auth.uid() or public.can_edit_organization(organization_id));

drop policy if exists "Users can create memberships" on public.memberships;
create policy "Users can create memberships" on public.memberships
for insert
with check (
  user_id = auth.uid()
  or public.can_edit_organization(organization_id)
);

drop policy if exists "Editors can update memberships" on public.memberships;
create policy "Editors can update memberships" on public.memberships
for update
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

drop policy if exists "Members can leave organizations" on public.memberships;
create policy "Members can leave organizations" on public.memberships
for delete
using (user_id = auth.uid() or public.can_edit_organization(organization_id));

drop policy if exists "Members can view project types" on public.project_types;
create policy "Members can view project types" on public.project_types
for select
using (public.is_organization_member(organization_id));

drop policy if exists "Editors manage project types" on public.project_types;
create policy "Editors manage project types" on public.project_types
for all
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

drop policy if exists "Members can view funding sources" on public.funding_sources;
create policy "Members can view funding sources" on public.funding_sources
for select
using (public.is_organization_member(organization_id));

drop policy if exists "Editors manage funding sources" on public.funding_sources;
create policy "Editors manage funding sources" on public.funding_sources
for all
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

drop policy if exists "Members can view staff categories" on public.staff_categories;
create policy "Members can view staff categories" on public.staff_categories
for select
using (public.is_organization_member(organization_id));

drop policy if exists "Editors manage staff categories" on public.staff_categories;
create policy "Editors manage staff categories" on public.staff_categories
for all
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

drop policy if exists "Members can view staff members" on public.staff_members;
create policy "Members can view staff members" on public.staff_members
for select
using (public.is_organization_member(organization_id));

drop policy if exists "Editors manage staff members" on public.staff_members;
create policy "Editors manage staff members" on public.staff_members
for all
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

drop policy if exists "Members can view projects" on public.projects;
create policy "Members can view projects" on public.projects
for select
using (public.is_organization_member(organization_id));

drop policy if exists "Editors manage projects" on public.projects;
create policy "Editors manage projects" on public.projects
for all
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

drop policy if exists "Members can view staff allocations" on public.staff_allocations;
create policy "Members can view staff allocations" on public.staff_allocations
for select
using (public.is_organization_member(organization_id));

drop policy if exists "Editors manage staff allocations" on public.staff_allocations;
create policy "Editors manage staff allocations" on public.staff_allocations
for all
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

drop policy if exists "Members can view staff assignments" on public.staff_assignments;
create policy "Members can view staff assignments" on public.staff_assignments
for select
using (public.is_organization_member(organization_id));

drop policy if exists "Editors manage staff assignments" on public.staff_assignments;
create policy "Editors manage staff assignments" on public.staff_assignments
for all
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
