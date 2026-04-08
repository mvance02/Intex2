using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using HopeHaven.API.Data;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/account")]
[Authorize]
public class AccountController(UserManager<ApplicationUser> userManager) : ControllerBase
{
    /// <summary>
    /// Assigns the Donor role if the user has no roles yet.
    /// Role is now auto-assigned via GET /api/auth/me on first login,
    /// so this endpoint is a manual fallback only.
    /// </summary>
    [HttpPost("assign-default-role")]
    public async Task<IActionResult> AssignDefaultRole([FromBody] AssignRoleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email is required." });

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
            return NotFound(new { message = "User not found." });

        var roles = await userManager.GetRolesAsync(user);
        if (roles.Count == 0)
        {
            var result = await userManager.AddToRoleAsync(user, AuthRoles.Donor);
            if (!result.Succeeded)
                return BadRequest(new { message = "Failed to assign role.",
                    errors = result.Errors.Select(e => e.Description) });
        }

        return Ok(new { message = "Role assigned.", role = AuthRoles.Donor });
    }
}

public record AssignRoleRequest(string Email);
