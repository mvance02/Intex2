# IS 413 — Enterprise Application Development

## Matt's Key Notes

- Tech stack: **.NET 10 / C# backend, React + TypeScript (Vite) frontend**
- Make sure the site **looks good** — polish matters, it's the face of the project for judges
- Make sure it **isn't breaking** — validate data and handle errors robustly
- **Separate yourself** from other teams by adding cool features, smart details, and good flow (not just the minimum requirements)
- Need to show what you did for security in the final video — **it won't be graded if it isn't shown**
- The site needs to handle: how to get donors, how to track donations, social media, admin users vs. other users

---

## Page Requirements

### Public (Non-Authenticated Users)

- **Home / Landing Page:** Modern, professional page introducing the organization, its mission, and clear calls to action for visitors to engage or support.
- **Impact / Donor-Facing Dashboard:** Displays aggregated, anonymized data showing the organization's impact (outcomes, progress, resource use) in a visually clear way.
- **Login Page:** Authenticates users with username and password. Proper validation and error handling.
- **Privacy Policy + Cookie Consent:** Privacy policy explaining data usage + GDPR-compliant cookie consent notification. See IS 414 for details.

### Admin / Staff Portal (Authenticated Users Only)

- **Admin Dashboard:** High-level overview of key metrics — active residents across safehouses, recent donations, upcoming case conferences, summarized progress data. The "command center" for staff.
- **Donors & Contributions:** View, create, and manage supporter profiles by type (monetary donor, volunteer, skills contributor, etc.) and status (active/inactive). Track all contribution types (monetary, in-kind, time, skills, social media). Record and review donation activity. View donation allocations across safehouses and program areas.
- **Caseload Inventory:** Core case management page. Maintain records for all residents following Philippine social welfare agency structure. View, create, and update resident profiles including demographics, case category and sub-categories (trafficked, victim of physical abuse, neglected, etc.), disability info, family socio-demographic profile (4Ps beneficiary, solo parent, indigenous group, informal settler), admission details, referral info, assigned social workers, and reintegration tracking. Supports filtering and searching by case status, safehouse, case category, and other key fields.
- **Process Recording:** Forms for entering and viewing dated counseling session notes per resident. Each entry captures: session date, social worker, session type (individual or group), emotional state observed, narrative summary, interventions applied, and follow-up actions. Full chronological history of process recordings per resident. Primary tool for documenting each resident's healing journey.
- **Home Visitation & Case Conferences:** Log home and field visits including visit type (initial assessment, routine follow-up, reintegration assessment, post-placement monitoring, emergency), home environment observations, family cooperation level, safety concerns, and follow-up actions. View case conference history and upcoming conferences per resident.
- **Reports & Analytics:** Aggregated insights and trends to support decisions. Include donation trends over time, resident outcome metrics (education progress, health improvements), safehouse performance comparisons, and reintegration success rates. Consider aligning with the Annual Accomplishment Report format used by Philippine social welfare agencies (services provided: caring, healing, teaching; beneficiary counts; program outcomes).

### Misc

- Any additional pages required to support security, social media, accessibility, or partner features described in other parts of the project.

---

## Technical Requirements

- **Backend:** .NET 10 / C#
- **Frontend:** React / TypeScript (Vite)
- **Database:** Azure SQL Database, MySQL, or PostgreSQL (relational). Security database may be housed separately.
- Both the **app and database must be deployed**.
- Recommended deployment: **Microsoft Azure** (you have the practice and credits)
- Use **good database principles** — normalize properly, use migrations, don't hardcode secrets
- Validate data and handle errors so the site is robust and reliable
- Pay attention to **finishing touches**: titles, icons, logos, consistent look and feel, pagination, speed
- These details are what separate good websites from excellent ones

---

