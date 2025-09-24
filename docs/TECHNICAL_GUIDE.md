# Vector – Technical Guide

This guide documents the application architecture, data model, and analytic
methodology that power Vector. It is intended for engineers who need to extend
the system or audit its planning assumptions.

## 1. Application architecture

- **Frontend stack** – React 18 with functional components and hooks, Tailwind
  CSS utility classes, Lucide icons, Recharts visualizations, and
  `react-markdown` for in-app documentation. The CRA toolchain is customized
  through `react-app-rewired` to keep the bundle lean while integrating the
  Supabase client and Markdown assets.
- **Modules** – The authenticated shell renders two primary modules: the
  capital planning workspace (tabbed project/staff views) and the financial
  modeling suite. A Help view reuses the Markdown guide for contextual
  documentation.
- **State orchestration** – `CapitalPlanningTool` owns planning state, loads
  default data, synchronizes with the database service, and renders feature
  tabs. The financial suite receives derived planning data and maintains its own
  configuration state per utility.
- **Authentication & routing** – `AuthGate` wraps Supabase Auth, loads
  organization memberships, and conditionally displays the workspace, admin
  console, or the Markdown guide based on the selected header action.

## 2. Data persistence layer

Vector stores application data and authentication state in Supabase. The browser
communicates directly with Supabase Postgres through the official JavaScript
client and every request carries the user's JWT for authorization.

1. **Authentication orchestration** – `AuthContext` surfaces the active session,
   memberships, and user roles, and exposes helpers such as `signOut` and
   `hasSuperuserAccess`.
2. **Organization scoping** – `useDatabase` gates reads and writes on
   `activeOrganizationId` and enforces permission checks via
   `canEditActiveOrg` before mutating data.
3. **Default data seeding** – Empty organizations are populated with project
   types, funding sources, projects/programs, staff categories, staff, effort
   templates, assignments, and financial defaults from
   `src/data/defaultData.js`.
4. **Exports/imports** – Helper methods collect all organization-scoped rows
   into a JSON payload for export and bulk insert/update incoming payloads during
   import (import UI coming soon).

### 2.1 Schema overview

`useDatabase.js` provisions the following tables:

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `project_types` | Lookup values for theming, filtering, and utility mapping. | `organization_id`, `name`, `color`, `description` |
| `funding_sources` | Catalog of funding mechanisms and assumptions. | `organization_id`, `name`, `description` |
| `projects` | Capital projects and annual programs. | `organization_id`, phase durations/dates, budgets, delivery type, continuous effort config |
| `project_effort_templates` | Reusable effort distributions for new projects. | `organization_id`, `project_type_id`, per-phase hours, category overrides |
| `staff_categories` | Labor roles with capacity and rate data. | `organization_id`, `hourly_rate`, `pm_capacity`, `design_capacity`, `construction_capacity` |
| `staff_members` | Named individuals and their availability. | `organization_id`, `category_id`, phase-specific availability hours |
| `staff_allocations` | Level-of-effort assignments per project/category. | `organization_id`, `project_id`, `category_id`, `pm_hours`, `design_hours`, `construction_hours` |
| `staff_assignments` | Manual overrides of person-by-project allocations. | `organization_id`, `project_id`, `staff_id`, per-phase hours |
| `utility_financial_profiles` | Model settings and financial config per utility. | `organization_id`, `utility_key`, `financial_config`, `budget_escalations`, `existing_debt_*` |
| `utility_operating_budgets` | Revenue & expense line items per utility/year. | `organization_id`, `utility_key`, `year`, `category`, `amount`, metadata JSON |
| `project_type_utilities` | Mapping of project types to utilities. | `organization_id`, `project_type_id`, `utility_key` |
| `funding_source_financing_assumptions` | Financing rules for debt modeling. | `organization_id`, `funding_source_id`, `financing_type`, `interest_rate`, `term_years`, `coverage_ratio` |

Foreign key constraints and unique indices preserve referential integrity
between projects, categories, utilities, and assignments.

## 3. Capital planning workspace

The tabbed workspace focuses on day-to-day project, staffing, and reporting
workflows:

- **Overview** – Aggregates portfolio totals, budget magnitudes, and critical
  staffing gaps for quick briefings.
- **Projects & Programs** – Inline editable grid that supports CSV import,
  delivery strategy tips, budget normalization, and continuous effort for annual
  programs.
- **People** – Manages staff categories (capacity + hourly rates) and the staff
  roster (availability per phase). Validation keeps combined category capacity
  at or below one FTE per month.
- **Assignments** – `StaffAssignmentsTab` blends automated demand balancing with
  manual overrides. Utilization summaries, unfilled demand callouts, and reset
  actions keep project staffing aligned with available people.
- **Effort Projections** – Capture hours by project/category/phase with
  contextual delivery guidance (self-perform, hybrid, consultant) and funding
  reminders.
- **Scenarios** – Store “what-if” adjustments without overwriting live data.
  Each scenario tracks per-project overrides and reuses the forecast engine to
  preview impacts.
