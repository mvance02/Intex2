using Microsoft.AspNetCore.Identity;

namespace HopeHaven.API.Data
{
    public class AuthIdentityGenerator
    {
        public static async Task GenerateDefaultIdentityAsync(
            IServiceProvider sp, IConfiguration cfg)
        {
            var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = sp.GetRequiredService<RoleManager<IdentityRole>>();

            foreach (var role in new[] { AuthRoles.Admin, AuthRoles.Donor })
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
            var adminPassword = adminSection["Password"] ?? "ChangeThisPassword14!";

            var admin = await userManager.FindByEmailAsync(adminEmail);
            if (admin == null)
            {
                admin = new ApplicationUser
                {
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
