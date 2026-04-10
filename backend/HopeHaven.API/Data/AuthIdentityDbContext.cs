using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Data;

public class AuthIdentityDbContext : IdentityDbContext<ApplicationUser>, IDataProtectionKeyContext
{
    public AuthIdentityDbContext(DbContextOptions<AuthIdentityDbContext> options)
        : base(options) { }

    public DbSet<DataProtectionKey> DataProtectionKeys { get; set; } = null!;
}
