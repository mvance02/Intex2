using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using HopeHaven.API.Data;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IConfiguration configuration) : ControllerBase
{
    private const string DefaultFrontendUrl    = "http://localhost:5173";
    private const string DefaultExternalReturn = "/";

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentSession()
    {
        if (User.Identity?.IsAuthenticated != true)
            return Ok(new { isAuthenticated = false, userName = (string?)null,
                            email = (string?)null, roles = Array.Empty<string>() });

        var user  = await userManager.GetUserAsync(User);
        var roles = User.Claims
            .Where(c => c.Type == ClaimTypes.Role)
            .Select(c => c.Value).Distinct().OrderBy(r => r).ToArray();

        // Auto-assign Donor role on first authenticated session if user has none
        if (user is not null && roles.Length == 0)
        {
            var dbRoles = await userManager.GetRolesAsync(user);
            if (dbRoles.Count == 0)
            {
                await userManager.AddToRoleAsync(user, AuthRoles.Donor);
                roles = [AuthRoles.Donor];
            }
            else
            {
                roles = dbRoles.OrderBy(r => r).ToArray();
            }
        }

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
        props.Items["prompt"] = "select_account";
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
            isPersistent: false, bypassTwoFactor: false);
        if (result.Succeeded) return Redirect(SuccessUrl(returnPath));

        var email = info.Principal.FindFirstValue(ClaimTypes.Email)
                 ?? info.Principal.FindFirstValue("email");
        if (string.IsNullOrWhiteSpace(email))
            return Redirect(ErrorUrl("No email returned from provider."));

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser
                { UserName = email, Email = email, EmailConfirmed = true };
            var cr = await userManager.CreateAsync(user);
            if (!cr.Succeeded) return Redirect(ErrorUrl("Unable to create local account."));
            await userManager.AddToRoleAsync(user, AuthRoles.Donor);
        }

        var lr = await userManager.AddLoginAsync(user, info);
        if (!lr.Succeeded) return Redirect(ErrorUrl("Unable to link external login."));

        await signInManager.SignInAsync(user, isPersistent: false, info.LoginProvider);
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
        string.IsNullOrWhiteSpace(p) || !p.StartsWith('/') ? DefaultExternalReturn : p;

    private string SuccessUrl(string? returnPath)
    {
        var url = configuration["FrontendUrl"] ?? DefaultFrontendUrl;
        return $"{url.TrimEnd('/')}{NormalizePath(returnPath)}";
    }

    private string ErrorUrl(string msg)
    {
        var url = configuration["FrontendUrl"] ?? DefaultFrontendUrl;
        return QueryHelpers.AddQueryString($"{url.TrimEnd('/')}/login", "externalError", msg);
    }
}
