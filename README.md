# Vector

Vector is a React-based portfolio planning application built for municipal utilities and public works teams to coordinate capital improvement projects, staffing plans, and resource forecasts. The tool combines editable project data, staffing capacity models, and interactive dashboards so planners can align delivery schedules with available full-time-equivalent (FTE) resources.

## Key capabilities

- **Configurable data model** – Maintain catalogs of project types, funding sources, staff categories, and individual staff members that drive all calculations.
- **Project & program management** – Capture both discrete projects and recurring annual programs, including budgets, durations, delivery strategies, and funding assignments.
- **Phase-aware staffing allocations** – Allocate level of effort separately across project management, design, and construction phases and monitor the impact on budgets and FTE demand.
- **People-centric availability tracking** – Record the monthly availability of real staff by discipline to ground forecasts in actual hours on hand.
- **Resource & schedule visualizations** – Explore staffing demand versus availability, timeline views, and staffing gap summaries to identify when hiring or rescheduling is required.
- **Multi-tenant Supabase backend** – Organizations, memberships, and all planning data live in PostgreSQL with row-level security that enforces per-organization isolation and view vs. edit permissions.

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
3. **Provision the database schema** – Open the Supabase SQL editor (or use the Supabase CLI) and run [`supabase/schema.sql`](supabase/schema.sql). This creates the organizations, memberships, and portfolio tables along with helper functions and row-level security policies.
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

The project targets modern browsers through React 18, Tailwind CSS, and Recharts. `react-app-rewired` applies custom webpack fallbacks so the Supabase client and legacy dependencies bundle cleanly in the browser.

### Supabase environment variables

Vector looks for Supabase credentials under several environment variable prefixes so both local `.env` files and Vercel's Supabase integration work out of the box. Provide any of the following pairs and the build will normalize them at compile time:

| Purpose | Local `.env` name | Vercel integration name(s) |
| --- | --- | --- |
| Supabase URL | `REACT_APP_SUPABASE_URL` | `STORAGE_NEXT_PUBLIC_SUPABASE_URL`, `STORAGE_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL` |
| Supabase anon key | `REACT_APP_SUPABASE_ANON_KEY` | `STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY`, `STORAGE_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY` |

During development you can stick to the `REACT_APP_*` names. When deploying on Vercel, enabling the Supabase integration automatically injects the `STORAGE_*` variables listed above, and the client will pick them up without additional configuration.

## Application structure

```
capital-planning-resourcing-tool/
├── public/                # Static assets & HTML template
├── src/
│   ├── App.js             # Application shell that renders the tool
│   ├── components/
│   │   ├── CapitalPlanningTool.js   # State orchestration & tab navigation
│   │   └── tabs/                    # Feature-specific UI panels
│   ├── context/AuthContext.js       # Supabase auth + organization gatekeeper
│   ├── data/defaultData.js          # Seed data for first-load experience
│   ├── hooks/useDatabase.js         # Supabase persistence + seeding layer
│   ├── lib/supabaseClient.js        # Supabase JS client factory
│   ├── utils/                       # Calculations and import/export helpers
│   └── index.css / styles.css       # Tailwind setup & theme overrides
├── supabase/
│   └── schema.sql          # Database schema, helper functions, and RLS policies
├── tailwind.config.js      # Tailwind theme extensions
└── config-overrides.js     # CRA webpack overrides for legacy SQL.js support
```

## Core workflows

### Projects & programs
Use the **Projects & Programs** tab to add capital projects or annual programs, edit attributes inline, and import portfolios from CSV using the bundled template. Delivery approaches (self-perform, hybrid, consultant) feed guidance messaging and help planners document outsourcing assumptions. Annual programs capture monthly project management, design, and construction demand totals and let you assign that effort across each staff category so ongoing workloads roll directly into resource forecasts.

### Staff categories
Define labor categories with phase-specific monthly capacities and hourly rates. Capacity edits are validated against a one-FTE (2080 hours/year ÷ 12) ceiling to keep workload assumptions realistic.

### People roster
Maintain a roster of staff and their monthly availability by project management, design, and construction activities. The tool aggregates individual availability into category totals and FTE equivalents that power the dashboards.

### Staffing allocations
Distribute level-of-effort hours for each project/program and staff category by phase. Delivery strategy tips and funding source callouts provide planning cues for consultant coordination and grant compliance.

### Schedule & resource dashboards

- **Schedule View** blends a Gantt-style timeline with stacked bar charts summarizing monthly demand, shortages, and utilization across the selected horizon.
- **Resource Forecast** plots allocated FTE versus actual availability, highlights category-level gaps, and offers recommended mitigation actions.
- **Overview** summarizes portfolio totals, budget magnitudes, and the most critical staffing gaps for quick briefings.

## Data persistence & sharing

Vector persists application data in Supabase Postgres. Every portfolio table carries an `organization_id` foreign key, and row-level security policies ensure users can only read or modify data for organizations where they hold a membership. When a new organization is created the app seeds project types, funding sources, categories, projects, staff, and assignments from `src/data/defaultData.js`. Users can export the current organization to JSON (via the **Settings → Export data** action) or import a compatible export to bootstrap another environment.

## Assumptions & calculation highlights

- **FTE conversion** – 1 FTE equals 173.33 hours/month (2080 annual hours ÷ 12). Forecasting utilities convert entered hours to FTE using `hours ÷ (4.33 × 40)`.
- **Phase weighting** – Project allocations are prorated across design and construction months; project management effort is spread across the total duration, while annual programs apply continuous monthly demand.
- **Gap detection** – Monthly shortages greater than 0.1 FTE surface as gaps with severity indicators (moderate vs. critical at >1 FTE short).
- **Time horizons** – Forecast and schedule views default to 36 months but allow adjustments from 12 to 120 months for long-range planning.
- **Delivery guidance** – Delivery selections drive contextual tips about in-house versus consultant responsibilities and funding-specific coordination reminders.

See [`docs/TECHNICAL_GUIDE.md`](docs/TECHNICAL_GUIDE.md) for a deeper dive into the data model, calculations, and extension points.
