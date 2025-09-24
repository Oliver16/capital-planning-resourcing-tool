# Vector – Help & Technical Guide

Vector blends capital planning, staffing intelligence, and utility financial
modeling into a single React application. Use this document inside the in-app
Help view or directly from the repository to understand core workflows and the
underlying architecture.

## How to use Vector

### 1. Navigate the workspace
=======

- **Header actions** – Switch between the capital planning workspace, financial
  modeling suite, admin console (superusers), and this Help view. The active
  organization name and quick access to sign out live in the same header.
- **Tab navigation** – Each major workflow (Projects & Programs, People,
  Assignments, etc.) lives under a tab. Tabs persist state while you move around,
  so edits in one area stay intact as you explore the rest of the app.
- **Scenario selector** – Use the dropdown in the workspace header to jump
  between the live plan and “what-if” scenarios.

### 2. Maintain the capital plan

1. **Seed data** – Under **Settings**, create project types, funding sources, and
   staff categories. These lookups power default values, filters, and reports.
2. **Capture projects & programs** – Enter durations, delivery approach, budget
   details, and (for annual programs) continuous effort settings in **Projects &
   Programs**. Import/export CSV files using the bundled template for bulk edits.
3. **Model effort** – Configure effort templates on the project record or via
   **Effort Projections** to distribute hours by category and phase. Continuous
   effort programs apply the configured monthly hours automatically.
4. **Manage people** – In **People**, add staff categories with rate/capacity
   data and individual staff members with per-phase availability.
5. **Staff assignments** – Let **Assignments** auto-balance demand or manually
   adjust person-by-project hours. Utilization, unfilled demand callouts, and
   reset helpers keep assignments healthy.
6. **Review forecasts** – **Schedule View**, **Resource Forecast**, and
   **Reports** summarize timelines, FTE demand vs. availability, and exportable
   briefings for leadership.

### 3. Run utility financial models

1. **Assign utilities** – Map project types to utilities inside **Model
   Settings** so CIP spend flows into the correct financial model.
2. **Track operating budgets** – Enter annual revenue and expense assumptions in
   **Operating Budget**, including manual adjustments for existing debt service.
3. **Configure financing** – Define funding source financing assumptions
   (interest rate, term, coverage ratios) to drive new debt schedules in
   **Debt Service**.
4. **Generate projections** – The **CIP Plan** and **Pro Forma** tabs combine
   project spend, operating budgets, and debt plans to show cash balance,
   coverage ratio, and reserve trajectories per utility.

### 4. Manage data & exports

- **Export organization data** – From **Settings → Export data**, download the
  full organization snapshot as JSON for backups or support requests.
- **Import data** – Upload a compatible export to seed another environment (UI
  shipping soon; helper functions already handle the shape).
- **Default content** – New organizations auto-populate default project types,
  funding sources, projects, staff, effort templates, assignments, and financial
  profiles from `src/data/defaultData.js`.

### 5. Troubleshooting tips

- **Authentication issues** – If you land on the sign-in screen unexpectedly,
  verify your Supabase session has not expired and that your user belongs to the
  active organization.
- **Role-based access** – Only superusers see the admin console. Editors can
  modify data within their organizations; viewers receive read-only access.
- **Data sync** – The client writes directly to Supabase. If something looks
  stale, refresh to re-fetch the latest rows scoped to your organization.

## Technical Guide

### 1. Application architecture

- **Frontend stack** – React 18 functional components with hooks, Tailwind CSS,
  Lucide icons, Recharts visualizations, and `react-markdown` for in-app
  documentation. A `react-app-rewired` override adjusts webpack to load Supabase
  and Markdown assets cleanly.
- **Modules** – The authenticated shell renders the capital planning workspace,
  the financial modeling suite, and the Markdown Help view. The main workspace
  stays mounted so context persists when toggling Help.
- **State orchestration** – `CapitalPlanningTool` owns the planning state, loads
  default data, syncs edits with Supabase, and renders feature tabs. Financial
  components receive derived planning data and maintain their own configuration
  state per utility.
- **Authentication & routing** – `AuthGate` wraps Supabase Auth, loads
  organization memberships, and conditionally displays the workspace, admin
  console, or Help view based on the selected header action.

### 2. Data persistence layer

Vector stores application data and authentication state in Supabase Postgres.
The browser talks directly to Supabase through the official JavaScript client;
all requests include the user's JWT for row-level security enforcement.

1. **Authentication orchestration** – `AuthContext` surfaces the active session,
   memberships, and role helpers (`signOut`, `hasSuperuserAccess`, etc.).
2. **Organization scoping** – `useDatabase` gates reads/writes on
   `activeOrganizationId` and checks `canEditActiveOrg` before mutating data.
3. **Default data seeding** – Empty organizations populate project types,
   funding sources, projects/programs, staff categories, staff, effort templates,
   assignments, and financial defaults from `src/data/defaultData.js`.
4. **Exports/imports** – Helper methods gather organization-scoped rows into a
   JSON payload for export and bulk insert/update incoming payloads during
   import.

#### 2.1 Schema overview

