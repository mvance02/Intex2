using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HopeHaven.API.Data;
using HopeHaven.API.Models;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/my-donations")]
[Authorize(AuthenticationSchemes = "Identity.Application")]
public class MyDonationsController(
    HopeHavenDbContext db,
    UserManager<ApplicationUser> userManager) : ControllerBase
{
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
            ImpactUnit = request.ImpactUnit
        };

        db.Donations.Add(donation);
        await db.SaveChangesAsync();

        return CreatedAtAction(null, new { id = donation.DonationId }, new
        {
            donation.DonationId,
            donation.Amount,
            donation.CurrencyCode,
            donation.DonationDate,
            donation.IsRecurring,
            donation.CampaignName,
            donation.DonationType
        });
    }
}

public record CreateMyDonationRequest(
    decimal Amount,
    string? CurrencyCode = "PHP",
    bool IsRecurring = false,
    string? DonationType = "Monetary",
    string? CampaignName = null,
    string? Notes = null,
    string? ImpactUnit = null
);
