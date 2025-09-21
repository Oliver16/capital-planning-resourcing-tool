# Vector – Technical Guide

This guide documents the application architecture, data model, and analytic methodology that power Vector. It is intended for engineers who need to extend the system or audit its planning assumptions.

## 1. Application architecture

- **Frontend stack** – React 18 with functional components and hooks, Tailwind CSS utility classes, Lucide icons, and Recharts data visualizations. The CRA toolchain is customized through `react-app-rewired` and `config-overrides.js` to keep the bundle lean while integrating the Supabase client.
- **State orchestration** – `CapitalPlanningTool` centralizes application state, loads default data, synchronizes with the database service, and renders feature tabs.
- **Tab layout** – Eight primary views anchor the navigation bar: Overview, Projects & Programs, People (with Staff and Categories sub-pages), Effort Projections, Scenarios, Schedule View, Resource Forecast, and Settings.

## 2. Data persistence layer

Vector stores application data and authentication state in Supabase. The browser communicates directly with Supabase Postgres through the official JavaScript client and every request carries the user's JWT for authorization.

1. **Authentication orchestration** – `AuthContext` wraps Supabase Auth, surfaces the active session, and loads the user's organization memberships and roles.
2. **Organization scoping** – `useDatabase` gates reads and writes on `activeOrganizationId` and enforces permission checks via `canEditActiveOrg` before mutating data.
3. **Default data seeding** – When an organization is empty, the hook seeds project types, funding sources, staff categories, staff, projects, allocations, and assignments from `src/data/defaultData.js`.
4. **Exports/imports** – Helper methods collect all organization-scoped rows into a JSON payload for export and bulk insert/update incoming payloads during import.

### 2.1 Schema overview

`useDatabase.js` provisions the following tables:

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `project_types` | Lookup values for theming and filtering. | `organization_id`, `name`, `color` |
| `funding_sources` | Catalog of funding mechanisms. | `organization_id`, `name`, `description` |
| `staff_categories` | Labor roles with capacity and rate data. | `organization_id`, `hourly_rate`, `pm_capacity`, `design_capacity`, `construction_capacity` |
| `projects` | Capital projects and annual programs. | `organization_id`, budgets, durations, start dates, `delivery_type`, continuous PM/design/construction hours, per-category continuous hours config |
| `staff_allocations` | Level-of-effort assignments per project/category. | `organization_id`, `project_id`, `category_id`, `pm_hours`, `design_hours`, `construction_hours` |
| `staff_members` | Named individuals and their availability. | `organization_id`, `category_id`, per-phase availability hours |

Foreign key constraints and unique indices preserve referential integrity between projects, categories, and allocations.

## 3. Data ingestion & editing workflows

- **Projects & programs** – Inline editable tables allow the planner to change names, types, funding sources, budgets, durations, priorities, and delivery strategies. Buttons add new project or program templates.
- **CSV import** – `handleCSVImport` maps template headers to project fields, normalizes delivery types (`self-perform`, `hybrid`, `consultant`), assigns default IDs, and captures any `PM/Design/Construction Hours - Category` columns before appending the new records. A downloadable template accelerates adoption.
- **Categories** – Editing capacity or rate fields triggers validation to keep the sum of project management, design, and construction hours at or below one FTE (173.33 monthly hours). Warnings explain when thresholds are exceeded.
- **Staff roster** – Planners record per-person availability by phase. Totals aggregate into category-level actual availability and FTE counts, which drive dashboards.
- **Effort projections** – For each project-category combination planners enter hours per phase. The screen contextualizes delivery guidance (self-perform vs. hybrid vs. consultant) and flags funding sources that require external coordination.

## 4. Forecasting & analytics methodology

### 4.1 Timeline derivation

`calculateTimelines` converts project inputs into tangible schedule windows. Projects supply explicit design and construction durations, while annual programs treat the program start/end as both design and construction periods so they drive continuous demand.

### 4.2 Resource forecast generation

`generateResourceForecast` produces a month-by-month dataset that feeds both the Resource Forecast and Schedule View tabs.

1. **Start window** – The earliest valid design start is snapped to the first of the month; if dates are missing, the current month is used.
2. **Horizon limits** – The user-selected horizon is clamped between 1 and 120 months to guard against runaway timelines.
3. **Availability baseline** – For each staff category the function pre-populates `*_actual` values based on either recorded staff availability or fallback capacity totals.
4. **Project demand** –
   - *Discrete projects*: Design allocations are spread evenly across design months, construction allocations across construction months, and project management allocations across the combined duration.
   - *Annual programs*: When per-category hours are defined, each category consumes its configured monthly PM/design/construction hours; otherwise the legacy aggregated totals apply to every category with matching capacity.
5. **FTE normalization** – All hours are converted to FTE using `hours ÷ (4.33 × 40)` (173.33 hours per month).

The resulting array lists each month label along with per-category required versus actual FTE.

### 4.3 Staffing gap detection

`calculateStaffingGaps` scans the forecast for categories where required FTE exceed actual FTE by more than 0.1. Each gap records the month label, required versus available FTE, and the magnitude of the shortage. The UI escalates gaps greater than 1 FTE as “Critical.”

### 4.4 Aggregated dashboards

- **Resource Forecast** – Aggregates total allocated and actual FTE, charts category-level demand, and summarizes peak months, utilization, and recommended mitigation actions.
- **Schedule View** – Reuses the forecast to draw area/column charts, list project timelines, and calculate utilization statistics over selectable 12–120 month horizons.
- **Overview** – Highlights portfolio counts, budget totals, and the top ten staffing gaps.

## 5. Staffing model assumptions

- **FTE definition** – One FTE equals 2080 annual hours. Monthly conversions assume 4.33 weeks/month, or 173.33 hours.
- **Phase granularity** – Every staff category can contribute hours to project management, design, and construction concurrently, mirroring how engineers split their time across project phases.
- **Capacity enforcement** – Category totals cannot exceed one FTE per month to avoid unrealistic double-counting of a role.
- **Actual availability** – If no individual staff are entered, the system falls back to category capacity values so planners still receive indicative dashboards.
- **Gaps threshold** – A 0.1 FTE shortage is the minimum gap; anything smaller is treated as within rounding tolerance.

## 6. Extensibility considerations

- **Additional phases** – The calculations utilities isolate phase-specific handling, so adding environmental review or commissioning phases would involve extending allocation objects and the forecast converter.
- **Service integrations** – `useDatabase` centralizes Supabase access, so replacing Supabase with another backend (or layering server-side APIs) only requires swapping that hook.
- **Integration points** – JSON exports can feed downstream analytics pipelines. The `exportDatabase` function is a single place to add transforms or delivery to cloud storage.
- **Scenario planning** – Introduce named scenarios by storing allocation snapshots in a new table and adding selectors to the forecast tabs.
- **Authentication** – Supabase roles can be extended beyond viewer/editor to support finer-grained permissions or billing-driven entitlements.

## 7. Related documentation

- [`README.md`](../README.md) – High-level introduction, setup instructions, and workflow overview.
- Source code under `src/` for implementation details referenced above.
