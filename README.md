# Vector

Vector is a React-based portfolio planning and financial forecasting platform
built for municipal utilities and public works teams to coordinate capital
projects, staffing plans, and long-range funding strategies. The application
combines editable project data, staffing capacity models, debt planning tools,
and interactive dashboards so planners can align delivery schedules, people, and
cash flow in a single workspace.

## Key capabilities

- **Configurable data model** – Maintain catalogs of project types, funding
  sources, staff categories, individual staff members, and effort templates that
  drive every calculation.
- **Project & program management** – Capture discrete capital projects and
  annual programs, including phase durations, delivery approaches, budget
  breakdowns, and continuous effort for recurring work.
- **Staffing & assignment planning** – Track per-person availability,
  distribute level-of-effort hours by category and phase, and use the
  assignment planner to match demand to named staff with utilization insights.
- **Scenario planning & reporting** – Model “what-if” adjustments, compare
  staffing gaps, and export curated dashboards for leadership briefings.
- **Financial modeling suite** – Build utility-specific CIP spend plans, align
  operating revenue/expense assumptions, evaluate debt coverage, and test
  financing strategies across multi-year horizons.
- **In-app technical guide** – Launch contextual documentation directly from the
  workspace to review architecture, data flows, and methodology in Markdown.
- **Multi-tenant Supabase backend** – Organizations, memberships, and all
  planning data live in PostgreSQL with row-level security that enforces per
  organization isolation and view vs. edit permissions.

## Quick start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure Supabase credentials**

   ```bash
   cp .env.example .env.local
   # Then edit .env.local with your Supabase URL + anon key. The app accepts either
   # REACT_APP_* variables or the STORAGE_NEXT_PUBLIC_* names Vercel's Supabase
   # integration provides.
   ```

3. **Provision the database schema** – Link the Supabase CLI to your project and
   push the checked-in migrations. The `SUPABASE_REF` is the project ref from the
   Supabase dashboard.

   ```bash
   # One-time
   SUPABASE_REF=your-project-ref npm run db:link

   # Apply all migrations
   npm run db:push
   ```

   A full snapshot of the schema still lives at
   [`supabase/schema.sql`](supabase/schema.sql) if you prefer to run a single SQL
   script manually.

4. **Run the development server**

   ```bash
   npm start
   ```

5. **Execute the automated test suite** (optional)

   ```bash
   npm test
   ```

6. **Create a production build**

   ```bash
   npm run build
   ```

Vector targets modern browsers through React 18, Tailwind CSS, and Recharts.
`react-app-rewired` applies custom webpack fallbacks so the Supabase client and
legacy dependencies bundle cleanly in the browser.

## Application layout

Vector organizes functionality into three primary areas surfaced from the
header.

### Capital planning workspace

The workspace contains the tabbed experience used for day-to-day portfolio and
staffing work:

- **Overview** – Portfolio summary tiles, budget magnitudes, and the most
  critical staffing gaps.
- **Projects & Programs** – Inline editable grid for project attributes,
  program-level recurring hours, and CSV import/export of the bundled template.
- **People** – Manage the staff roster (availability per phase) and the staff
  categories that define capacity and billing rates.
- **Assignments** – Auto-build or manually refine person-by-project
  assignments, track utilization, and highlight unfilled demand with reset
  options per project.
- **Effort Projections** – Allocate hours by project, category, and phase with
  contextual delivery guidance and funding reminders.
- **Scenarios** – Create “what-if” sets of adjustments, tune hours or dates, and
  compare against the baseline plan without overwriting live data.
- **Schedule View** – Gantt-style timelines, utilization summaries, and
  interactive horizon controls spanning 12–120 months.
- **Resource Forecast** – FTE demand versus availability charts, shortage call
  outs, and recommended mitigation actions.
- **Reports** – Pre-built executive views (staffing gaps, program summaries,
  portfolio mix) optimized for PDF export.
- **Settings** – Manage project types, funding sources, and helper defaults
  referenced throughout the application.

### Financial modeling suite

Switching to the financial module exposes utility-level cash flow tools:

- **CIP Plan** – Summaries of project schedules, spend curves, and funding mix
  by assigned utility.
- **Operating Budget** – Revenue and expense line items with annual escalations
  and manual adjustments for existing debt service.
- **Pro Forma** – Cash balance, coverage ratio, and reserve projections informed
  by the CIP plan and operating assumptions.
