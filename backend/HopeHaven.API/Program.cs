using HopeHaven.API.Data;
using HopeHaven.API.Infrastructure;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ── Trust Railway's reverse proxy so redirect URIs use https:// ───────────
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ── Port binding (Railway sets $PORT; dev falls back to 5000) ─────────────
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// ── Database (PostgreSQL via Supabase) ─────────────────────────────────────
builder.Services.AddDbContext<HopeHavenDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// ── Identity DbContext (separate database) ──────────────────────────────────
builder.Services.AddDbContext<AuthIdentityDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("IdentityConnection")));

// ── ASP.NET Core Identity ────────────────────────────────────────────────────
builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AuthIdentityDbContext>();

// ── Google OAuth (only activates when user-secrets are configured) ───────────
var googleClientId     = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
if (!string.IsNullOrEmpty(googleClientId) && !string.IsNullOrEmpty(googleClientSecret))
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

// ── Authorization policies ───────────────────────────────────────────────────
// DefaultPolicy uses cookie scheme so [Authorize] on controllers works with cookies
// (AddIdentityApiEndpoints registers both Bearer + Cookie; Bearer is the default)
builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new AuthorizationPolicyBuilder(IdentityConstants.ApplicationScheme)
        .RequireAuthenticatedUser()
        .Build();
    options.AddPolicy(AuthPolicies.ManageContent,
        policy => policy.RequireRole(AuthRoles.Admin));
    options.AddPolicy(AuthPolicies.DonorAccess,
        policy => policy.RequireRole(AuthRoles.Donor, AuthRoles.Admin));
});

// ── Password policy (NIST: length over complexity) ───────────────────────────
builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireDigit           = false;
    options.Password.RequireLowercase       = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase       = false;
    options.Password.RequiredLength         = 14;
    options.Password.RequiredUniqueChars    = 1;
});

// ── Cookie security ───────────────────────────────────────────────────────────
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly     = true;
    options.Cookie.SameSite     = SameSiteMode.None;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.ExpireTimeSpan      = TimeSpan.FromDays(7);
    options.SlidingExpiration   = true;
    // Return 401/403 instead of redirecting to a login page (this is an API)
    options.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = 401;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = ctx =>
    {
        ctx.Response.StatusCode = 403;
        return Task.CompletedTask;
    };
});

// ── Controllers + OpenAPI ──────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
builder.Services.AddOpenApi();

// ── CORS ───────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration["AllowedOrigins"]?.Split(',') ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ── ML Inference (IS 455) ─────────────────────────────────────────────────
builder.Services.AddHttpClient("MLService", c =>
    c.BaseAddress = new Uri(builder.Configuration["ML:BaseUrl"] ?? "http://localhost:8001"));

var app = builder.Build();

// ── Seed Identity roles and default admin ─────────────────────────────────
try
{
    using var scope = app.Services.CreateScope();
    await AuthIdentityGenerator.GenerateDefaultIdentityAsync(
        scope.ServiceProvider, app.Configuration);
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogWarning(ex, "Identity seeding skipped — database may be unreachable.");
}

// ── Pipeline ───────────────────────────────────────────────────────────────
app.UseForwardedHeaders(); // must be first — makes Railway's https:// visible to ASP.NET

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Global error handler — surfaces errors as JSON instead of empty 500s
app.UseExceptionHandler(err => err.Run(async ctx =>
{
    ctx.Response.StatusCode = 500;
    ctx.Response.ContentType = "application/json";
    var ex = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    await ctx.Response.WriteAsJsonAsync(new
    {
        error = ex?.Message,
        inner = ex?.InnerException?.Message,
        type = ex?.GetType().Name
    });
}));

app.UseSecurityHeaders();

// HTTPS redirect only in dev — Railway terminates TLS at the proxy layer
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>();
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

// ── Seed (dev only) ────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment() &&
    app.Configuration.GetValue<bool>("Seeding:Enabled"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<HopeHavenDbContext>();
    var csvPath = app.Configuration["Seeding:CsvPath"] ?? "../../lighthouse_csv_v7";
    await SeedData.SeedAsync(db, csvPath);
}

// ── Fix auto-increment sequences (needed after CSV seeding inserts explicit IDs) ──
using (var fixScope = app.Services.CreateScope())
{
    var fixDb = fixScope.ServiceProvider.GetRequiredService<HopeHavenDbContext>();
    var tables = new[] { ("supporters", "supporter_id"), ("donations", "donation_id") };
    foreach (var (table, col) in tables)
    {
        try
        {
            await fixDb.Database.ExecuteSqlRawAsync(
                $"SELECT setval(pg_get_serial_sequence('{table}', '{col}'), COALESCE((SELECT MAX(\"{col}\") FROM \"{table}\"), 0) + 1, false)");
        }
        catch { /* table may not exist yet or column is IDENTITY — safe to skip */ }
    }
}

app.Run();