## Project Context: BYU IS 413 INTEX (Full Stack)
## Technology Stack
- **Backend:** ASP.NET Core 8.0 Web API (C#)
- **Frontend:** React with TypeScript (Vite/CRA)
- **Database:** Entity Framework Core (EF Core) with SQLite or Postgres SQL
- **Backend Deploy:** Railway
- **Frontend Deploy:** Vercel
- **Shared DB Host:** Supabase (PostgreSQL)
## Architecture Patterns
- **Decoupled:** The frontend and backend are in separate folders (`/frontend`, `/backend`).
- **Routing:** - Backend: Attribute routing (e.g., `[Route("[controller]")]`).
  - Frontend: React Router for client-side navigation.
- **Data Flow:** React components use `useEffect` to fetch data from the API and `useState` to render it.
## Coding Standards (Professor Hilton Style)
- Use Functional Components in React.
- Use TypeScript for all frontend files (.tsx).
- Preferred folder structure:
  - Backend: `/Controllers`, `/Models`, `/Data` (for DbContext).
  - Frontend: `/src/components`, `/src/types`.
- Ensure CORS is configured in `Program.cs` to allow the React development port.

---

## Deployment: Supabase (Shared) + Vercel

### Context
Matt's Supabase free account is full. The team uses **one teammate's Supabase account**
as the shared PostgreSQL database. Everyone connects to it via a shared connection string.
Frontend (React) deploys to Vercel. Backend (.NET API) deploys to Vercel (or a compatible
host — see note below).

---

### Step 1 — One Teammate Creates the Supabase Project
The teammate with a free account that has space:
1. Goes to [supabase.com](https://supabase.com) → New Project
2. Names it something clear (e.g., `intex-team`)
3. Sets a strong database password and saves it immediately
4. Shares **three things** with the team via a secure channel (not GitHub):
   - **Project URL** → Settings → API → Project URL
   - **anon/public key** → Settings → API (safe for frontend)
   - **service_role key** → Settings → API (backend only — treat like a password)
   - **DB Connection String** → Settings → Database → Connection string (URI format)

> **Team habit:** Never share secrets over Slack public channels or Discord servers.
> Use a private DM or a shared password manager (e.g., Bitwarden).

---

### Step 2 — Wire .NET Backend to Supabase PostgreSQL

Install the Npgsql EF Core provider:
```bash
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
```

Update `appsettings.json` (the non-secret, non-committed version):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=db.YOURREF.supabase.co;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;SSL Mode=Require"
  }
}
```

Update `Program.cs` to use PostgreSQL instead of SQLite:
```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
```

Update `AppDbContext` — no changes needed if you were already using EF Core.
EF Core handles the SQL dialect automatically once the provider is swapped.

> **Important:** Add `appsettings.Development.json` (which contains the real connection
> string) to `.gitignore`. Everyone on the team uses the same string locally but it
> must never be committed to GitHub.

---

### Step 3 — Run Migrations (One Person Only, Once)

**Only one person runs migrations.** Coordinate this — whoever sets up the project first:
```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

This creates all tables in the shared Supabase PostgreSQL instance. All other teammates
just connect — they do **not** run `database update` again unless the schema changes.

> **Team habit for schema changes:** If someone needs to change the schema (add a table,
> add a column), they:
> 1. Tell the team first — don't do it silently
> 2. Create the migration locally: `dotnet ef migrations add <MigrationName>`
> 3. Commit the migration file to GitHub
> 4. Announce in the group chat that everyone should pull and run `dotnet ef database update`
> Everyone must run the update or their local app will be out of sync with the DB.

---

### Step 4 — Use Environment Variables (Never Hardcode Secrets)

Create a `.env` file locally (add to `.gitignore`):
```
SUPABASE_URL=https://YOURREF.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DB_CONNECTION_STRING=Host=db.YOURREF.supabase.co;Database=postgres;...
```

In `appsettings.Development.json` (also gitignored):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=db.YOURREF.supabase.co;..."
  }
}
```

Add both to `.gitignore`:
```
.env
appsettings.Development.json
appsettings.*.json
```

> **Team habit:** Keep a `appsettings.example.json` committed to GitHub with placeholder
> values so teammates know which keys they need — but never the actual values.

---

### Step 5 — Deploy Frontend to Vercel

1. Push your React frontend to GitHub (it should live in `/frontend`)
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Set the **Root Directory** to `frontend` (since it's in a subfolder)
4. Set the **Framework Preset** to Vite (or CRA if applicable)
5. Add environment variables in Vercel → Settings → Environment Variables:
   - `VITE_API_BASE_URL` → your deployed backend URL
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon/public key (safe for frontend)

> **Never add `SUPABASE_SERVICE_ROLE_KEY` to Vercel frontend env vars.**
> That key is backend-only.

In your React code, access variables via:
```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

---

### Step 6 — Deploy Backend (.NET API) to Railway

> **Note:** Vercel does **not** natively support .NET. Use **Railway** for the backend.
> Railway auto-detects .NET projects, has faster cold starts than Render's free tier,
> and its free credit ($5/month) is more than enough for a week-long Intex.

**Railway Setup (Recommended)**
1. Install the CLI: `npm install -g @railway/cli`
2. From your `backend` folder: `railway login` → `railway init`
3. Railway auto-detects the .NET project and sets the build command automatically
4. Add environment variables in the Railway dashboard → Variables:
   - `ConnectionStrings__DefaultConnection` → your Supabase connection string
   - Any other secrets from `appsettings.Development.json`
5. Push to GitHub — Railway deploys automatically on every push
6. Copy the generated `*.up.railway.app` URL and set it as `VITE_API_BASE_URL` in Vercel

> **Team habit:** Agree on Railway on Day 1. One person does the `railway init`,
> commits the `railway.json` config, and shares the project with teammates via the
> Railway dashboard → Settings → Members. Don't let two people init separate Railway
> projects for the same app — it creates split environments and CORS mismatches.

---

### Step 7 — Configure CORS for Production

In `Program.cs`, update your CORS policy to include both the local React dev port
AND the Vercel production URL:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",           // Vite dev
            "http://localhost:3000",           // CRA dev
            "https://your-app.vercel.app"      // Production frontend
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();                   // Required for cookie-based auth
    });
});

