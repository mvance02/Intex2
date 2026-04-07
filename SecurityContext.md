# Authentication & Authorization
## Step-by-Step Implementation Guide
### ASP.NET Core Identity + React + TypeScript
 
**Covers:** ASP.NET Core Identity · Cookie Auth · Role-Based Authorization · MFA/TOTP · Google OAuth · Cookie Consent · Security Hardening
 
*Demonstrated on: RootkitIdentity W26 (root-beer catalog, .NET 10, SQLite)*
*All patterns work on any ASP.NET Core Web API + React/Vite/TypeScript project.*
 
---
 
## Table of Contents
 
- [Quick Navigation Reference](#quick-navigation-reference)
- [How to Adapt This Guide to Your Project](#how-to-adapt-this-guide-to-your-project)
- [Complete File Tree](#complete-file-tree)
- [Section 1: Initial Project Setup](#section-1-initial-project-setup)
- [Section 2: Add ASP.NET Core Identity](#section-2-add-aspnet-core-identity)
- [Section 3: Auth State and the Auth Controller](#section-3-auth-state-and-the-auth-controller)
- [Section 4: Login, Register, and Logout Pages](#section-4-login-register-and-logout-pages)
- [Section 5: Frontend Auth Context and Conditional UI](#section-5-frontend-auth-context-and-conditional-ui)
- [Section 6: Authorization](#section-6-authorization)
- [Section 7: Security Hardening](#section-7-security-hardening)
- [Section 8: MFA with TOTP (Authenticator App)](#section-8-mfa-with-totp-authenticator-app)
- [Section 9: Third-Party Authentication (Google OAuth)](#section-9-third-party-authentication-google-oauth)
- [Section 10: Cookie Consent](#section-10-cookie-consent)
- [Section 11: Final Verification Checklist](#section-11-final-verification-checklist)
- [Section 12: Common Errors and Quick Fixes](#section-12-common-errors-and-quick-fixes)
 
---
 
## Quick Navigation Reference
 
Use this card to jump directly to the section you need. Each section is self-contained — you can open this document, go straight to the relevant section, and follow along without reading everything from the top.
 
| I need to... | Go to |
|---|---|
| Set up the starter project and confirm it runs | Section 1 — Initial Project Setup |
| Add Identity packages, DbContext, user/role classes, and run the first migration | Section 2 — Add ASP.NET Core Identity |
| Add security headers and the /api/auth/me + logout endpoints | Section 3 — Auth State and the Auth Controller |
| Build login, register, and logout pages in React | Section 4 — Login, Register, and Logout Pages |
| Wire up AuthContext so every page knows who is logged in | Section 5 — Frontend Auth Context and Conditional UI |
| Protect a backend endpoint or React page by role/policy | Section 6 — Authorization |
| Harden cookies, HTTPS, CSP, and CORS settings | Section 7 — Security Hardening |
| Add TOTP multi-factor authentication (authenticator app) | Section 8 — MFA with TOTP |
| Add Google Sign-In (OAuth) | Section 9 — Third-Party Authentication (Google OAuth) |
| Add cookie consent banner and policy page | Section 10 — Cookie Consent |
| Run a final end-to-end checklist before deploying | Section 11 — Final Verification Checklist |
| Diagnose a build or runtime error | Section 12 — Common Errors and Quick Fixes |
| Find the right file names to change for my project | How to Adapt This Guide (before Section 1) |
| See all files I need to create and where they go | Complete File Tree (before Section 1) |
 
> **NOTE** Every section that creates a file includes the file path in a labelled header and inline ADAPT THIS callouts for anything project-specific. You never need to hunt for what to change.
 
---
 
## How to Adapt This Guide to Your Project
 
Every code sample in this guide is drawn directly from the RootkitIdentity W26 project (a root-beer catalog app). The auth infrastructure is identical for any ASP.NET Core + React project — only a handful of names need to change. Use the table below as a find-and-replace reference before copying any code.
 
### Substitution Reference Table
 
| Value in this guide | Replace with your project's value |
|---|---|
| RootkitAuth.API.Data | Your backend namespace (e.g. MyApp.Data) |
| RootkitAuth.API.Controllers | Your backend namespace (e.g. MyApp.Controllers) |
| RootkitAuth.API.Infrastructure | Your backend namespace (e.g. MyApp.Infrastructure) |
| RootbeerDbContext | Your existing application DbContext class name |
| "RootkitAuthConnection" | Your existing connection string name in appsettings.json |
| "RootkitIdentityConnection" | Any new name for the Identity DB connection string |
| "Data Source=RootkitIdentity.sqlite" | Your Identity DB path/connection (SQLite, SQL Server, etc.) |
| admin@rootkit.local | Your preferred default admin email address |
| Rootkit2026!Admin | Your preferred default admin password (14+ chars) |
| ManageCatalog / "ManagingCatalog" | A policy name that describes your admin action |
| AuthRoles.Admin / "Admin" | Your role names (keep "Admin" or rename to suit your app) |
| "Rootkit Rootbeer" (MFA issuer) | Your application name shown in the authenticator app |
| "rootkit-cookie-consent" (localStorage key) | A unique key for your app (e.g. "myapp-cookie-consent") |
 
### Frontend CSS Framework
 
All React components in this guide use Bootstrap 5 class names (container, row, card, btn, form-control, alert, badge, etc.). If Bootstrap is not already installed in your project, add it:
 
```bash
npm install bootstrap
```
 
Then import it in your entry file (main.tsx or index.tsx):
 
```ts
import 'bootstrap/dist/css/bootstrap.min.css';
```
 
If your project uses a different CSS framework (Tailwind, MUI, etc.), the logic in every component remains identical — only the className values need updating.
 
### What Is Fully Generic (Zero Changes Needed)
 
The following files contain zero project-specific code. Copy them verbatim after substituting only the namespace in C# files:
 
- ApplicationUser.cs
- AuthIdentityDbContext.cs
- AuthRoles.cs (role names are examples — feel free to rename)
- AuthPolicies.cs (policy name is an example — feel free to rename)
- AuthIdentityGenerator.cs
- SecurityHeaders.cs
- AuthController.cs
- frontend/src/lib/authAPI.ts
- frontend/src/context/AuthContext.tsx
- frontend/src/context/CookieConsentContext.tsx
- frontend/src/types/AuthSession.ts
- frontend/src/types/TwofactorStatus.ts
- frontend/src/pages/LoginPage.tsx
- frontend/src/pages/RegisterPage.tsx
- frontend/src/pages/LogoutPage.tsx
- frontend/src/pages/ManageMFAPage.tsx
- frontend/src/components/CookieConsentBanner.tsx
- frontend/src/pages/CookiePolicyPage.tsx
 
### What Needs to Be Adapted
 
The following require thought, not just find-and-replace:
 
- **Program.cs** — you are adding NEW services into your EXISTING file. Slot each block into the correct position relative to your own existing services.
- **appsettings.json** — add the new keys alongside your existing configuration.
- **Section 6 (Authorization)** — the admin page and controller examples reference the root-beer catalog. Section 6 explains the pattern generically first, then shows the RootkitIdentity example. Build your own equivalent page and protected endpoints using the same pattern.
- **Header.tsx** — the layout and app title are project-specific. The auth state logic (useAuth, isAdmin checks, conditional nav links) is what matters and can be dropped into your own header component.
 
---
 
## Complete File Tree
 
Every file you need to create (or meaningfully modify) is shown below. Files marked NEW are created from scratch. Files marked MODIFY have new content added to an existing file. Files marked GENERIC can be copied verbatim after changing the namespace. Files marked ADAPT require project-specific changes.
 
### Backend — ASP.NET Core Web API
 
> **ADAPT THIS** Your backend folder name may differ. In the RootkitIdentity project the backend is RootkitAuth.API/. Adjust paths to match your project layout.
 
```
YourProject.API/
├── Data/
│   ├── ApplicationUser.cs          ← NEW | GENERIC  (Section 2.2)
│   ├── AuthIdentityDbContext.cs    ← NEW | GENERIC  (Section 2.3)
│   ├── AuthRoles.cs                ← NEW | GENERIC  (Section 2.4)
│   ├── AuthPolicies.cs             ← NEW | GENERIC  (Section 2.4)
│   └── AuthIdentityGenerator.cs   ← NEW | GENERIC  (Section 2.5)
├── Infrastructure/
│   └── SecurityHeaders.cs         ← NEW | GENERIC  (Section 3.1)
├── Controllers/
│   └── AuthController.cs          ← NEW | GENERIC  (Section 3.2)
│       (your existing controllers stay unchanged)
├── Program.cs                      ← MODIFY | ADAPT  (Section 2.7)
│   (add new service registrations + middleware into existing file)
├── appsettings.json                ← MODIFY | ADAPT  (Section 2.6)
│   (add FrontendUrl, identity connection string, admin seed block)
└── YourProject.API.csproj          ← MODIFY | ADAPT  (Section 2.1)
    (add NuGet packages + UserSecretsId)
```
 
### Backend — Migrations (auto-generated)
 
These files are generated automatically by the dotnet ef CLI — you do not write them manually.
 
```
YourProject.API/Migrations/
└── AuthIdentity/
    ├── <timestamp>_InitialCreate.cs       ← GENERATED (Section 2.8)
    ├── <timestamp>_InitialCreate.Designer.cs
    └── AuthIdentityDbContextModelSnapshot.cs
```
 
### Frontend — React / Vite / TypeScript
 
> **ADAPT THIS** Your frontend folder name may differ. All paths below are relative to your frontend src/ folder.
 
```
frontend/
├── package.json                         ← MODIFY   (Section 4.1)
│   (add qrcode + @types/qrcode)
└── src/
    ├── types/
    │   ├── AuthSession.ts               ← NEW | GENERIC  (Section 4.2)
    │   └── TwofactorStatus.ts           ← NEW | GENERIC  (Section 4.2)
    ├── lib/
    │   └── authAPI.ts                   ← NEW | GENERIC  (Section 4.3)
    │       (your existing API file, e.g. rootbeerApi.ts, stays unchanged)
    ├── context/
    │   ├── AuthContext.tsx              ← NEW | GENERIC  (Section 5.1)
    │   └── CookieConsentContext.tsx     ← NEW | ADAPT    (Section 10.1)
    │       (change the localStorage key name)
    ├── pages/
    │   ├── LoginPage.tsx                ← NEW | GENERIC  (Section 4.5)
    │   ├── RegisterPage.tsx             ← NEW | GENERIC  (Section 4.4)
    │   ├── LogoutPage.tsx               ← NEW | GENERIC  (Section 4.6)
    │   ├── ManageMFAPage.tsx            ← NEW | ADAPT    (Section 8.2)
    │   │   (change MFA issuer name)
    │   ├── CookiePolicyPage.tsx         ← NEW | GENERIC  (Section 10.3)
    │   └── AdminPage.tsx                ← NEW | ADAPT    (Section 6.3)
    │       (replace with your own admin/protected page)
    ├── components/
    │   ├── CookieConsentBanner.tsx      ← NEW | GENERIC  (Section 10.2)
    │   └── Header.tsx                   ← MODIFY | ADAPT (Section 5.2)
    │       (add auth state + conditional nav links to your existing header)
    └── App.tsx                          ← MODIFY | ADAPT (Section 5.3)
        (wrap with AuthProvider + CookieConsentProvider, add routes)
```
 
### File Count Summary
 
| Category | Files |
|---|---|
| New backend files (copy + change namespace only) | 7 |
| New frontend files (copy verbatim, or minor adapt) | 10 |
| Existing files to modify | 4 (Program.cs, appsettings.json, .csproj, Header.tsx, App.tsx) |
| Auto-generated migration files | 3 (created by dotnet ef) |
| Total files touched | ~24 |
 
> **NOTE** Every file in the tree above is covered step-by-step in the sections listed next to it. Open the Table of Contents or Quick Navigation Reference to jump directly to the section you need.
 
---
 
## Section 1: Initial Project Setup
 
Before adding any authentication, verify the base project runs correctly. This ensures a clean starting point.
 
### 1.1 Clone and Explore the Repository
 
1. Clone the starter repository to your local machine.
2. Open the solution in your IDE.
3. Confirm the project has a backend ASP.NET Core Web API folder and a frontend React/Vite folder.
 
### 1.2 Backend Setup
 
4. Open a terminal in the backend API project folder.
5. Restore NuGet packages: `dotnet restore`
6. Apply any existing EF migrations so the app database is in place:
 
```bash
dotnet ef database update --context <YourExistingDbContext>
```
 
> **ADAPT THIS** Replace `<YourExistingDbContext>` with the name of your project's existing DbContext. In the RootkitIdentity project this is RootbeerDbContext.
 
7. Start the backend: `dotnet run` (defaults to port 5000/5001).
 
### 1.3 Frontend Setup
 
8. Open a second terminal in the frontend folder.
 
```bash
npm install
npm run dev
```
 
9. Verify the app loads at http://localhost:3000 and core features work before continuing.
 
---
 
## Section 2: Add ASP.NET Core Identity
 
ASP.NET Core Identity provides user management, password hashing, role management, and sign-in infrastructure. It is wired up using a separate database so the identity tables stay isolated from your application data.
 
### 2.1 Add NuGet Packages
 
```bash
dotnet add package Microsoft.AspNetCore.Identity --version 2.3.9
dotnet add package Microsoft.AspNetCore.Authentication.Google --version 10.0.5
```
 
Also add a UserSecretsId to your .csproj (needed for Google credentials in Section 9). Add it inside the existing PropertyGroup — the GUID just needs to be unique to your project; generate any new GUID:
 
> **ADAPT THIS** Open your .csproj file. In the RootkitIdentity project this is RootkitAuth.API.csproj. Add `<UserSecretsId>` inside the existing `<PropertyGroup>`. You can generate a new GUID with: `dotnet user-secrets init`
 
```xml
<!-- Add inside <PropertyGroup>: -->
<UserSecretsId>any-unique-guid-for-your-project</UserSecretsId>
```
 
### 2.2 Create ApplicationUser.cs
 
Create this file in your Data folder. It extends IdentityUser, giving you all built-in identity fields plus room to add custom properties later.
 
> **ADAPT THIS** Change the namespace from RootkitAuth.API.Data to your project's namespace (e.g. MyApp.Data).
 
**File: `Data/ApplicationUser.cs`**
 
```csharp
using Microsoft.AspNetCore.Identity;
 
namespace RootkitAuth.API.Data;   // <-- change to your namespace
 
public class ApplicationUser : IdentityUser
{
    // Add custom user properties here as needed
}
```
 
### 2.3 Create AuthIdentityDbContext.cs
 
A dedicated DbContext just for Identity tables. Keeping it separate from your application DbContext means migrations for each are independent.
 
> **ADAPT THIS** Change the namespace from RootkitAuth.API.Data to your project's namespace.
 
**File: `Data/AuthIdentityDbContext.cs`**
 
```csharp
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
 
namespace RootkitAuth.API.Data;   // <-- change to your namespace
 
public class AuthIdentityDbContext : IdentityDbContext<ApplicationUser>
{
    public AuthIdentityDbContext(DbContextOptions<AuthIdentityDbContext> options)
        : base(options) { }
}
```
 
### 2.4 Create AuthRoles.cs and AuthPolicies.cs
 
Constants that prevent magic strings scattered throughout your code.
 
> **ADAPT THIS** Change the namespace. You may also rename the role strings and policy string to match your application's terminology.
 
**File: `Data/AuthRoles.cs`**
 
```csharp
namespace RootkitAuth.API.Data   // <-- change to your namespace
{
    public class AuthRoles
    {
        public const string Customer = "Customer";
        public const string Admin    = "Admin";
    }
}
```
 
**File: `Data/AuthPolicies.cs`**
 
```csharp
namespace RootkitAuth.API.Data   // <-- change to your namespace
{
    public class AuthPolicies
    {
        // Name this constant after the action it guards in your app.
        // Example: ManageCatalog, EditContent, ViewReports, etc.
        public const string ManageCatalog = "ManagingCatalog";
    }
}
```
 
### 2.5 Create AuthIdentityGenerator.cs
 
Runs once on startup to seed roles and a default admin account. Safe to run repeatedly — it checks existence before creating.
 
> **ADAPT THIS** Change the namespace. The default admin email and password in appsettings.json are examples — replace them with values appropriate for your project.
 
**File: `Data/AuthIdentityGenerator.cs`**
 
```csharp
using Microsoft.AspNetCore.Identity;
 
namespace RootkitAuth.API.Data   // <-- change to your namespace
{
    public class AuthIdentityGenerator
    {
        public static async Task GenerateDefaultIdentityAsync(
            IServiceProvider sp, IConfiguration cfg)
        {
            var userManager =
                sp.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = sp.GetRequiredService<RoleManager<IdentityRole>>();
 
            foreach (var role in new[] { AuthRoles.Admin, AuthRoles.Customer })
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    var r = await roleManager.CreateAsync(new IdentityRole(role));
                    if (!r.Succeeded)
                        throw new Exception($"Failed to create role {role}: " +
                            string.Join(", ", r.Errors.Select(e => e.Description)));
                }
            }
 
            var adminSection  = cfg.GetSection("GenerateDefaultIdentityAdmin");
            var adminEmail    = adminSection["Email"]    ?? "admin@example.local";
            var adminPassword = adminSection["Password"] ?? "ChangeThisPassword14";
 
            var admin = await userManager.FindByEmailAsync(adminEmail);
            if (admin == null)
            {
                admin = new ApplicationUser {
                    UserName = adminEmail, Email = adminEmail, EmailConfirmed = true
                };
                var cr = await userManager.CreateAsync(admin, adminPassword);
                if (!cr.Succeeded)
                    throw new Exception("Failed to create admin: " +
                        string.Join(", ", cr.Errors.Select(e => e.Description)));
            }
 
            if (!await userManager.IsInRoleAsync(admin, AuthRoles.Admin))
            {
                var ar = await userManager.AddToRoleAsync(admin, AuthRoles.Admin);
                if (!ar.Succeeded)
                    throw new Exception("Failed to assign Admin role: " +
                        string.Join(", ", ar.Errors.Select(e => e.Description)));
            }
        }
    }
}
```
 
### 2.6 Update appsettings.json
 
Add the Identity database connection string and the default admin credentials block. Keep all your existing configuration — add these keys alongside it.
 
> **ADAPT THIS** RootkitIdentityConnection and RootkitIdentity.sqlite are just names — choose anything. The name you pick here must match what you use in Program.cs. For SQL Server, the value would be a normal connection string instead of a SQLite file path.
 
**File: `appsettings.json` (show new keys to add — keep all existing content)**
 
```json
{
  // ... your existing config ...
  "FrontendUrl": "http://localhost:3000",
  "ConnectionStrings": {
    // ... your existing connection strings ...
    "RootkitIdentityConnection": "Data Source=RootkitIdentity.sqlite"
  },
  "GenerateDefaultIdentityAdmin": {
    "Email":    "admin@example.local",
    "Password": "ChangeThisPassword14"
  }
}
```
 
### 2.7 Rewrite Program.cs
 
You are adding new service registrations and middleware into your existing Program.cs, not replacing the whole file. The blocks below slot in around your existing code. Read each comment carefully — the ORDER of middleware calls matters.
 
> **ADAPT THIS** Three things must match your project: (1) replace RootbeerDbContext with YOUR existing DbContext class name, (2) replace "RootkitAuthConnection" with YOUR existing connection string name, (3) replace all using RootkitAuth.API.* with your namespace.
 
**File: `Program.cs` (complete file, replace yours)**
 
```csharp
using Microsoft.EntityFrameworkCore;
using RootkitAuth.API.Data;         // <-- YOUR namespace
using Microsoft.AspNetCore.Identity;
using RootkitAuth.API.Infrastructure; // <-- YOUR namespace
using Microsoft.AspNetCore.Authentication.Google;
 
var builder = WebApplication.CreateBuilder(args);
const string FrontendCorsPolicy = "FrontendClient";
const string DefaultFrontendUrl  = "http://localhost:3000";
var frontendUrl      = builder.Configuration["FrontendUrl"] ??
DefaultFrontendUrl;
var googleClientId     = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret =
builder.Configuration["Authentication:Google:ClientSecret"];
 
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
 
// ---- YOUR existing application DbContext ----
builder.Services.AddDbContext<RootbeerDbContext>(options => // <-- YOUR DbContext
    options.UseSqlite(builder.Configuration
        .GetConnectionString("RootkitAuthConnection")));    // <-- YOUR conn string
 
// ---- NEW: Identity DbContext (separate database) ----
builder.Services.AddDbContext<AuthIdentityDbContext>(options =>
    options.UseSqlite(builder.Configuration
        .GetConnectionString("RootkitIdentityConnection")));
 
// ---- NEW: ASP.NET Core Identity ----
builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AuthIdentityDbContext>();
 
// ---- NEW: Google OAuth (skipped when secrets not configured) ----
if (!string.IsNullOrEmpty(googleClientId) &&
!string.IsNullOrEmpty(googleClientSecret))
{
    builder.Services.AddAuthentication()
        .AddGoogle(options =>
        {
            options.ClientId     = googleClientId;
            options.ClientSecret = googleClientSecret;
            options.SignInScheme = IdentityConstants.ExternalScheme;
            options.CallbackPath = "/signin-google";
        });
}
 
// ---- NEW: Authorization policies ----
builder.Services.AddAuthorization(options =>
{
    // Add one policy per admin action your app needs.
    options.AddPolicy(AuthPolicies.ManageCatalog,
        policy => policy.RequireRole(AuthRoles.Admin));
});
 
// ---- NEW: Identity / password options ----
builder.Services.Configure<IdentityOptions>(options =>
{
    // Long passphrase policy (NIST-recommended: length over complexity)
    options.Password.RequireDigit             = false;
    options.Password.RequireLowercase         = false;
    options.Password.RequireNonAlphanumeric   = false;
    options.Password.RequireUppercase         = false;
    options.Password.RequiredLength           = 14;
    options.Password.RequiredUniqueChars      = 1;
});
 
// ---- NEW: Cookie security settings ----
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly      = true;
    options.Cookie.SameSite      = SameSiteMode.Lax;
    options.Cookie.SecurePolicy  = CookieSecurePolicy.Always;
    options.ExpireTimeSpan       = TimeSpan.FromDays(7);
    options.SlidingExpiration    = true;
});
 
// ---- CORS (update to also allow credentials) ----
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins(frontendUrl)
              .AllowCredentials()   // Required for cookie auth
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
 
var app = builder.Build();
 
// ---- NEW: Run identity seeder ----
using (var scope = app.Services.CreateScope())
{
    await AuthIdentityGenerator.GenerateDefaultIdentityAsync(
        scope.ServiceProvider, app.Configuration);
}
 
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
if (!app.Environment.IsDevelopment()) { app.UseHsts(); }
 
// ---- Middleware pipeline (ORDER IS CRITICAL) ----
app.UseSecurityHeaders();       // NEW: CSP header
app.UseCors(FrontendCorsPolicy);
app.UseHttpsRedirection();
app.UseAuthentication();        // NEW: must come BEFORE UseAuthorization
app.UseAuthorization();
app.MapControllers();
app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>(); // NEW
app.Run();
```
 
> **NOTE** `UseAuthentication()` MUST come before `UseAuthorization()`. `MapIdentityApi` maps all built-in endpoints: /register, /login, /logout, /manage/2fa, etc., all prefixed with /api/auth.
 
> ⇒ If Program.cs throws a build error about missing types, check Section 12 — Common Errors and Quick Fixes.
 
### 2.8 Run the Identity Migration
 
```bash
dotnet ef migrations add InitialIdentity --context AuthIdentityDbContext
dotnet ef database update --context AuthIdentityDbContext
```
 
Verify that the Identity database file is created and contains tables: AspNetUsers, AspNetRoles, AspNetUserRoles, AspNetUserClaims, AspNetUserLogins, AspNetUserTokens, AspNetRoleClaims. Restart the backend — the seeder creates roles and the admin account on first run.
 
---
 
## Section 3: Auth State and the Auth Controller
 
MapIdentityApi provides register, login, and 2FA endpoints automatically. We need one custom controller to expose the current session to the frontend and handle the Google OAuth redirect flow.
 
### 3.1 Create SecurityHeaders.cs
 
A small middleware extension that sets the Content-Security-Policy header on every response. Create an Infrastructure folder for it.
 
> **ADAPT THIS** Change the namespace from RootkitAuth.API.Infrastructure to your namespace. The CSP value shown is a sensible default — tighten or loosen it to match your application's requirements.
 
**File: `Infrastructure/SecurityHeaders.cs`**
 
```csharp
namespace RootkitAuth.API.Infrastructure   // <-- YOUR namespace
{
    public static class SecurityHeaders
    {
        public const string ContentSecurityPolicy =
            "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'";
 
        public static IApplicationBuilder UseSecurityHeaders(this
IApplicationBuilder app)
        {
            var env =
app.ApplicationServices.GetRequiredService<IWebHostEnvironment>();
            return app.Use(async (ctx, next) =>
            {
                ctx.Response.OnStarting(() =>
                {
                    if (!(env.IsDevelopment() &&
                        ctx.Request.Path.StartsWithSegments("/swagger")))
                        ctx.Response.Headers["Content-Security-Policy"] =
ContentSecurityPolicy;
                    return Task.CompletedTask;
                });
                await next();
            });
        }
    }
}
```
 
### 3.2 Create AuthController.cs
 
Five endpoints: `GET /api/auth/me` returns the current session to the frontend. `GET /api/auth/providers` lists available OAuth providers. `GET /api/auth/external-login` kicks off the OAuth redirect. `GET /api/auth/external-callback` handles the OAuth return. `POST /api/auth/logout` signs the user out.
 
> **ADAPT THIS** Change the two namespace lines (RootkitAuth.API.Data and RootkitAuth.API.Controllers) to your namespace. Everything else is fully generic.
 
**File: `Controllers/AuthController.cs`**
 
```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using RootkitAuth.API.Data;       // <-- YOUR namespace
 
namespace RootkitAuth.API.Controllers;  // <-- YOUR namespace
 
[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IConfiguration configuration) : ControllerBase
{
    private const string DefaultFrontendUrl    = "http://localhost:3000";
    private const string DefaultExternalReturn = "/";
 
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentSession()
    {
        if (User.Identity?.IsAuthenticated != true)
            return Ok(new { isAuthenticated = false, userName = (string?)null,
                            email = (string?)null, roles = Array.Empty<string>()
});
 
        var user  = await userManager.GetUserAsync(User);
        var roles = User.Claims
            .Where(c => c.Type == ClaimTypes.Role)
            .Select(c => c.Value).Distinct().OrderBy(r => r).ToArray();
 
        return Ok(new { isAuthenticated = true,
             userName = user?.UserName ?? User.Identity?.Name,
             email = user?.Email, roles });
    }
 
    [HttpGet("providers")]
    public IActionResult GetExternalProviders()
    {
        var providers = new List<object>();
        if (IsGoogleConfigured())
            providers.Add(new { name = GoogleDefaults.AuthenticationScheme,
                                displayName = "Google" });
        return Ok(providers);
    }
 
    [HttpGet("external-login")]
    public IActionResult ExternalLogin([FromQuery] string provider,
        [FromQuery] string? returnPath = null)
    {
        if (!string.Equals(provider, GoogleDefaults.AuthenticationScheme,
                StringComparison.OrdinalIgnoreCase) || !IsGoogleConfigured())
            return BadRequest(new { message = "Provider not available." });
 
        var callbackUrl = Url.Action(nameof(ExternalLoginCallback),
            new { returnPath = NormalizePath(returnPath) });
        if (string.IsNullOrWhiteSpace(callbackUrl))
            return Problem("Unable to build callback URL.");
 
        var props = signInManager.ConfigureExternalAuthenticationProperties(
            GoogleDefaults.AuthenticationScheme, callbackUrl);
        return Challenge(props, GoogleDefaults.AuthenticationScheme);
    }
 
    [HttpGet("external-callback")]
    public async Task<IActionResult> ExternalLoginCallback(
        [FromQuery] string? returnPath = null,
        [FromQuery] string? remoteError = null)
    {
        if (!string.IsNullOrWhiteSpace(remoteError))
            return Redirect(ErrorUrl("External login failed."));
 
        var info = await signInManager.GetExternalLoginInfoAsync();
        if (info is null) return Redirect(ErrorUrl("Login info unavailable."));
 
        var result = await signInManager.ExternalLoginSignInAsync(
            info.LoginProvider, info.ProviderKey,
            isPersistent: false, bypassTwoFactor: true);
        if (result.Succeeded) return Redirect(SuccessUrl(returnPath));
 
        var email = info.Principal.FindFirstValue(ClaimTypes.Email)
                 ?? info.Principal.FindFirstValue("email");
        if (string.IsNullOrWhiteSpace(email))
            return Redirect(ErrorUrl("No email returned from provider."));
 
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser {
                UserName = email, Email = email, EmailConfirmed = true };
            var cr = await userManager.CreateAsync(user);
            if (!cr.Succeeded) return Redirect(ErrorUrl("Unable to create local account."));
        }
 
        var lr = await userManager.AddLoginAsync(user, info);
        if (!lr.Succeeded) return Redirect(ErrorUrl("Unable to link external login."));
 
        await signInManager.SignInAsync(user, isPersistent: false,
info.LoginProvider);
        return Redirect(SuccessUrl(returnPath));
    }
 
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await signInManager.SignOutAsync();
        return Ok(new { message = "Logout successful." });
    }
 
    private bool IsGoogleConfigured() =>
        !string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientId"]) &&
        !string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientSecret"]);
 
    private string NormalizePath(string? p) =>
        string.IsNullOrWhiteSpace(p) || !p.StartsWith('/') ? DefaultExternalReturn
: p;
 
    private string SuccessUrl(string? returnPath)
    {
        var url = configuration["FrontendUrl"] ?? DefaultFrontendUrl;
        return $"{url.TrimEnd('/')}{NormalizePath(returnPath)}";
    }
 
    private string ErrorUrl(string msg)
    {
        var url = configuration["FrontendUrl"] ?? DefaultFrontendUrl;
        return QueryHelpers.AddQueryString($"{url.TrimEnd('/')}/login",
"externalError", msg);
    }
}
```
 
> **NOTE** `GET /api/auth/me` is the most important endpoint — the React frontend calls it on every page load to restore auth state. It returns isAuthenticated, userName, email, and a roles array.
 
> ⇒ Endpoint works but returns 401 unexpectedly? See Section 12 (CORS / cookie errors).
 
---
 
## Section 4: Login, Register, and Logout Pages
 
Now switch to the React frontend. Create the auth API client, type definitions, and the three auth pages.
 
### 4.1 Install the QR Code Package
 
The MFA page (Section 8) uses the qrcode package. Install it now:
 
```bash
npm install qrcode
npm install --save-dev @types/qrcode
```
 
### 4.2 Create Type Definitions
 
**File: `src/types/AuthSession.ts`**
 
```ts
export interface AuthSession {
    isAuthenticated: boolean;
    userName: string | null;
    email: string | null;
    roles: string[];
}
```
 
**File: `src/types/TwofactorStatus.ts`**
 
```ts
export interface TwoFactorStatus {
  sharedKey: string | null;
  recoveryCodesLeft: number;
  recoveryCodes: string[] | null;
  isTwoFactorEnabled: boolean;
  isMachineRemembered: boolean;
}
```
 
### 4.3 Create authAPI.ts
 
Centralises all auth API calls. All requests use credentials: "include" so the auth cookie is sent automatically. This file is 100% generic — no changes needed for any project.
 
**File: `src/lib/authAPI.ts`**
 
```ts
import type { AuthSession } from '../types/AuthSession';
import type { TwoFactorStatus } from '../types/TwofactorStatus';
 
export interface ExternalAuthProvider { name: string; displayName: string; }
 
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
 
async function readApiError(res: Response, fallback: string): Promise<string> {
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return fallback;
  const d = await res.json();
  if (typeof d?.detail === 'string' && d.detail.length > 0) return d.detail;
  if (typeof d?.title  === 'string' && d.title.length > 0) return d.title;
  if (d?.errors) { const first = Object.values(d.errors).flat()
      .find((v): v is string => typeof v === 'string'); if (first) return first; }
  if (typeof d?.message === 'string' && d.message.length > 0) return d.message;
  return fallback;
}
 
async function post2FA(payload: object): Promise<TwoFactorStatus> {
  const res = await fetch(`${apiBaseUrl}/api/auth/manage/2fa`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res, 'Unable to update MFA settings.'));
  return res.json();
}
 
export function buildExternalLoginUrl(provider: string, returnPath = '/'): string
{
  return `${apiBaseUrl}/api/auth/external-login?${new URLSearchParams({ provider,
returnPath })}`;
}
export async function getExternalProviders(): Promise<ExternalAuthProvider[]> {
  const r = await fetch(`${apiBaseUrl}/api/auth/providers`, { credentials:
'include' });
  if (!r.ok) throw new Error(await readApiError(r, 'Unable to load external providers.'));
  return r.json();
}
export async function getAuthSession(): Promise<AuthSession> {
  const r = await fetch(`${apiBaseUrl}/api/auth/me`, { credentials: 'include' });
  if (!r.ok) throw new Error('Unable to load auth session.');
  return r.json();
}
export async function registerUser(email: string, password: string): Promise<void>
{
  const r = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await readApiError(r, 'Unable to register.'));
}
export async function loginUser(email: string, password: string, rememberMe:
boolean,
  twoFactorCode?: string, twoFactorRecoveryCode?: string): Promise<void> {
  const params = new URLSearchParams();
  rememberMe ? params.set('useCookies','true') :
params.set('useSessionCookies','true');
  const body: Record<string,string> = { email, password };
  if (twoFactorCode)         body.twoFactorCode         = twoFactorCode;
  if (twoFactorRecoveryCode) body.twoFactorRecoveryCode = twoFactorRecoveryCode;
  const r = await fetch(`${apiBaseUrl}/api/auth/login?${params}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await readApiError(r,
    'Unable to log in. If MFA is enabled, include an authenticator or recovery code.'));
}
export async function logoutUser(): Promise<void> {
  const r = await fetch(`${apiBaseUrl}/api/auth/logout`, { method: 'POST',
credentials: 'include' });
  if (!r.ok) throw new Error(await readApiError(r, 'Unable to log out.'));
}
export const getTwoFactorStatus  = ()                        => post2FA({});
export const enableTwoFactor     = (twoFactorCode: string)  =>
  post2FA({ enable: true, twoFactorCode, resetRecoveryCodes: true });
export const disableTwoFactor    = ()                        => post2FA({ enable:
false });
export const resetRecoveryCodes  = ()                        => post2FA({
resetRecoveryCodes: true });
```
 
### 4.4 Create RegisterPage.tsx
 
> **ADAPT THIS** This file is generic. The only Bootstrap CSS classes are used — if you use a different framework, update only the className values.
 
**File: `src/pages/RegisterPage.tsx`**
 
```tsx
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { registerUser } from '../lib/authAPI';
 
function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage]   = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting]    = useState(false);
 
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(''); setSuccessMessage('');
    if (password !== confirmPassword) { setErrorMessage('Passwords must match.');
return; }
    setIsSubmitting(true);
    try {
      await registerUser(email, password);
      setSuccessMessage('Registration succeeded. You can log in now.');
      setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to register.');
    } finally { setIsSubmitting(false); }
  }
 
  return (
    <div className="container mt-4">
      <Header />
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm"><div className="card-body p-4">
            <h2 className="h4 mb-3">Register</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label" htmlFor="email">Email</label>
                <input id="email" type="email" className="form-control"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="password">Password</label>
                <input id="password" type="password" className="form-control"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="confirmPassword">Confirm password</label>
                <input id="confirmPassword" type="password" className="form-control"
                  value={confirmPassword} onChange={e =>
setConfirmPassword(e.target.value)} required />
              </div>
              {errorMessage   && <div className="alert alert-danger"
role="alert">{errorMessage}</div>}
              {successMessage && <div className="alert alert-success"
role="alert">{successMessage}</div>}
              <button type="submit" className="btn btn-primary w-100"
disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </form>
            <p className="mt-3 mb-0">Already registered? <Link to="/login">Log
in</Link>.</p>
          </div></div>
        </div>
      </div>
    </div>
  );
}
export default RegisterPage;
```
 
### 4.5 Create LoginPage.tsx
 
> **ADAPT THIS** Generic — no project-specific code. The login page supports password auth, optional MFA codes, "remember me", and external provider buttons. The externalError query param carries errors back from the OAuth callback.
 
**File: `src/pages/LoginPage.tsx`**
 
```tsx
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { buildExternalLoginUrl, getExternalProviders, loginUser,
  type ExternalAuthProvider } from '../lib/authAPI';
 
function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshAuthState } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [providers, setProviders] = useState<ExternalAuthProvider[]>([]);
  const [errorMessage, setErrorMessage] =
    useState(searchParams.get('externalError') ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
 
  useEffect(() => {
    getExternalProviders().then(setProviders).catch(() => setProviders([]));
  }, []);
 
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(''); setIsSubmitting(true);
    try {
      await loginUser(email, password, rememberMe,
        twoFactorCode || undefined, recoveryCode || undefined);
      await refreshAuthState();
      navigate('/');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to log in.');
    } finally { setIsSubmitting(false); }
  }
 
  return (
    <div className="container mt-4">
      <Header />
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm"><div className="card-body p-4">
            <h2 className="h4 mb-3">Login</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label" htmlFor="email">Email</label>
                <input id="email" type="email" className="form-control"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="password">Password</label>
                <input id="password" type="password" className="form-control"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="twoFactor">Authenticator code</label>
                <input id="twoFactor" type="text" inputMode="numeric"
className="form-control"
                  value={twoFactorCode} onChange={e =>
setTwoFactorCode(e.target.value)} />
                <div className="form-text">Leave blank unless MFA is enabled.</div>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="recovery">Recovery code</label>
                <input id="recovery" type="text" className="form-control"
                  value={recoveryCode} onChange={e =>
setRecoveryCode(e.target.value)} />
                <div className="form-text">Use when you cannot access the authenticator app.</div>
              </div>
              <div className="form-check mb-3">
                <input id="rememberMe" type="checkbox" className="form-check-input"
                  checked={rememberMe} onChange={e =>
setRememberMe(e.target.checked)} />
                <label className="form-check-label" htmlFor="rememberMe">
                  Keep me signed in across browser restarts
                </label>
              </div>
              {errorMessage && <div className="alert alert-danger"
role="alert">{errorMessage}</div>}
              <button type="submit" className="btn btn-primary w-100"
disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            {providers.length > 0 && (
              <><div className="text-center text-muted my-3">or</div>
              <div className="d-grid gap-2">
                {providers.map(p => (
                  <button key={p.name} type="button" className="btn btn-outline-dark"
                    onClick={() =>
window.location.assign(buildExternalLoginUrl(p.name, '/'))}>
                    Continue with {p.displayName}
                  </button>
                ))}
              </div></>
            )}
            <p className="mt-3 mb-0">
              Need an account? <Link to="/register">Register here</Link>.
            </p>
          </div></div>
        </div>
      </div>
    </div>
  );
}
export default LoginPage;
```
 
### 4.6 Create LogoutPage.tsx
 
**File: `src/pages/LogoutPage.tsx`**
 
```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { logoutUser } from '../lib/authAPI';
import { useAuth } from '../context/AuthContext';
 
function LogoutPage() {
  const [message, setMessage] = useState('Signing you out...');
  const [error,   setError]   = useState('');
  const { refreshAuthState } = useAuth();
 
  useEffect(() => {
    let live = true;
    logoutUser()
      .then(() => refreshAuthState())
      .then(() => { if (live) setMessage('You are now signed out.'); })
      .catch(e => { if (live) { setError(e.message); setMessage('Logout did not complete.'); } });
    return () => { live = false; };
  }, []);
 
  return (
    <div className="container mt-4">
      <Header />
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm"><div className="card-body p-4">
            <h2 className="h4 mb-3">Logout</h2>
            <p>{message}</p>
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            <div className="d-flex gap-3">
              <Link className="btn btn-primary" to="/">Home</Link>
              <Link className="btn btn-outline-secondary" to="/login">Go to login</Link>
            </div>
          </div></div>
        </div>
      </div>
    </div>
  );
}
export default LogoutPage;
```
 
> ⇒ Login silently fails or does not set cookies? See Section 12 (credentials / CORS errors).
 
---
 
## Section 5: Frontend Auth Context and Conditional UI
 
The AuthContext makes authentication state available to every component without prop drilling. The Header uses it to render conditional navigation links.
 
### 5.1 Create AuthContext.tsx
 
This file is 100% generic — copy verbatim. It calls GET /api/auth/me on mount to restore session state, exposes the session object, isAuthenticated, isLoading, and a refreshAuthState function.
 
**File: `src/context/AuthContext.tsx`**
 
```tsx
import { createContext, useCallback, useContext, useEffect, useState } from
'react';
import type { ReactNode } from 'react';
import { getAuthSession } from '../lib/authAPI';
import type { AuthSession } from '../types/AuthSession';
 
interface AuthContextValue {
  authSession: AuthSession;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuthState: () => Promise<void>;
}
 
const anon: AuthSession = { isAuthenticated: false, userName: null, email: null,
roles: [] };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
 
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authSession, setAuthSession] = useState<AuthSession>(anon);
  const [isLoading, setIsLoading] = useState(true);
 
  const refreshAuthState = useCallback(async () => {
    try   { setAuthSession(await getAuthSession()); }
    catch { setAuthSession(anon); }
    finally { setIsLoading(false); }
  }, []);
 
  useEffect(() => { void refreshAuthState(); }, [refreshAuthState]);
 
  return (
    <AuthContext.Provider value={{
        authSession, isAuthenticated: authSession.isAuthenticated, isLoading,
refreshAuthState
    }}>
      {children}
    </AuthContext.Provider>
  );
}
 
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider.');
  return ctx;
}
```
 
### 5.2 Update Your Header Component
 
The auth-aware header pattern is generic — the specific nav links and title are project-specific. Below is the RootkitIdentity implementation followed by a description of the pattern so you can apply it to your own header.
 
> **ADAPT THIS** Change the app title ("Rootkit Rootbeer Catalog") to your application name. Add or remove NavLink items to match your app's routes. The auth logic (useAuth, isAdmin check, conditional Login/Logout links) is the reusable part.
 
**File: `src/components/Header.tsx` (adapt nav links and title to your app)**
 
```tsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
 
function Header() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin'); // match your admin role name
 
  // Status badge logic — generic, works for any app
  let badgeCls  = 'badge rounded-pill text-bg-secondary';
  let badgeText = 'Checking session...';
  if (!isLoading && isAuthenticated)  { badgeCls = 'badge rounded-pill text-bg-success';
    badgeText = `Signed in as ${authSession.email ?? authSession.userName ?? 'user'}`; }
  if (!isLoading && !isAuthenticated) { badgeCls = 'badge rounded-pill text-bg-warning';
    badgeText = 'Signed out'; }
 
  return (
    <header className="row bg-secondary text-white mb-4 p-3 rounded align-items-center">
      <div className="col-lg-4">
        {/* CHANGE: replace with your app title */}
        <h1 className="h3 mb-0">Your Application Name</h1>
      </div>
      <div className="col-lg-4 mt-3 mt-lg-0 text-lg-center">
        <span className={badgeCls}>{badgeText}</span>
      </div>
      <div className="col-lg-4 mt-3 mt-lg-0">
        <nav className="d-flex gap-3 justify-content-lg-end flex-wrap">
          {/* CHANGE: add your own app routes here */}
          <NavLink className="text-white text-decoration-none" to="/">Home</NavLink>
          <NavLink className="text-white text-decoration-none"
to="/cookies">Cookies</NavLink>
          {/* Show MFA link only when authenticated */}
          {isAuthenticated && <NavLink className="text-white text-decoration-none"
to="/mfa">MFA</NavLink>}
          {/* Show Admin link only for the Admin role */}
          {isAdmin && <NavLink className="text-white text-decoration-none"
to="/admin">Admin</NavLink>}
          {/* Toggle between Login/Register and Logout */}
          {!isAuthenticated ? (
            <>
              <NavLink className="text-white text-decoration-none"
to="/login">Login</NavLink>
              <NavLink className="text-white text-decoration-none"
to="/register">Register</NavLink>
            </>
          ) : (
            <NavLink className="text-white text-decoration-none"
to="/logout">Logout</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
export default Header;
```
 
### 5.3 Update App.tsx
 
Wrap the app with CookieConsentProvider (outermost) and AuthProvider. Add routes for all the new pages. Render CookieConsentBanner inside Router but outside Routes so it appears on every page.
 
> **ADAPT THIS** The route paths and page components below are from the RootkitIdentity project. Keep /login, /register, /logout, /mfa, /cookies as-is. Add or rename /admin and any other routes to match your app.
 
**File: `src/App.tsx`**
 
```tsx
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import CookieConsentBanner from './components/CookieConsentBanner';
// Import your page components:
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LogoutPage from './pages/LogoutPage';
import ManageMFAPage from './pages/ManageMFAPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
// CHANGE: import your own page components
import HomePage from './pages/HomePage';         // example
import AdminPage from './pages/AdminPage';       // example
 
function App() {
  return (
    <CookieConsentProvider>
      <AuthProvider>
        {/* Add your other Providers (CartProvider, ThemeProvider, etc.) here */}
        <Router>
          <Routes>
            {/* Auth routes — keep these paths as-is */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/logout"   element={<LogoutPage />} />
            <Route path="/mfa"      element={<ManageMFAPage />} />
            <Route path="/cookies"  element={<CookiePolicyPage />} />
            {/* CHANGE: your own app routes */}
            <Route path="/"         element={<HomePage />} />
            <Route path="/admin"    element={<AdminPage />} />
          </Routes>
          <CookieConsentBanner />
        </Router>
      </AuthProvider>
    </CookieConsentProvider>
  );
}
export default App;
```
 
> ⇒ Auth state not updating after login? See Section 12 (AuthContext / re-render errors).
 
---
 
## Section 6: Authorization
 
Authorization controls what authenticated users are allowed to do. The backend uses policy-based authorization. The frontend reads the roles array to show or hide UI.
 
This section covers the generic pattern first, then shows the RootkitIdentity project as a concrete worked example.
 
### 6.1 Generic Pattern: Protecting a Backend Endpoint
 
To protect any controller action, add the `[Authorize]` attribute. You already registered a policy in Program.cs that maps a policy name to a required role. Use that policy name on any endpoint that should be admin-only.
 
```csharp
// At the top of your controller file:
using Microsoft.AspNetCore.Authorization;
 
// On any action that requires the Admin role:
[HttpGet("admin-only-data")]
[Authorize(Policy = AuthPolicies.ManageCatalog)]   // use the policy constant
public async Task<IActionResult> GetAdminData()
{
    // Only users in the Admin role can reach here.
    // Unauthenticated requests get 401. Wrong role gets 403.
    return Ok(await _yourService.GetDataForAdmins());
}
 
// To require authentication but no specific role:
[HttpGet("my-data")]
[Authorize]
public IActionResult GetMyData()
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    return Ok(userId);
}
```
 
### 6.2 Generic Pattern: Role-Protected React Page
 
In React, check the roles array from authSession and gate your UI accordingly. The same check can be used in any component or page.
 
```tsx
import { useAuth } from '../context/AuthContext';
 
function AdminPage() {
  const { authSession, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin'); // match your role name
 
  if (isLoading) return <p>Checking your role...</p>;
  if (!isAdmin) return (
    <div className="alert alert-danger">
      You must be in the Admin role to access this page.
    </div>
  );
 
  // Admin content here
  return (
    <div>
      <h2>Admin Dashboard</h2>
      {/* your admin UI */}
    </div>
  );
}
export default AdminPage;
```
 
> **NOTE** The role check on the frontend is for UI only — it does not enforce security. Security is enforced by the `[Authorize]` attribute on the backend. Always protect the API endpoint regardless of what the frontend does.
 
### 6.3 Worked Example: RootkitIdentity Project
 
The RootkitIdentity project applies this pattern to the rootbeer catalog. Two admin-only endpoints are added to RootbeersController and a dedicated AdminRootbeerPage is created. This is how the pattern looks when applied to a specific feature — adapt it to your own resource.
 
> **ADAPT THIS** The code below references RootbeersController, dbContext.Rootbeers, Rootbeer model, getManagedRootbeers, createRootbeer, and RootbeerInput — all of which are specific to the rootbeer catalog. Replace these with your own controller, DbSet, model, and API functions.
 
#### Backend: Add protected endpoints to your existing controller
 
**File: `Controllers/RootbeersController.cs` (add these actions — keep existing actions)**
 
```csharp
// Add this using at the top:
using Microsoft.AspNetCore.Authorization;
 
// ---- Admin endpoint: GET /api/rootbeers/admin ----
[HttpGet("admin")]
[Authorize(Policy = AuthPolicies.ManageCatalog)]  // requires Admin role
public async Task<IActionResult> GetRootbeersForAdmin()
{
    var rootbeers = await dbContext.Rootbeers
        .AsNoTracking().OrderBy(rb => rb.RootbeerName).ToListAsync();
    return Ok(rootbeers);
}
 
// ---- Admin endpoint: POST /api/rootbeers ----
[HttpPost]
[Authorize(Policy = AuthPolicies.ManageCatalog)]  // requires Admin role
public async Task<IActionResult> CreateRootbeer([FromBody] Rootbeer rootbeer)
{
    rootbeer.RootbeerID = (dbContext.Rootbeers.Max(rb => (int?)rb.RootbeerID) ?? 0) + 1;
    dbContext.Rootbeers.Add(rootbeer);
    await dbContext.SaveChangesAsync();
    return Created($"/api/rootbeers/{rootbeer.RootbeerID}", rootbeer);
}
```
 
#### Frontend: Add admin API functions to your API module
 
**File: `src/lib/rootbeerApi.ts` (add to existing file)**
 
```ts
// Add this interface for the create form:
export interface RootbeerInput {
  rootbeerName: string; breweryName: string;
  wholesaleCost: number; currentRetailPrice: number;
  container: string; /* ... other fields */
}
 
// Admin: fetch all rootbeers (requires auth cookie)
export async function getManagedRootbeers(): Promise<Rootbeer[]> {
  const res = await fetch(`${apiBaseUrl}/api/rootbeers/admin`, { credentials:
'include' });
  if (!res.ok) throw new Error('Unable to load admin rootbeers.');
  return res.json();
}
 
// Admin: create a new rootbeer (requires auth cookie)
export async function createRootbeer(rb: RootbeerInput): Promise<Rootbeer> {
  const res = await fetch(`${apiBaseUrl}/api/rootbeers`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify(rb),
  });
  if (!res.ok) throw new Error('Unable to create rootbeer.');
  return res.json();
}
```
 
---
 
## Section 7: Security Hardening
 
The hardening settings are already included in the Program.cs written in Section 2.7. This section explains each setting and why it matters so you can make informed decisions when adapting to your own project.
 
### 7.1 Password Policy
 
This project uses a passphrase-style policy (length over complexity), in line with NIST SP 800-63B. Feel free to tighten these options to match your organisation's requirements.
 
```csharp
builder.Services.Configure<IdentityOptions>(options => {
    options.Password.RequireDigit             = false;  // Adjust to your policy
    options.Password.RequireLowercase         = false;
    options.Password.RequireNonAlphanumeric   = false;
    options.Password.RequireUppercase         = false;
    options.Password.RequiredLength           = 14;     // Minimum 14 chars recommended
    options.Password.RequiredUniqueChars      = 1;
});
```
 
### 7.2 Cookie Security
 
```csharp
builder.Services.ConfigureApplicationCookie(options => {
    options.Cookie.HttpOnly      = true;   // JS cannot read the cookie — prevents XSS theft
    options.Cookie.SameSite      = SameSiteMode.Lax;  // Blocks most CSRF attacks
    options.Cookie.SecurePolicy  = CookieSecurePolicy.Always; // HTTPS only
    options.ExpireTimeSpan       = TimeSpan.FromDays(7);
    options.SlidingExpiration    = true;   // Extends expiry on activity
});
```
 
### 7.3 HSTS and HTTPS
 
```csharp
// HSTS tells browsers to only connect via HTTPS from now on.
// Only apply in production — development uses HTTP.
if (!app.Environment.IsDevelopment()) { app.UseHsts(); }
app.UseHttpsRedirection();
```
 
### 7.4 Content Security Policy
 
SecurityHeaders.cs adds the CSP header to every response. The default value restricts all resource sources to self-origin, blocking XSS script injection from external sources. The Swagger UI is exempted in Development.
 
```csharp
// Value in SecurityHeaders.cs:
// "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'"
 
// Called in Program.cs BEFORE UseCors:
app.UseSecurityHeaders();
```
 
### 7.5 CORS
 
CORS is locked to the frontend origin and requires credentials. This prevents other websites from making authenticated API calls on behalf of your users. Updating FrontendUrl in appsettings.json is all that is needed to change the allowed origin.
 
```csharp
builder.Services.AddCors(options => {
    options.AddPolicy(FrontendCorsPolicy, policy => {
        policy.WithOrigins(frontendUrl)   // Only your frontend origin
              .AllowCredentials()          // Required for cookie-based auth
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
```
 
---
 
## Section 8: MFA with TOTP (Authenticator App)
 
ASP.NET Core Identity has built-in TOTP support. The /api/auth/manage/2fa endpoint provided by MapIdentityApi handles enabling, disabling, and generating recovery codes. No additional backend work is needed.
 
### 8.1 How the MFA Flow Works
 
1. User navigates to /mfa. The page calls POST /api/auth/manage/2fa with an empty payload to get the TOTP shared key and current enabled status.
2. The page generates an otpauth:// URI and renders it as a QR code using the qrcode npm package.
3. User scans the QR code with an authenticator app and enters the 6-digit code.
4. The page calls POST /api/auth/manage/2fa with `{ enable: true, twoFactorCode, resetRecoveryCodes: true }`.
5. Recovery codes are shown once. The user must save them.
6. On subsequent logins the user must supply password plus TOTP code, or a recovery code.
 
### 8.2 Create ManageMFAPage.tsx
 
> **ADAPT THIS** Change the issuer constant from "Rootkit Rootbeer" to your application name. This is the label that appears in the authenticator app next to the account.
 
**File: `src/pages/ManageMFAPage.tsx`**
 
```tsx
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { disableTwoFactor, enableTwoFactor,
  getTwoFactorStatus, resetRecoveryCodes } from '../lib/authAPI';
import type { TwoFactorStatus } from '../types/TwofactorStatus';
 
function ManageMfaPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const [status,  setStatus]  = useState<TwoFactorStatus | null>(null);
  const [code,    setCode]    = useState('');
  const [qr,      setQr]      = useState('');
  const [codes,   setCodes]   = useState<string[]>([]);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [busy,    setBusy]    = useState(false);
 
  const uri = useMemo(() => {
    if (!authSession.email || !status?.sharedKey) return '';
    const issuer = 'Your App Name'; // <-- CHANGE THIS to your application name
    const label  = `${issuer}:${authSession.email}`;
    const params = new URLSearchParams({ secret: status.sharedKey, issuer });
    return `otpauth://totp/${encodeURIComponent(label)}?${params}`;
  }, [authSession.email, status?.sharedKey]);
 
  useEffect(() => {
    if (!isLoading && isAuthenticated)
      getTwoFactorStatus().then(s => { setStatus(s); setCodes(s.recoveryCodes ?? []); })
        .catch(e => setError(e.message));
  }, [isAuthenticated, isLoading]);
 
  useEffect(() => {
    if (!uri) { setQr(''); return; }
    QRCode.toDataURL(uri, { width: 224, margin: 1 }).then(setQr).catch(() =>
setQr(''));
  }, [uri]);
 
  async function handleEnable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setSuccess(''); setBusy(true);
    try {
      const s = await enableTwoFactor(code);
      setStatus(s); setCodes(s.recoveryCodes ?? []); setCode('');
      setSuccess('MFA enabled. Save the recovery codes below.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to enable MFA.'); }
    finally { setBusy(false); }
  }
 
  async function handleDisable() {
    setError(''); setSuccess(''); setBusy(true);
    try {
      const s = await disableTwoFactor(); setStatus(s); setCodes([]);
      setSuccess('MFA disabled.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to disable MFA.'); }
    finally { setBusy(false); }
  }
 
  async function handleReset() {
    setError(''); setSuccess(''); setBusy(true);
    try {
      const s = await resetRecoveryCodes();
      setStatus(s); setCodes(s.recoveryCodes ?? []); setSuccess('Recovery codes reset.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to reset codes.'); }
    finally { setBusy(false); }
  }
 
  return (
    <div className="container mt-4"><Header />
      <div className="row justify-content-center"><div className="col-lg-8">
        <div className="card shadow-sm mb-4"><div className="card-body p-4">
          <h2 className="h4 mb-3">Authenticator App MFA</h2>
          {isLoading && <p>Checking session...</p>}
          {!isLoading && !isAuthenticated && (
            <div className="alert alert-warning">
              Sign in first, then return to <Link to="/mfa">this page</Link>.
            </div>
          )}
          {error   && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          {isAuthenticated && status && (
            <>
              <div className="mb-3">
                <span className={`badge rounded-pill ${status.isTwoFactorEnabled
                  ? 'text-bg-success' : 'text-bg-warning'}`}>
                  {status.isTwoFactorEnabled ? 'MFA enabled' : 'MFA not enabled'}
                </span>
              </div>
              <div className="row g-4">
                <div className="col-md-5">
                  <div className="border rounded p-3 bg-light-subtle">
                    {qr && <img src={qr} alt="QR code" className="img-fluid mb-3" />}
                    <p className="mb-1"><strong>Shared key</strong></p>
                    <code>{status.sharedKey ?? 'Unavailable'}</code>
                  </div>
                </div>
                <div className="col-md-7">
                  {!status.isTwoFactorEnabled ? (
                    <form onSubmit={handleEnable}>
                      <div className="mb-3">
                        <label className="form-label"
htmlFor="authCode">Authenticator code</label>
                        <input id="authCode" type="text" inputMode="numeric"
                          className="form-control" value={code}
                          onChange={e => setCode(e.target.value)} required />
                      </div>
                      <button className="btn btn-primary" disabled={busy}>
                        {busy ? 'Enabling...' : 'Enable MFA'}
                      </button>
                    </form>
                  ) : (
                    <div className="d-flex gap-2 flex-wrap">
                      <button className="btn btn-outline-secondary"
                        onClick={handleReset} disabled={busy}>
                        Reset recovery codes
                      </button>
                      <button className="btn btn-outline-danger"
                        onClick={handleDisable} disabled={busy}>
                        Disable MFA
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {codes.length > 0 && (
                <div className="alert alert-warning mt-4 mb-0">
                  <h3 className="h6">Recovery codes — save these now</h3>
                  <ul className="mb-0">
                    {codes.map(c => <li key={c}><code>{c}</code></li>)}
                  </ul>
                </div>
              )}
              {codes.length === 0 && (
                <p className="mt-4 mb-0 text-muted">
                  Recovery codes remaining: {status.recoveryCodesLeft}
                </p>
              )}
            </>
          )}
        </div></div>
      </div></div>
    </div>
  );
}
export default ManageMfaPage;
```
 
---
 
## Section 9: Third-Party Authentication (Google OAuth)
 
The backend already supports Google OAuth via AuthController. This section covers registering credentials and how the flow connects.
 
### 9.1 Register Your App with Google
 
1. Go to https://console.cloud.google.com and create or select a project.
2. Navigate to APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID.
3. Application type: Web application.
4. Authorised redirect URI: `http://localhost:5000/signin-google` (use your backend URL and port).
5. Copy the Client ID and Client Secret.
 
### 9.2 Store Credentials with User Secrets
 
Never put OAuth secrets in appsettings.json. Use .NET User Secrets for local development:
 
```bash
cd backend/<YourAPIProject>
dotnet user-secrets set "Authentication:Google:ClientId"     "YOUR_CLIENT_ID_HERE"
dotnet user-secrets set "Authentication:Google:ClientSecret" "YOUR_CLIENT_SECRET_HERE"
```
 
For production, use environment variables or a secrets manager (Azure Key Vault, AWS Secrets Manager, etc.).
 
### 9.3 How the Flow Works
 
1. User clicks "Continue with Google". The login page calls `buildExternalLoginUrl("Google", "/")` and navigates to it.
2. The backend /api/auth/external-login endpoint challenges with a Google OAuth redirect.
3. Google authenticates the user and redirects back to /api/auth/external-callback.
4. The callback either signs in an existing linked account, or creates a new ApplicationUser and links it to the Google account.
5. The backend redirects to the frontend with the auth cookie set. The AuthContext refreshes on the next page load.
 
> **NOTE** If Google credentials are not configured, GET /api/auth/providers returns an empty array and no external login buttons appear on the login page. No code changes are needed to hide/show them.
 
---
 
## Section 10: Cookie Consent
 
Required by GDPR and ePrivacy in many jurisdictions. A lightweight banner tracks acknowledgement in localStorage; a policy page describes the cookies used.
 
### 10.1 Create CookieConsentContext.tsx
 
> **ADAPT THIS** Change the localStorage key "rootkit-cookie-consent" to a key unique to your application, e.g. "myapp-cookie-consent". This prevents conflicts if multiple apps run on the same origin.
 
**File: `src/context/CookieConsentContext.tsx`**
 
```tsx
import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
 
const STORAGE_KEY = 'your-app-cookie-consent'; // <-- CHANGE to your app name
 
interface CookieConsentContextValue {
  hasAcknowledgedConsent: boolean;
  acknowledgeConsent: () => void;
}
const CookieConsentContext =
  createContext<CookieConsentContextValue | undefined>(undefined);
 
function readInitial() {
  return typeof window !== 'undefined' &&
    window.localStorage.getItem(STORAGE_KEY) === 'acknowledged';
}
 
export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [ack, setAck] = useState(readInitial);
  const value = useMemo(() => ({
    hasAcknowledgedConsent: ack,
    acknowledgeConsent() {
      window.localStorage.setItem(STORAGE_KEY, 'acknowledged');
      setAck(true);
    },
  }), [ack]);
  return (
    <CookieConsentContext.Provider
value={value}>{children}</CookieConsentContext.Provider>
  );
}
export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within a CookieConsentProvider.');
  return ctx;
}
```
 
### 10.2 Create CookieConsentBanner.tsx
 
Renders a sticky banner until the user clicks Acknowledge. After that it returns null permanently (localStorage persists the decision).
 
> **ADAPT THIS** Update the banner copy to accurately describe the cookies your application actually uses.
 
**File: `src/components/CookieConsentBanner.tsx`**
 
```tsx
import { Link } from 'react-router-dom';
import { useCookieConsent } from '../context/CookieConsentContext';
 
function CookieConsentBanner() {
  const { hasAcknowledgedConsent, acknowledgeConsent } = useCookieConsent();
  if (hasAcknowledgedConsent) return null;
  return (
    <aside className="cookie-consent-banner shadow-lg" role="dialog" aria-live="polite">
      <div className="cookie-consent-copy">
        <p className="mb-2"><strong>Cookie notice</strong></p>
        <p className="mb-2">
          {/* CHANGE: describe the cookies your app uses */}
          This app uses essential cookies for authentication and security.
        </p>
        <p className="mb-0">
          Read the <Link to="/cookies">cookie policy</Link> for full details.
        </p>
      </div>
      <button type="button" className="btn btn-warning fw-semibold"
        onClick={acknowledgeConsent}>
        Acknowledge essential cookies
      </button>
    </aside>
  );
}
export default CookieConsentBanner;
```
 
### 10.3 Create CookiePolicyPage.tsx
 
> **ADAPT THIS** Update the list of cookies to match what your application actually sets. Remove the Google sign-in bullet if you are not using Google OAuth.
 
**File: `src/pages/CookiePolicyPage.tsx`**
 
```tsx
import Header from '../components/Header';
 
function CookiePolicyPage() {
  return (
    <div className="container mt-4">
      <Header />
      <div className="row justify-content-center"><div className="col-lg-10">
        <div className="card shadow-sm"><div className="card-body p-4 p-lg-5">
          <h2 className="h3 mb-3">Cookie Policy</h2>
          <p className="text-muted">
            {/* CHANGE: describe your app and its cookie usage */}
            This app uses a small set of essential cookies for authentication.
          </p>
          <h3 className="h5 mt-4">Essential cookies used by this app</h3>
          <ul>
            <li>The ASP.NET Core Identity application cookie keeps the user signed in after a successful login.</li>
            <li>ASP.NET Core may issue temporary security cookies during external login challenges (e.g. Google OAuth).</li>
            <li>A localStorage flag records that this banner was acknowledged.</li>
          </ul>
          <h3 className="h5 mt-4">What we do not do</h3>
          <ul>
            <li>No analytics cookies</li>
            <li>No advertising cookies</li>
            <li>No cross-site tracking</li>
          </ul>
          <p className="mb-0 mt-4 text-muted">
            Actual legal requirements depend on your jurisdiction and data practices.
          </p>
        </div></div>
      </div></div>
    </div>
  );
}
export default CookiePolicyPage;
```
 
---
 
## Section 11: Final Verification Checklist
 
### Backend
 
26. `dotnet run` starts without errors. The seeder output appears in the console on first run.
27. Identity database file is created with all AspNet* tables.
28. `GET /api/auth/me` returns `{ isAuthenticated: false }` with no auth cookie.
29. `POST /api/auth/register` with a 14+ character password returns 200.
30. `POST /api/auth/login` returns 200 and sets the auth cookie.
31. `GET /api/auth/me` with the auth cookie returns `{ isAuthenticated: true, roles: [...] }`.
32. Admin-only endpoint without auth cookie returns 401. With admin cookie returns 200.
 
### Frontend
 
33. Header shows "Signed out" yellow badge when not logged in.
34. Register page creates a new account and redirects to login.
35. Login page signs in, header updates to green "Signed in as..." badge.
36. Logout page signs out, header returns to yellow badge.
37. Logging in as the admin user shows the Admin nav link.
38. Admin page: form visible, list loads, new item can be created.
39. /mfa: QR code and shared key displayed; MFA can be enabled; recovery codes shown.
40. After enabling MFA, logging out and back in requires the TOTP code.
41. Cookie consent banner appears on first visit; disappears after acknowledgement; stays hidden on refresh.
 
### Security Spot Checks
 
42. Browser Dev Tools > Application > Cookies: auth cookie has HttpOnly and Secure flags set.
43. Network tab: API responses include Content-Security-Policy header.
44. Admin API endpoint returns 401 when accessed directly without an auth cookie.
45. Registration with a password shorter than 14 characters is rejected with an error message.
 
---
 
## Section 12: Common Errors and Quick Fixes
 
This section covers the most common errors encountered when following this guide. Each entry shows the error message or symptom, why it happens, and exactly how to fix it.
 
### 12.1 Build and Compile Errors
 
---
 
**ERROR: The type or namespace name "ApplicationUser" could not be found**
 
Cause: The using directive at the top of Program.cs (or another file) still points to the RootkitIdentity namespace instead of your project's namespace.
 
Where it appears: Program.cs, AuthController.cs, AuthIdentityGenerator.cs
 
**FIX:** Replace all instances of `"using RootkitAuth.API.Data;"` with `"using YourProject.YourNamespace.Data;"` (or wherever you placed the Data files). Check every file that has a using statement referencing the old namespace.
 
---
 
**ERROR: No service for type "RootbeerDbContext" has been registered**
 
Cause: Program.cs still contains the old `AddDbContext<RootbeerDbContext>(...)` line but the class name was changed or not found.
 
Where it appears: Runtime startup exception.
 
**FIX:** In Program.cs, find the line that registers your existing application DbContext and ensure the class name matches exactly. It must be `AddDbContext<YourActualDbContextClassName>(...)`.
 
---
 
**ERROR: "dotnet ef" — No DbContext was found in assembly**
 
Cause: Running `dotnet ef migrations add` without specifying which DbContext to target when multiple DbContexts are registered.
 
**FIX:** Always specify the context:
 
```bash
# Correct command (always use --context and --output-dir):
dotnet ef migrations add InitialCreate \
  --context AuthIdentityDbContext \
  --output-dir Migrations/AuthIdentity
 
# Apply the migration:
dotnet ef database update --context AuthIdentityDbContext
```
 
---
 
**ERROR: UserSecretsId is missing — Google OAuth credentials not loading**
 
Cause: The .csproj does not have a `<UserSecretsId>` element so `dotnet user-secrets set` cannot find the project.
 
**FIX:** Run `dotnet user-secrets init` in your backend project folder. This auto-adds a UserSecretsId GUID to your .csproj. Then run the user-secrets set commands for Google credentials (see Section 9.2).
 
---
 
**ERROR: Cannot find module "qrcode" or "@types/qrcode"**
 
Cause: The npm package was not installed in the frontend folder.
 
**FIX:** In your frontend folder run: `npm install qrcode @types/qrcode` — then restart the Vite dev server.
 
---
 
### 12.2 Runtime Authentication Errors
 
---
 
**ERROR: Login POST returns 400 Bad Request / validation error**
 
Cause 1: The password does not meet the minimum 14-character requirement.
Cause 2: The JSON body keys do not match what MapIdentityApi expects ("email" and "password").
Cause 3: The user account does not exist yet (not registered).
 
**FIX:** Verify the password is 14+ characters. Verify your authAPI.ts is sending exactly `{ email, password }` in the POST body. Check that the user has been registered via the /register endpoint first.
 
---
 
**ERROR: POST /api/auth/login returns 200 but the user is still shown as logged out**
 
Cause 1: The fetch call in authAPI.ts is missing `credentials: "include"`. Without this flag, the browser does not send or store cookies.
Cause 2: CORS is not configured with `AllowCredentials()` on the backend.
Cause 3: AuthContext is not calling `getAuthSession()` after login, so the state is stale.
 
**FIX:** Check three things: (1) every fetch call in authAPI.ts has `credentials: "include"`, (2) Program.cs CORS policy has `.AllowCredentials()` with a specific AllowedOrigins (not AllowAnyOrigin), (3) `loginUser()` in authAPI.ts returns successfully before AuthContext re-fetches the session.
 
---
 
**ERROR: GET /api/auth/me returns 401 Unauthorized after login**
 
Cause 1: Cookie was not set because `credentials: "include"` is missing on the login fetch.
Cause 2: `UseAuthentication()` is not called before `UseAuthorization()` in Program.cs middleware order.
Cause 3: The `[Authorize]` attribute is on the endpoint but the user's cookie has expired.
 
**FIX:** Check middleware order in Program.cs: `UseRouting → UseCors → UseAuthentication → UseAuthorization → MapControllers`. `UseAuthentication` MUST come before `UseAuthorization`. Add logs to confirm the cookie is being sent in the browser DevTools → Network → Request Headers.
 
```csharp
// Correct middleware order in Program.cs:
app.UseRouting();
app.UseCors(FrontendCorsPolicy);
app.UseAuthentication();   // MUST be before UseAuthorization
app.UseAuthorization();
app.MapControllers();
```
 
---
 
**ERROR: CORS error: "has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header"**
 
Cause 1: `UseCors()` is not being called, or is called after `MapControllers()`.
Cause 2: The FrontendUrl in appsettings.json does not match the actual React dev server URL (e.g. http://localhost:3000 vs http://localhost:5173).
Cause 3: `AllowAnyOrigin()` is combined with `AllowCredentials()` — these are mutually exclusive in ASP.NET Core.
 
**FIX:** Confirm `UseCors(FrontendCorsPolicy)` is in the middleware pipeline BEFORE `MapControllers()`. Set FrontendUrl in appsettings.json to the exact origin shown in the browser (including port). Never combine `AllowAnyOrigin()` with `AllowCredentials()` — use `WithOrigins("exact-url")` instead.
 
---
 
**ERROR: POST /api/auth/external-login redirects but Google shows "redirect_uri_mismatch"**
 
Cause: The callback URL registered in Google Cloud Console does not match the CallbackPath in Program.cs (default: /signin-google).
 
**FIX:** In Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized redirect URIs, add exactly: `https://localhost:5001/signin-google` (use your actual backend HTTPS port). The path must match `options.CallbackPath` in `AddGoogle()`.
 
---
 
### 12.3 Authorization (403 / Role) Errors
 
---
 
**ERROR: Endpoint returns 403 Forbidden even for the admin user**
 
Cause 1: The admin user exists but was not assigned the Admin role by AuthIdentityGenerator.
Cause 2: The policy name in `AddPolicy()` does not match the string in `[Authorize(Policy = "...")]`.
Cause 3: Roles are seeded but the JWT/cookie for the current session was issued before the role was assigned.
 
**FIX:** (1) Verify the admin role was assigned: log in, call `GET /api/auth/me`, and confirm "Admin" appears in the roles array. (2) Check that `AuthPolicies.ManageCatalog` matches exactly what you put in `[Authorize(Policy = ...)]`. (3) Log out and log back in to get a fresh cookie with updated claims.
 
---
 
**ERROR: Admin role shown in /api/auth/me but React page still shows access denied**
 
Cause: The React component is checking roles before AuthContext has finished loading (isAuthenticated is false during the initial async fetch).
 
**FIX:** Add a loading guard in your protected component: `if (!session) return <LoadingSpinner />;` — only render the role check after the session object is populated. AuthContext exposes a loading state you can use for this.
 
---
 
### 12.4 MFA / Two-Factor Errors
 
---
 
**ERROR: QR code displays but the authenticator app shows "Invalid token" / codes never work**
 
Cause 1: The sharedKey is being decoded incorrectly — the base32 decode step is missing or wrong.
Cause 2: The device clock is out of sync (TOTP is time-based; even 1-2 minutes drift causes failures).
Cause 3: The MFA issuer name contains characters that break the otpauth:// URI.
 
**FIX:** (1) Confirm authAPI.ts calls `formatKey()` on the sharedKey before building the otpauth URI. (2) Sync the clock on your mobile device (Settings → Date & Time → Set Automatically). (3) Ensure the issuer name in ManageMFAPage.tsx has no special characters or spaces that are not URL-encoded.
 
---
 
**ERROR: MFA enabled but login no longer works — stuck in a loop**
 
Cause: LoginPage.tsx is not sending twoFactorCode in the second login attempt, or the code was already used (TOTP codes are single-use per 30-second window).
 
**FIX:** Ensure loginPage sends `{ email, password, twoFactorCode }` (or `{ email, password, recoveryCode }`) in the login POST body when MFA is required. Wait for the 30-second window to refresh and use the next code if the previous one was already consumed.
 
---
 
### 12.5 Security Header / CSP Errors
 
---
 
**ERROR: Browser console: "Refused to load script … because it violates the following Content Security Policy directive"**
 
Cause: SecurityHeaders.cs adds a strict CSP (default-src 'self'). Any inline scripts, external CDN scripts, or eval() calls will be blocked.
 
**FIX:** If you need to allow a specific external resource, update the CSP string in SecurityHeaders.cs. For example, to allow Google Fonts add `"style-src 'self' https://fonts.googleapis.com"`. Only add what is necessary — each addition widens the attack surface.
 
```csharp
// SecurityHeaders.cs — extend the CSP for your specific needs:
private const string CspPolicy =
    "default-src 'self'; " +
    "base-uri 'self'; " +
    "frame-ancestors 'none'; " +
    "object-src 'none'; " +
    // Add only what your app actually needs:
    "img-src 'self' data:; " +
    "style-src 'self' https://fonts.googleapis.com;";
```
 
---
 
### 12.6 Database and Migration Errors
 
---
 
**ERROR: dotnet ef migrations add fails with "More than one DbContext was found"**
 
Cause: You have two DbContexts (your app DbContext + AuthIdentityDbContext) and did not specify which one to target.
 
**FIX:** Always pass `--context AuthIdentityDbContext` when running any Identity migration command. Your existing application DbContext migrations use `--context YourExistingDbContext`.
 
---
 
**ERROR: App starts but the admin seed user fails — "Passwords must be at least 14 characters"**
 
Cause: The default admin password in appsettings.json is shorter than 14 characters.
 
**FIX:** Update `"GenerateDefaultIdentityAdmin": { "Password": "..." }` in appsettings.json to a password that is 14 or more characters. The app enforces the same policy for seeded users as for registered users.
 
---
 
**ERROR: SQLite error: "unable to open database file" on startup**
 
Cause: The application does not have write permission to the directory where the .sqlite file is being created, or the path in the connection string is wrong.
 
**FIX:** Confirm the working directory when running `dotnet run` is your project root (where the .csproj is). SQLite `"Data Source=RootkitIdentity.sqlite"` creates the file in the current working directory. Use an absolute path if needed: `"Data Source=/path/to/data/RootkitIdentity.sqlite"`.
 
---
 
> **NOTE** If your error is not listed here, check: (1) the browser DevTools Network tab for the exact HTTP status and response body, (2) the backend terminal for the full .NET exception stack trace, (3) the ASP.NET Core logs — they often contain the exact policy or cookie setting that rejected the request.
 
---
 
*End of Guide — Authentication & Authorization — ASP.NET Core Identity + React*
 