- **Schedule View & Resource Forecast** – Visualize timeline, demand versus
  availability, shortage trends, and recommended mitigation actions across
  adjustable 12–120 month horizons.
- **Reports** – Curated tables and graphics (gaps, program summaries, staffing
  mix) optimized for PDF export.
- **Settings** – Manage project types, funding sources, and helper defaults that
  seed new organizations.

## 4. Staffing intelligence

The assignment planner and forecasting layers share a suite of utilities under
`src/utils/`:

- **Timeline derivation** – `calculateTimelines` converts project inputs into
  explicit design/construction windows. Annual programs treat the program window
  as continuous demand for all phases.
- **Demand normalization** – `normalizeProjectBudgetBreakdown` and
  `normalizeEffortTemplate` keep budget and effort data consistent across
  imports, templates, and manual edits.
- **Assignment engine** – `buildStaffAssignmentPlan` aggregates demand per
  project/category, converts total hours to monthly rates, and assigns individual
  staff based on availability and overrides. Utilization, unfilled demand, and
  recommended actions are generated alongside the assignments.
- **Scenario adjustments** – `normalizeEffortTemplate` and scenario helpers keep
  adjustments scoped to valid project IDs and categories even as portfolio data
  changes.

## 5. Forecasting & analytics methodology

### 5.1 Resource forecast generation

`generateResourceForecast` produces a month-by-month dataset that feeds both the
Resource Forecast and Schedule View tabs.

1. **Start window** – The earliest valid design start snaps to the first of the
   month; missing dates fall back to the current month.
2. **Horizon limits** – User-selected horizons clamp between 1 and 120 months to
   guard against runaway timelines.
3. **Availability baseline** – For each staff category the function pre-populates
   `*_actual` values based on recorded staff availability or fallback capacity
   totals.
4. **Project demand** – Discrete projects spread design/construction allocations
   evenly across their respective months while project management spans the
   combined duration. Annual programs apply continuous monthly hours either from
   per-category settings or the legacy aggregate totals.
5. **FTE normalization** – All hours are converted to FTE using
   `hours ÷ (4.33 × 40)` (173.33 hours per month).

### 5.2 Staffing gap detection

`calculateStaffingGaps` scans the forecast for categories where required FTE
exceed actual FTE by more than 0.1. Each gap records the month label, required
versus available FTE, and the magnitude of the shortage. The UI escalates gaps
greater than 1 FTE as “Critical.”

### 5.3 Scenario analysis & reporting

Scenarios reuse the forecast engine with per-project adjustments applied on the
fly. Reports and dashboards read from the same normalized datasets, ensuring the
Overview, Resource Forecast, Schedule View, and Reports tabs remain in sync.

## 6. Financial modeling suite

The financial module operates on utility-scoped data derived from the project
portfolio:

- **CIP Plan (`CipSummaryView`)** – Groups projects by utility assignment and
  calculates annual spend, schedule milestones, and funding mix.
- **Operating Budget (`OperatingBudgetView`)** – Captures revenue/expense line
  items with annual escalations, manual overrides, and the ability to insert
  custom line items per utility.
- **Pro Forma (`ProFormaView`)** – `calculateFinancialForecast` blends CIP spend
  curves, operating assumptions, existing debt service, and financing rules to
  produce cash balance, coverage ratio, and reserve projections.
- **Debt Service (`DebtServiceView`)** – Models new debt issuances using funding
  source financing assumptions and existing debt instruments. Schedules feed
  directly into the pro forma outputs.
- **Model Settings (`SettingsView`)** – Configure projection years, starting
  cash, coverage targets, and assign project types to utilities. Utility
  selection drives which subset of projects feed the financial views.

## 7. Data management & documentation

- **Exports** – `handleExport` gathers all organization data into a JSON snapshot
  for point-in-time backups or support requests. Imports reuse the same shape and
  are planned for a future release.
- **Help view** – The header Help button renders this Markdown guide in-app via
  `TechnicalGuidePage`, ensuring operators always have the latest technical
  reference.

## 8. Extensibility considerations

- **Additional phases** – Calculation utilities isolate phase-specific handling,
  so adding environmental review or commissioning phases involves extending
  allocation objects and the forecast converter.
- **Staffing heuristics** – `buildStaffAssignmentPlan` centralizes demand/ supply
  balancing. Plug in alternative assignment strategies or optimization logic
  without rewriting the UI.
- **Service integrations** – `useDatabase` centralizes Supabase access, so
  replacing Supabase with another backend (or layering server-side APIs) only
  requires swapping that hook.
- **Financial model extensions** – Operating budget line items, financing rules,
  and projection views reference normalized utility data, making it easy to add
  sensitivity analysis or export pipelines.
- **Authentication** – Supabase roles can be extended beyond viewer/editor to
  support finer-grained permissions or billing-driven entitlements. Superusers
  bypass organization scoping to administer memberships globally.

## 9. Related documentation

- [`README.md`](../README.md) – High-level introduction, setup instructions, and
  workflow overview.
- Source code under `src/` for implementation details referenced above.
- In-app Help (header button) for this guide rendered in Markdown.

