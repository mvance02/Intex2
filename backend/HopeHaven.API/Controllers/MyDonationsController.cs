using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HopeHaven.API.Data;
using HopeHaven.API.Models;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/my-donations")]
[Authorize]
public class MyDonationsController(
    HopeHavenDbContext db,
    UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet("/api/donations/wall")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDonorWall()
    {
        var entries = await db.Donations
            .Where(d => d.ShareOnDonorWall && d.DonorWallName != null && d.DonorWallName != "")
            .GroupBy(d => d.DonorWallName!)
            .Select(g => new
            {
                displayName = g.Key,
                donationCount = g.Count(),
                latestDonationDate = g.Max(x => x.DonationDate)
            })
            .OrderByDescending(x => x.latestDonationDate)
            .ThenBy(x => x.displayName)
            .Take(250)
            .ToListAsync();

        return Ok(entries);
    }

    /// <summary>
    /// Get the logged-in user's donation history.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetMyDonations()
    {
        var identityUser = await userManager.GetUserAsync(User);
        var email = identityUser?.Email;
        if (string.IsNullOrEmpty(email))
            return Unauthorized(new { message = "Unable to resolve user email." });

        var supporter = await db.Supporters
            .Include(s => s.Donations)
            .FirstOrDefaultAsync(s => s.Email == email);

        if (supporter is null)
            return Ok(new { supporter = (object?)null, donations = Array.Empty<object>() });

        var donations = supporter.Donations
            .OrderByDescending(d => d.DonationDate)
            .ToList();

        return Ok(new
        {
            supporter = new
            {
                supporter.SupporterId,
                supporter.DisplayName,
                supporter.Email,
                supporter.CreatedAt
            },
            donations
        });
    }

    /// <summary>
    /// Create a donation for the logged-in user (simulated — no real payment).
    /// Auto-creates a Supporter record if one doesn't exist for this email.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateDonation([FromBody] CreateMyDonationRequest request)
    {
        try
        {
            var identityUser = await userManager.GetUserAsync(User);
            var email = identityUser?.Email;
            if (string.IsNullOrEmpty(email))
                return Unauthorized(new { message = "Unable to resolve user email." });

            // Find or create supporter
            var supporter = await db.Supporters.FirstOrDefaultAsync(s => s.Email == email);
            if (supporter is null)
            {
                supporter = new Supporter
                {
                    DisplayName = email.Split('@')[0],
                    Email = email,
                    SupporterType = "Individual",
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow,
                    FirstDonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    AcquisitionChannel = "Website"
                };
                db.Supporters.Add(supporter);
                await db.SaveChangesAsync();
            }

            var donation = new Donation
            {
                SupporterId = supporter.SupporterId,
                DonationType = request.DonationType ?? "Monetary",
                DonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
                IsRecurring = request.IsRecurring,
                CurrencyCode = request.CurrencyCode ?? "PHP",
                Amount = request.Amount,
                CampaignName = request.CampaignName,
                ChannelSource = "Website",
                Notes = request.Notes,
                ImpactUnit = request.ImpactUnit,
                ShareOnDonorWall = request.ShareOnDonorWall,
                DonorWallName = request.ShareOnDonorWall
                    ? NormalizeDonorWallName(request.DonorWallName, supporter.DisplayName, email)
                    : null
            };

            db.Donations.Add(donation);
            await db.SaveChangesAsync();

            return Created($"/api/my-donations", new
            {
                donation.DonationId,
                donation.Amount,
                donation.CurrencyCode,
                donation.DonationDate,
                donation.IsRecurring,
                donation.CampaignName,
                donation.DonationType,
                donation.ShareOnDonorWall,
                donation.DonorWallName
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to save donation.", error = ex.Message, inner = ex.InnerException?.Message });
        }
    }

    private static string NormalizeDonorWallName(string? requestedName, string? supporterDisplayName, string email)
    {
        var candidate = string.IsNullOrWhiteSpace(requestedName)
            ? (string.IsNullOrWhiteSpace(supporterDisplayName) ? email.Split('@')[0] : supporterDisplayName)
            : requestedName.Trim();

        return candidate.Length <= 120 ? candidate : candidate[..120];
    }
}

public record CreateMyDonationRequest(
    decimal Amount,
    string? CurrencyCode = "PHP",
    bool IsRecurring = false,
    string? DonationType = "Monetary",
    string? CampaignName = null,
    string? Notes = null,
    string? ImpactUnit = null,
    bool ShareOnDonorWall = false,
    string? DonorWallName = null
);
