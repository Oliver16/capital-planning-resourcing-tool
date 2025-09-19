# Capital Planning & Resourcing Tool – Technical Guide

This guide documents the application architecture, data model, and analytic methodology that power the Capital Planning & Resourcing Tool. It is intended for engineers who need to extend the system or audit its planning assumptions.

## 1. Application architecture

- **Frontend stack** – React 18 with functional components and hooks, Tailwind CSS utility classes, Lucide icons, and Recharts data visualizations. The CRA toolchain is customized through `react-app-rewired` and `config-overrides.js` to disable Node-specific polyfills that SQLite does not require.
- **State orchestration** – `CapitalPlanningTool` centralizes application state, loads default data, synchronizes with the database service, and renders feature tabs.
- **Tab layout** – Eight tabs encapsulate major workflows: Overview, Projects & Programs, Staff Categories, People, Staff Allocations, Schedule View, Resource Forecast, and Settings.

## 2. Data persistence layer

The application runs entirely in the browser using SQLite compiled to WebAssembly (`sql.js`).

1. **Initialization** – `useDatabase` lazy-loads the SQL.js module, creates required tables, and runs idempotent migrations such as adding `delivery_type` and `pm_hours` columns when absent.
2. **Persistence** – All writes are wrapped in SQLite transactions and the resulting database file is serialized into `localStorage` so edits survive refreshes and offline use.
3. **Exports/imports** – Users can export the database to a `.sqlite` blob for archival and later import that same file to restore prior work.
4. **Default data** – On first load the hook seeds projects, staff categories, funding sources, and staff members from `src/data/defaultData.js`.

### 2.1 Schema overview

`useDatabase.js` provisions the following tables:

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `project_types` | Lookup values for theming and filtering. | `name`, `color` |
| `funding_sources` | Catalog of funding mechanisms. | `name`, `description` |
| `staff_categories` | Labor roles with capacity and rate data. | `hourly_rate`, `pm_capacity`, `design_capacity`, `construction_capacity` |
| `projects` | Capital projects and annual programs. | Budgets, durations, start dates, `delivery_type`, program-specific hours |
| `staff_allocations` | Level-of-effort assignments per project/category. | `pm_hours`, `design_hours`, `construction_hours` |
| `staff_members` | Named individuals and their availability. | `category_id`, per-phase availability hours |

Foreign key constraints and unique indices preserve referential integrity between projects, categories, and allocations.

## 3. Data ingestion & editing workflows

- **Projects & programs** – Inline editable tables allow the planner to change names, types, funding sources, budgets, durations, priorities, and delivery strategies. Buttons add new project or program templates.
- **CSV import** – `handleCSVImport` maps template headers to project fields, normalizes delivery types (`self-perform`, `hybrid`, `consultant`), assigns default IDs, and appends the new records. A downloadable template accelerates adoption.
- **Staff categories** – Editing capacity or rate fields triggers validation to keep the sum of project management, design, and construction hours at or below one FTE (173.33 monthly hours). Warnings explain when thresholds are exceeded.
- **People roster** – Planners record per-person availability by phase. Totals aggregate into category-level actual availability and FTE counts, which drive dashboards.
- **Staff allocations** – For each project-category combination planners enter hours per phase. The screen contextualizes delivery guidance (self-perform vs. hybrid vs. consultant) and flags funding sources that require external coordination.

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
   - *Annual programs*: Continuous monthly hours for PM, design, and construction are applied whenever the program is active.
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
- **Alternative persistence** – `useDatabase` can be swapped for an IndexedDB-backed service if larger datasets or multi-user synchronization are required.
- **Integration points** – Exported SQLite files can be processed in external analytics tools. The `exportDatabase` function could be extended to push data to cloud storage or APIs.
- **Scenario planning** – Introduce named scenarios by storing allocation snapshots in a new table and adding selectors to the forecast tabs.
- **Authentication** – Wrap the React app in an authentication provider and move persistence to a server when multi-user governance becomes necessary.

## 7. Related documentation

- [`README.md`](../README.md) – High-level introduction, setup instructions, and workflow overview.
- Source code under `src/` for implementation details referenced above.
