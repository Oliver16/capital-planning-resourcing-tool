-- Add organization join requests support and superuser admin helpers

do $$
begin
  if not exists (select 1 from pg_type where typname = 'join_request_status') then
    create type public.join_request_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

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

alter table public.organization_join_requests enable row level security;

drop trigger if exists organization_join_requests_set_updated_at on public.organization_join_requests;
create trigger organization_join_requests_set_updated_at
before update on public.organization_join_requests
for each row execute function public.set_updated_at();

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
    m.id,
    m.organization_id,
    m.user_id,
    u.email,
    coalesce(u.raw_user_meta_data->>'full_name', '') as full_name,
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
    r.id,
    r.organization_id,
    o.name,
    r.user_id,
    u.email,
    coalesce(u.raw_user_meta_data->>'full_name', '') as full_name,
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
