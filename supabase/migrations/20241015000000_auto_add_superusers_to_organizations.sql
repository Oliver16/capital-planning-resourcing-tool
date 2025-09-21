-- Automatically add existing superusers to new organizations

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
