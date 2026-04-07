using HopeHaven.API.Data;
using HopeHaven.API.Infrastructure;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

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

// Default auth scheme = cookies (AddIdentityApiEndpoints registers both Bearer
// and Cookie; we want [Authorize] on controllers to use cookies by default)
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = IdentityConstants.ApplicationScheme;
    options.DefaultChallengeScheme    = IdentityConstants.ApplicationScheme;
});

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
builder.Services.AddAuthorization(options =>
{
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
using (var scope = app.Services.CreateScope())
{
    await AuthIdentityGenerator.GenerateDefaultIdentityAsync(
        scope.ServiceProvider, app.Configuration);
}

// ── Pipeline ───────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

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

app.Run();
