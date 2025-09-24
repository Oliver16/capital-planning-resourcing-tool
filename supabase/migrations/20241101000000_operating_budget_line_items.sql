alter table public.utility_operating_budgets
  add column if not exists revenue_line_items jsonb default '[]'::jsonb,
  add column if not exists expense_line_items jsonb default '[]'::jsonb;

update public.utility_operating_budgets
  set revenue_line_items = coalesce(revenue_line_items, '[]'::jsonb)
  where revenue_line_items is null;

update public.utility_operating_budgets
  set expense_line_items = coalesce(expense_line_items, '[]'::jsonb)
  where expense_line_items is null;
