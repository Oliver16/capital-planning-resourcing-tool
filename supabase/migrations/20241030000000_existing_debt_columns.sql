-- Add JSON columns to store existing debt schedules and instrument definitions
ALTER TABLE utility_financial_profiles
ADD COLUMN IF NOT EXISTS existing_debt_manual_totals JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS existing_debt_instruments JSONB NOT NULL DEFAULT '[]'::jsonb;