app.UseCors("AllowFrontend");
```

> **Team habit:** When Vercel assigns your frontend a permanent URL, update this list
> immediately. CORS errors are the #1 cause of "it works locally but not in prod."

---

### Team Coordination Checklist

- [ ] One teammate owns the Supabase project and shares credentials securely
- [ ] Connection string is in `.gitignore` — never committed
- [ ] `appsettings.example.json` is committed so others know what keys to fill in
- [ ] Only one person runs `dotnet ef database update` at a time — announce before doing it
- [ ] All schema changes go through a migration file committed to GitHub
- [ ] Vercel environment variables are set for the frontend
- [ ] Backend is deployed to Railway and URL is shared with team
- [ ] CORS policy includes the production Vercel URL
- [ ] `service_role` key is never exposed to the frontend or committed to GitHub

---

## Cross-Course Stack Integration (413 + 414 + 455)

This section shows how the three Intex courses wire together into a single running system.

```
┌──────────────────────────────────────────────────────────────┐
│                     SUPABASE (PostgreSQL)                    │
│   Shared DB for EF Core (413) AND ML training data (455)    │
└───────────────┬──────────────────────────┬───────────────────┘
                │ EF Core reads/writes     │ ETL pulls rows
                ▼                          ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│   .NET Core Web API      │   │   Python ML Pipeline (455)   │
│   (ASP.NET Core 8.0)     │◄──│   sklearn → joblib           │
│   Controllers / EF Core  │   │   Outputs: model.sav         │
│   Identity / Cookie Auth │   │            metrics.json      │
│   (414)                  │   │            model_metadata.json│
└──────────┬───────────────┘   └──────────────────────────────┘
           │ JSON over HTTP
           ▼
┌──────────────────────────┐
│   React + TypeScript     │
│   (Vite, 413)            │
│   AuthContext (414)      │
│   ProtectedRoute (414)   │
│   credentials: 'include' │
└──────────────────────────┘
```

### How Data Flows End-to-End

**Training time (offline, before Intex demo):**
1. Python ETL script (455) reads raw data from Supabase via `psycopg2` or `sqlalchemy`
2. Pipeline cleans, encodes, scales, and trains a model
3. `joblib.dump(pipeline, 'model.sav')` serializes the trained pipeline
4. `metrics.json` records accuracy/F1/RMSE for the demo
5. `model.sav` is committed to the repo (or hosted as a static file)

**Inference time (live, during demo):**
1. .NET API loads `model.sav` via a Python subprocess call or a dedicated inference microservice
2. React sends a `POST /api/predict` request with form data (user inputs)
3. .NET passes the payload to the ML inference layer, gets a prediction back
4. .NET returns the prediction as JSON
5. React renders the result on screen

> **Simplest approach for Intex:** Expose a lightweight Flask/FastAPI endpoint that loads
> `model.sav` and returns predictions. Have .NET's controller call that endpoint via
> `HttpClient`. This avoids running Python inside the .NET process.

---

### Layer Responsibilities at a Glance

| Layer | Course | Tech | Owns |
|---|---|---|---|
| Database | 413 | Supabase PostgreSQL | All persistent data |
| ML Pipeline | 455 | Python, sklearn, joblib | `model.sav`, `metrics.json` |
| Inference API | 455/413 | Flask or .NET HttpClient | `/predict` endpoint |
| Backend API | 413 | ASP.NET Core 8.0 | Business logic, CRUD |
| Auth / Security | 414 | ASP.NET Core Identity | Login, roles, MFA, GDPR |
| Frontend | 413 | React + TypeScript | All UI, routing, state |
| Frontend Deploy | 413 | Vercel | Static hosting |
| Backend Deploy | 413 | Railway | .NET API hosting |
| DB Host | 413 | Supabase | Shared PostgreSQL |

> **Railway vs Render:** Both work equally well for hosting .NET. Railway has a slightly
> nicer dashboard and free tier; Render has more predictable cold-start behavior. Pick one
> on Day 1 and have everyone agree — don't split across hosts.

---

### Security Layer Integration (414 wired into 413)

- `Program.cs` configures both EF Core (for app data) AND Identity (for user tables) against the same Supabase connection string
- Identity tables (`AspNetUsers`, `AspNetRoles`, etc.) are created via the same `dotnet ef database update` run
- All API controllers that return sensitive data are decorated with `[Authorize]` or `[Authorize(Roles = "Admin")]`
- React `AuthContext` calls `GET /api/account/me` on app load to hydrate the current session
- `ProtectedRoute` wraps any page that requires login — unauthenticated users are redirected to `/login`
- All fetch calls use `credentials: 'include'` so the Identity cookie is sent automatically

---

### ML Integration Checklist

- [ ] Python inference script or Flask endpoint is running and reachable from .NET
- [ ] `model.sav` is accessible to the inference layer (committed, hosted, or loaded from disk)
- [ ] .NET controller calls the inference endpoint and returns predictions as JSON
- [ ] React page sends user inputs to `POST /api/predict` and renders results
- [ ] Supabase connection string is shared by both EF Core (`appsettings.Development.json`) and the Python ETL script (`.env`)
- [ ] Predictions (optional) are written back to Supabase for logging/display
