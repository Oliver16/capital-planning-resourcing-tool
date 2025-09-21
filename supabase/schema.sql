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

  if not exists (select 1 from pg_type where typname = 'join_request_status') then
    create type public.join_request_status as enum ('pending', 'approved', 'rejected');
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

create table if not exists public.organization_join_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status public.join_request_status not null default 'pending',
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);
create index if not exists organization_join_requests_org_idx on public.organization_join_requests (organization_id);
create index if not exists organization_join_requests_user_idx on public.organization_join_requests (user_id);
create unique index if not exists organization_join_requests_pending_unique
  on public.organization_join_requests (organization_id, user_id)
  where status = 'pending';

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

create or replace function public.add_superusers_to_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.memberships (organization_id, user_id, role, can_edit)
  select
    new.id,
    superusers.user_id,
    'superuser'::public.organization_role,
    true
  from (
    select distinct m.user_id
    from public.memberships m
    where m.role::text = 'superuser'
  ) as superusers
  on conflict (organization_id, user_id) do update
    set role = 'superuser',
        can_edit = true,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists organizations_add_superusers on public.organizations;
create trigger organizations_add_superusers
after insert on public.organizations
for each row execute function public.add_superusers_to_new_organization();

drop trigger if exists memberships_set_updated_at on public.memberships;
create trigger memberships_set_updated_at
before update on public.memberships
for each row execute function public.set_updated_at();

drop trigger if exists organization_join_requests_set_updated_at on public.organization_join_requests;
create trigger organization_join_requests_set_updated_at
before update on public.organization_join_requests
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

