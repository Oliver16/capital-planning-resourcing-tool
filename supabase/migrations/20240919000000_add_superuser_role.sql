-- Add superuser role and helper functions for global organization management

do $$
begin
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
      and m.role = 'superuser'
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
        and (m.can_edit = true or m.role = 'superuser')
    );
$$;

grant execute on function public.can_edit_organization to authenticated;
