using HopeHaven.API.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ── Port binding (Railway sets $PORT; dev falls back to 5000) ─────────────
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// ── Database (PostgreSQL via Supabase) ─────────────────────────────────────
builder.Services.AddDbContext<HopeHavenDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

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

// ── AUTH PLACEHOLDER (IS 414) ──────────────────────────────────────────────
// builder.Services.AddIdentity<IdentityUser, IdentityRole>(options => { ... })
//     .AddEntityFrameworkStores<HopeHavenDbContext>()
//     .AddDefaultTokenProviders();
// builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
//     .AddCookie(options => { options.SlidingExpiration = true; });

// ── ML Inference (IS 455) ─────────────────────────────────────────────────
builder.Services.AddHttpClient("MLService", c =>
    c.BaseAddress = new Uri(builder.Configuration["ML:BaseUrl"] ?? "http://localhost:8001"));

var app = builder.Build();

// ── Pipeline ───────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// HTTPS redirect only in dev — Railway terminates TLS at the proxy layer
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("AllowFrontend");

// app.UseAuthentication();  // IS 414
// app.UseAuthorization();   // IS 414

app.MapControllers();
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