create or replace function public.superuser_list_memberships(org_id uuid)
returns table (
  membership_id uuid,
  organization_id uuid,
  user_id uuid,
  email text,
  full_name text,
  role public.organization_role,
  can_edit boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superuser() then
    raise exception 'Only superusers may view organization memberships';
  end if;

  return query
  select
    m.id::uuid as membership_id,
    m.organization_id::uuid,
    m.user_id::uuid,
    coalesce(u.email::text, ''::text) as email,
    coalesce((u.raw_user_meta_data->>'full_name')::text, ''::text) as full_name,
    m.role,
    m.can_edit,
    m.created_at,
    m.updated_at
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.organization_id = org_id
  order by m.created_at asc;
end;
$$;

grant execute on function public.superuser_list_memberships to authenticated;

create or replace function public.superuser_add_user_to_organization(
  target_email text,
  org_id uuid,
  member_role public.organization_role default 'viewer',
  make_editor boolean default false
)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  user_record auth.users%rowtype;
  existing_membership public.memberships%rowtype;
  result_row public.memberships%rowtype;
  final_can_edit boolean;
begin
  if not public.is_superuser() then
    raise exception 'Only superusers may add members';
  end if;

  normalized_email := lower(trim(target_email));

  select *
  into user_record
  from auth.users
  where lower(email) = normalized_email
  limit 1;

  if not found then
    raise exception 'User with email % does not exist', normalized_email;
  end if;

  final_can_edit := make_editor or member_role in ('editor', 'admin', 'superuser');

  select *
  into existing_membership
  from public.memberships
  where organization_id = org_id
    and user_id = user_record.id;

  if found then
    update public.memberships
    set role = member_role,
        can_edit = final_can_edit,
        updated_at = timezone('utc', now())
    where id = existing_membership.id
    returning * into result_row;
  else
    insert into public.memberships (organization_id, user_id, role, can_edit)
    values (org_id, user_record.id, member_role, final_can_edit)
    returning * into result_row;
  end if;

  return result_row;
end;
$$;

grant execute on function public.superuser_add_user_to_organization to authenticated;

create or replace function public.superuser_list_join_requests(
  org_id uuid default null,
  only_pending boolean default false
)
returns table (
  request_id uuid,
  organization_id uuid,
  organization_name text,
  user_id uuid,
  email text,
  full_name text,
  status public.join_request_status,
  created_at timestamptz,
  updated_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superuser() then
    raise exception 'Only superusers may view join requests';
  end if;

  return query
  select
    r.id as request_id,
    r.organization_id,
    o.name as organization_name,
    r.user_id,
    coalesce(u.email::text, ''::text) as email,
    coalesce((u.raw_user_meta_data->>'full_name')::text, ''::text) as full_name,
    r.status,
    r.created_at,
    r.updated_at,
    r.reviewed_at,
    r.reviewed_by
  from public.organization_join_requests r
  join public.organizations o on o.id = r.organization_id
  join auth.users u on u.id = r.user_id
  where (org_id is null or r.organization_id = org_id)
    and (not only_pending or r.status = 'pending')
  order by r.created_at asc;
end;
$$;

grant execute on function public.superuser_list_join_requests to authenticated;

create or replace function public.superuser_approve_join_request(
  request_id uuid,
  member_role public.organization_role default 'viewer',
  make_editor boolean default false
)
returns public.organization_join_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.organization_join_requests%rowtype;
  existing_membership public.memberships%rowtype;
  final_can_edit boolean;
begin
  if not public.is_superuser() then
    raise exception 'Only superusers may approve join requests';
  end if;

  select *
  into target_request
  from public.organization_join_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Join request not found';
  end if;

  if target_request.status <> 'pending' then
    return target_request;
  end if;

  final_can_edit := make_editor or member_role in ('editor', 'admin', 'superuser');

  select *
  into existing_membership
  from public.memberships
  where organization_id = target_request.organization_id
    and user_id = target_request.user_id;

  if found then
    update public.memberships
    set role = member_role,
        can_edit = final_can_edit,
        updated_at = timezone('utc', now())
    where id = existing_membership.id;
  else
    insert into public.memberships (organization_id, user_id, role, can_edit)
    values (
      target_request.organization_id,
      target_request.user_id,
      member_role,
      final_can_edit
    );
  end if;

  update public.organization_join_requests
  set status = 'approved',
      reviewed_at = timezone('utc', now()),
      reviewed_by = auth.uid()
  where id = target_request.id
  returning * into target_request;

  return target_request;
end;
$$;

grant execute on function public.superuser_approve_join_request to authenticated;

create or replace function public.superuser_reject_join_request(
  request_id uuid,
  rejection_note text default null
)
returns public.organization_join_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.organization_join_requests%rowtype;
begin
  if not public.is_superuser() then
    raise exception 'Only superusers may reject join requests';
  end if;

  select *
  into target_request
  from public.organization_join_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Join request not found';
  end if;

  if target_request.status <> 'pending' then
    return target_request;
  end if;

  update public.organization_join_requests
  set status = 'rejected',
      note = coalesce(rejection_note, note),
      reviewed_at = timezone('utc', now()),
      reviewed_by = auth.uid()
  where id = target_request.id
  returning * into target_request;

  return target_request;
end;
$$;

grant execute on function public.superuser_reject_join_request to authenticated;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.organization_join_requests enable row level security;
alter table public.project_types enable row level security;
alter table public.funding_sources enable row level security;
alter table public.staff_categories enable row level security;
alter table public.staff_members enable row level security;
alter table public.projects enable row level security;
alter table public.staff_allocations enable row level security;
alter table public.staff_assignments enable row level security;

drop policy if exists "Members can view organizations" on public.organizations;
create policy "Organization directory visibility" on public.organizations
for select
using (
  auth.role() in ('anon', 'authenticated')
  or public.is_organization_member(id)
  or created_by = auth.uid()
);

drop policy if exists "Authenticated users can create organizations" on public.organizations;
create policy "Authenticated users can create organizations" on public.organizations
for insert
with check (public.is_superuser());

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
  public.can_edit_organization(organization_id)
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.organizations o
      where o.id = organization_id
        and o.created_by = auth.uid()
    )
  )
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

drop policy if exists "Users can view their join requests" on public.organization_join_requests;
create policy "Users can view their join requests" on public.organization_join_requests
for select
using (
  user_id = auth.uid()
  or public.can_edit_organization(organization_id)
);

drop policy if exists "Users can create join requests" on public.organization_join_requests;
create policy "Users can create join requests" on public.organization_join_requests
for insert
with check (
  status = 'pending'
  and user_id = auth.uid()
);

drop policy if exists "Admins review join requests" on public.organization_join_requests;
create policy "Admins review join requests" on public.organization_join_requests
for update
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

drop policy if exists "Admins manage join requests" on public.organization_join_requests;
create policy "Admins manage join requests" on public.organization_join_requests
for delete
using (
  public.can_edit_organization(organization_id)
  or user_id = auth.uid()
);

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