- **Debt Service** – Model new debt issues, amortization schedules, and funding
  source financing assumptions.
- **Model Settings** – Configure projection years, starting cash, coverage
  targets, and map project types to specific utilities.

### Help & documentation

A new **Help** button in the header opens an in-app Markdown rendering of
[`docs/TECHNICAL_GUIDE.md`](docs/TECHNICAL_GUIDE.md). Use it to review the data
model, calculations, and extension points without leaving the application.

## Database migrations

Vector tracks database changes with the Supabase CLI:

- Timestamped SQL migrations live in [`supabase/migrations/`](supabase/migrations/)
  (for example, `20240101000000_init.sql`). Apply them with the CLI to provision
  the schema that the React client expects.
- `npm run db:mig:new <name>` – scaffold a timestamped SQL file inside
  `supabase/migrations/`.
- `npm run db:push` – apply all pending migrations to the linked Supabase
  project.
- `npm run db:reset:local` – recreate the local development stack and re-apply
  migrations (mirrors `supabase db reset --force`).

Set the `SUPABASE_REF` environment variable before running commands that talk to
Supabase (such as `npm run db:link` or `npm run db:push`). Migrations ship
alongside the existing [`supabase/schema.sql`](supabase/schema.sql) snapshot so
you can still inspect the full schema or run it manually if desired. Database
seeding continues to happen client-side via
[`src/data/defaultData.js`](src/data/defaultData.js), so the `supabase/seed.sql`
file is only a placeholder to satisfy the CLI.

### Supabase environment variables

Vector looks for Supabase credentials under several environment variable
prefixes so both local `.env` files and Vercel's Supabase integration work out
of the box. Provide any of the following pairs and the build will normalize them
at compile time:

| Purpose | Local `.env` name | Vercel integration name(s) |
| --- | --- | --- |
| Supabase URL | `REACT_APP_SUPABASE_URL` | `STORAGE_NEXT_PUBLIC_SUPABASE_URL`, `STORAGE_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL` |
| Supabase anon key | `REACT_APP_SUPABASE_ANON_KEY` | `STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY`, `STORAGE_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY` |

During development you can stick to the `REACT_APP_*` names. When deploying on
Vercel, enabling the Supabase integration automatically injects the `STORAGE_*`
variables listed above, and the client will pick them up without additional
configuration.

## Data persistence & sharing

Vector persists application data in Supabase Postgres. Every portfolio table
carries an `organization_id` foreign key, and row-level security policies ensure
users can only read or modify data for organizations where they hold a
membership. When a new organization is created the app seeds project types,
funding sources, categories, projects, staff, effort templates, assignments, and
financial defaults from `src/data/defaultData.js`.

Data management actions live in **Settings → Export data**. Users can export the
current organization to JSON or import a compatible export (import is coming in
a future release) to bootstrap another environment or provide support snapshots.

## Assumptions & calculation highlights

- **FTE conversion** – 1 FTE equals 173.33 hours/month (2080 annual hours ÷ 12).
  Forecasting utilities convert entered hours to FTE using
  `hours ÷ (4.33 × 40)`.
- **Phase weighting** – Project allocations prorate across design and
  construction months. Project management effort is spread across the combined
  duration, while annual programs apply continuous monthly demand.
- **Staff assignment engine** – `buildStaffAssignmentPlan` balances demand and
  availability per project/category, fills gaps with suggested staff, and
  surfaces utilization plus unfilled demand metrics.
- **Financial modeling** – `calculateFinancialForecast` blends project spend
  curves, operating budget assumptions, and debt service inputs to produce cash
  flow, coverage, and reserve projections per utility.
- **Gap detection** – Monthly shortages greater than 0.1 FTE surface as gaps
  with severity indicators (moderate vs. critical at >1 FTE short).
- **Time horizons** – Forecast and schedule views default to 36 months but allow
  adjustments from 12 to 120 months for long-range planning.
- **Delivery guidance** – Delivery selections drive contextual tips about
  in-house versus consultant responsibilities and funding-specific coordination
  reminders.

## Documentation & support

- [`docs/TECHNICAL_GUIDE.md`](docs/TECHNICAL_GUIDE.md) – Deep dive into the data
  model, calculations, and extension points. The same content is rendered inside
  the application via the Help button.
- Source code under `src/` for implementation details referenced above.