`useDatabase.js` provisions the following tables:

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `project_types` | Lookup values for theming, filtering, and utility mapping. | `organization_id`, `name`, `color`, `description` |
| `funding_sources` | Catalog of funding mechanisms and assumptions. | `organization_id`, `name`, `description` |
| `projects` | Capital projects and annual programs. | `organization_id`, `phase_dates`, `budget_total`, `delivery_type`, `continuous_effort` |
| `project_effort_templates` | Reusable effort distributions for new projects. | `organization_id`, `project_type_id`, `phase_hours`, `category_overrides` |
| `staff_categories` | Labor roles with capacity and rate data. | `organization_id`, `hourly_rate`, `pm_capacity`, `design_capacity`, `construction_capacity` |
| `staff_members` | Named individuals and their availability. | `organization_id`, `category_id`, `pm_hours`, `design_hours`, `construction_hours` |
| `staff_allocations` | Level-of-effort assignments per project/category. | `organization_id`, `project_id`, `category_id`, `pm_hours`, `design_hours`, `construction_hours` |
| `staff_assignments` | Manual overrides of person-by-project allocations. | `organization_id`, `project_id`, `staff_id`, `phase_hours` |
| `utility_financial_profiles` | Model settings and financial config per utility. | `organization_id`, `utility_key`, `financial_config`, `budget_escalations`, `existing_debt` |
| `utility_operating_budgets` | Revenue & expense line items per utility/year. | `organization_id`, `utility_key`, `year`, `category`, `amount`, `metadata` |
| `project_type_utilities` | Mapping of project types to utilities. | `organization_id`, `project_type_id`, `utility_key` |
| `funding_source_financing_assumptions` | Financing rules for debt modeling. | `organization_id`, `funding_source_id`, `financing_type`, `interest_rate`, `term_years`, `coverage_ratio` |

Foreign keys and unique indices preserve referential integrity across projects,
utilities, assignments, and financial settings.

### 3. Capital planning workspace internals

- **Overview** – Aggregates portfolio totals, budget magnitudes, and critical
  staffing gaps for quick briefings.
- **Projects & Programs** – Inline editable grid supporting CSV import, delivery
  strategy tips, budget normalization, and continuous effort for annual programs.
- **People** – Manage staff categories (capacity + rates) and the staff roster
  (availability per phase). Validation keeps combined category capacity within
  realistic limits.

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

### 4. Staffing intelligence utilities

Shared utilities under `src/utils/` power staffing calculations:

- **Timeline derivation** – `calculateTimelines` converts project inputs into
  explicit design/construction windows. Annual programs treat the program window
  as continuous demand for all phases.
- **Demand normalization** – `normalizeProjectBudgetBreakdown` and
  `normalizeEffortTemplate` keep budget and effort data consistent across
  imports, templates, and manual edits.
- **Assignment engine** – `buildStaffAssignmentPlan` aggregates demand per
  project/category, converts total hours to monthly rates, and assigns
  individuals based on availability and overrides. Utilization, unfilled demand,
  and recommended actions are generated alongside the assignments.
- **Scenario adjustments** – Scenario helpers keep overrides scoped to valid
  project IDs and categories even as the portfolio changes.

### 5. Forecasting & analytics methodology

#### 5.1 Resource forecast generation

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
   combined duration. Annual programs apply continuous monthly hours from
   per-category settings or legacy aggregate totals.
5. **FTE normalization** – All hours convert to FTE using
   `hours ÷ (4.33 × 40)` (173.33 hours per month).

#### 5.2 Staffing gap detection

`calculateStaffingGaps` scans the forecast for categories where required FTE
exceed actual FTE by more than 0.1. Gaps include the month label, required versus
available FTE, and the magnitude of the shortage. The UI escalates gaps greater
than 1 FTE as “Critical.”

#### 5.3 Scenario analysis & reporting

Scenarios reuse the forecast engine with per-project adjustments applied on the
fly. Reports and dashboards read from the same normalized datasets, ensuring the
Overview, Resource Forecast, Schedule View, and Reports tabs remain in sync.

### 6. Financial modeling suite internals

The financial module operates on utility-scoped data derived from the project
portfolio:

- **CIP Plan (`CipSummaryView`)** – Groups projects by utility assignment and
  calculates annual spend, schedule milestones, and funding mix.
- **Operating Budget (`OperatingBudgetView`)** – Captures revenue/expense line
  items with annual escalations, manual overrides, and the ability to insert
  custom line items per utility.
- **Pro Forma (`ProFormaView`)** – `calculateFinancialForecast` blends CIP spend
  curves, operating assumptions, existing debt service, and financing rules to
  project cash balance, coverage ratio, and reserve levels.
- **Debt Service (`DebtServiceView`)** – Models new debt issuances using funding
  source financing assumptions and existing debt instruments. Schedules feed
  directly into the pro forma outputs.
- **Model Settings (`SettingsView`)** – Configure projection years, starting
  cash, coverage targets, and assign project types to utilities. Utility
  selection drives which subset of projects feed the financial views.

### 7. Data management & documentation

- **Exports** – `handleExport` gathers all organization data into a JSON snapshot
  for point-in-time backups or support requests. Imports reuse the same shape
  (UI shipping soon).
- **Help view** – The header Help button renders this Markdown guide in-app via
  `TechnicalGuidePage`, ensuring operators always have the latest reference.

### 8. Extensibility considerations

- **Additional phases** – Calculation utilities isolate phase-specific handling,
  so adding environmental review or commissioning phases primarily involves
  extending allocation objects and the forecast converter.
- **Staffing heuristics** – `buildStaffAssignmentPlan` centralizes demand/supply
  balancing. Swap in alternative assignment strategies or optimization logic
  without rewriting the UI.
- **Service integrations** – `useDatabase` centralizes Supabase access, so
  replacing Supabase with another backend (or layering server-side APIs) only
  requires swapping that hook.
- **Financial model extensions** – Operating budget line items, financing rules,
  and projection views reference normalized utility data, making it easy to add
  sensitivity analysis or export pipelines.
- **Authentication** – Supabase roles can expand beyond viewer/editor to support
  finer-grained permissions or billing-driven entitlements. Superusers bypass
  organization scoping to administer memberships globally.

### 9. Related documentation

- [`README.md`](../README.md) – High-level introduction, setup instructions, and
  workflow overview.
- Source code under `src/` for implementation details referenced above.
- In-app Help (header button) for this guide rendered in Markdown.
