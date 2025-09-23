-- Create persistence tables for the financial modeling module
create table if not exists public.utility_financial_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  utility_key text not null,
  financial_config jsonb not null default '{}'::jsonb,
  budget_escalations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint utility_financial_profiles_utility_key_check
    check (utility_key in ('water', 'sewer', 'power', 'gas', 'stormwater')),
  unique (organization_id, utility_key)
);

create index if not exists utility_financial_profiles_org_idx
  on public.utility_financial_profiles (organization_id);

alter table public.utility_financial_profiles enable row level security;

drop trigger if exists utility_financial_profiles_set_updated_at on public.utility_financial_profiles;
create trigger utility_financial_profiles_set_updated_at
before update on public.utility_financial_profiles
for each row execute function public.set_updated_at();

create table if not exists public.utility_operating_budgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  utility_key text not null,
  fiscal_year integer not null,
  operating_revenue numeric default 0,
  non_operating_revenue numeric default 0,
  om_expenses numeric default 0,
  salaries numeric default 0,
  admin_expenses numeric default 0,
  existing_debt_service numeric default 0,
  rate_increase_percent numeric default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint utility_operating_budgets_utility_key_check
    check (utility_key in ('water', 'sewer', 'power', 'gas', 'stormwater')),
  constraint utility_operating_budgets_fiscal_year_check
    check (fiscal_year >= 1900),
  unique (organization_id, utility_key, fiscal_year)
);

create index if not exists utility_operating_budgets_org_idx
  on public.utility_operating_budgets (organization_id, utility_key);

alter table public.utility_operating_budgets enable row level security;

drop trigger if exists utility_operating_budgets_set_updated_at on public.utility_operating_budgets;
create trigger utility_operating_budgets_set_updated_at
before update on public.utility_operating_budgets
for each row execute function public.set_updated_at();

create table if not exists public.project_type_utilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_type_id uuid not null references public.project_types (id) on delete cascade,
  utility_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_type_utilities_utility_key_check
    check (
      utility_key is null
      or utility_key in ('water', 'sewer', 'power', 'gas', 'stormwater')
    ),
  unique (organization_id, project_type_id)
);

create index if not exists project_type_utilities_org_idx
  on public.project_type_utilities (organization_id, project_type_id);

alter table public.project_type_utilities enable row level security;

drop trigger if exists project_type_utilities_set_updated_at on public.project_type_utilities;
create trigger project_type_utilities_set_updated_at
before update on public.project_type_utilities
for each row execute function public.set_updated_at();

create table if not exists public.funding_source_financing_assumptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  funding_source_id uuid not null references public.funding_sources (id) on delete cascade,
  source_name text,
  financing_type text not null default 'cash',
  interest_rate numeric default 0,
  term_years integer default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint funding_source_financing_assumptions_financing_type_check
    check (financing_type in ('cash', 'bond', 'srf', 'grant')),
  unique (organization_id, funding_source_id)
);

create index if not exists funding_source_financing_assumptions_org_idx
  on public.funding_source_financing_assumptions (organization_id, funding_source_id);

alter table public.funding_source_financing_assumptions enable row level security;

drop trigger if exists funding_source_financing_assumptions_set_updated_at on public.funding_source_financing_assumptions;
create trigger funding_source_financing_assumptions_set_updated_at
before update on public.funding_source_financing_assumptions
for each row execute function public.set_updated_at();

-- Row level security policies

drop policy if exists "Members can view utility financial profiles" on public.utility_financial_profiles;
create policy "Members can view utility financial profiles" on public.utility_financial_profiles
for select
using (public.is_organization_member(organization_id));

drop policy if exists "Editors manage utility financial profiles" on public.utility_financial_profiles;
create policy "Editors manage utility financial profiles" on public.utility_financial_profiles
for all
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

drop policy if exists "Members can view utility operating budgets" on public.utility_operating_budgets;
create policy "Members can view utility operating budgets" on public.utility_operating_budgets
for select
using (public.is_organization_member(organization_id));

drop policy if exists "Editors manage utility operating budgets" on public.utility_operating_budgets;
create policy "Editors manage utility operating budgets" on public.utility_operating_budgets
for all
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

drop policy if exists "Members can view project type utilities" on public.project_type_utilities;
create policy "Members can view project type utilities" on public.project_type_utilities
for select
using (public.is_organization_member(organization_id));

drop policy if exists "Editors manage project type utilities" on public.project_type_utilities;
create policy "Editors manage project type utilities" on public.project_type_utilities
for all
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

drop policy if exists "Members can view funding source assumptions" on public.funding_source_financing_assumptions;
create policy "Members can view funding source assumptions" on public.funding_source_financing_assumptions
for select
using (public.is_organization_member(organization_id));

drop policy if exists "Editors manage funding source assumptions" on public.funding_source_financing_assumptions;
create policy "Editors manage funding source assumptions" on public.funding_source_financing_assumptions
for all
using (public.can_edit_organization(organization_id))
with check (public.can_edit_organization(organization_id));

-- Ensure authenticated users retain access to the new tables

grant select, insert, update, delete on public.utility_financial_profiles to authenticated;

grant select, insert, update, delete on public.utility_operating_budgets to authenticated;

grant select, insert, update, delete on public.project_type_utilities to authenticated;

grant select, insert, update, delete on public.funding_source_financing_assumptions to authenticated;
