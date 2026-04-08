using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HopeHaven.API.Data;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController(
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole> roleManager) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await userManager.Users
            .OrderBy(u => u.Email)
            .ToListAsync();

        var result = new List<object>();
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            result.Add(new
            {
                user.Id,
                user.Email,
                user.UserName,
                user.EmailConfirmed,
                user.TwoFactorEnabled,
                user.LockoutEnd,
                Roles = roles.OrderBy(r => r).ToArray()
            });
        }

        return Ok(result);
    }

    [HttpPut("{id}/roles")]
    public async Task<IActionResult> UpdateRoles(string id, [FromBody] UpdateRolesRequest request)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        // Validate all requested roles exist
        foreach (var role in request.Roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                return BadRequest(new { message = $"Role '{role}' does not exist." });
        }

        var currentRoles = await userManager.GetRolesAsync(user);

        // Remove roles not in the new set
        var toRemove = currentRoles.Except(request.Roles).ToList();
        if (toRemove.Count > 0)
        {
            var rr = await userManager.RemoveFromRolesAsync(user, toRemove);
            if (!rr.Succeeded)
                return BadRequest(new { message = "Failed to remove roles.",
                    errors = rr.Errors.Select(e => e.Description) });
        }

        // Add roles not in the current set
        var toAdd = request.Roles.Except(currentRoles).ToList();
        if (toAdd.Count > 0)
        {
            var ar = await userManager.AddToRolesAsync(user, toAdd);
            if (!ar.Succeeded)
                return BadRequest(new { message = "Failed to add roles.",
                    errors = ar.Errors.Select(e => e.Description) });
        }

        var updatedRoles = await userManager.GetRolesAsync(user);
        return Ok(new
        {
            user.Id,
            user.Email,
            Roles = updatedRoles.OrderBy(r => r).ToArray()
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        // Keep username/email in sync if only one is provided.
        var nextEmail = string.IsNullOrWhiteSpace(request.Email) ? user.Email : request.Email.Trim();
        var nextUserName = string.IsNullOrWhiteSpace(request.UserName) ? user.UserName : request.UserName.Trim();
        if (string.IsNullOrWhiteSpace(nextUserName)) nextUserName = nextEmail;

        user.Email = nextEmail;
        user.UserName = nextUserName;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message = "Failed to update user.",
                errors = result.Errors.Select(e => e.Description)
            });
        }

        var roles = await userManager.GetRolesAsync(user);
        return Ok(new
        {
            user.Id,
            user.Email,
            user.UserName,
            user.EmailConfirmed,
            user.TwoFactorEnabled,
            user.LockoutEnd,
            Roles = roles.OrderBy(r => r).ToArray()
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var currentUserId = userManager.GetUserId(User);
        if (currentUserId == id)
            return BadRequest(new { message = "You cannot delete your own account." });

        var user = await userManager.FindByIdAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message = "Failed to delete user.",
                errors = result.Errors.Select(e => e.Description)
            });
        }

        return Ok(new { message = "User deleted." });
    }
}

public record UpdateRolesRequest(string[] Roles);
public record UpdateUserRequest(string? Email, string? UserName);
