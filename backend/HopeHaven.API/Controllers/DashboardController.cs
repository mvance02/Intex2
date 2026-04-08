using HopeHaven.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
[Authorize]
public class DashboardController(HopeHavenDbContext db) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics()
    {
        var activeResidents = await db.Residents.CountAsync(r => r.CaseStatus == "Active");
        var totalSupporters = await db.Supporters.CountAsync(s => s.Status == "Active");
        var ytdDonations = await db.Donations
            .Where(d => d.DonationDate >= new DateOnly(DateTime.UtcNow.Year, 1, 1))
            .SumAsync(d => (decimal?)d.Amount ?? 0);
        var activeSafehouses = await db.Safehouses.CountAsync(s => s.Status == "Active");
        var openIncidents = await db.IncidentReports.CountAsync(i => !i.Resolved);
        var highRiskResidents = await db.Residents
            .CountAsync(r => r.CurrentRiskLevel == "Critical" || r.CurrentRiskLevel == "High");

        return Ok(new
        {
            activeResidents,
            totalSupporters,
            ytdDonations,
            activeSafehouses,
            openIncidents,
            highRiskResidents
        });
    }

    [HttpGet("recent-activity")]
    public async Task<IActionResult> GetRecentActivity()
    {
        var recentDonations = await db.Donations
            .Include(d => d.Supporter)
            .OrderByDescending(d => d.DonationDate)
            .Take(5)
            .Select(d => new
            {
                type = "donation",
                description = $"{d.Supporter!.DisplayName} donated {d.CurrencyCode} {d.Amount:F2}",
                date = d.DonationDate
            })
            .ToListAsync();

        var recentRecordings = await db.ProcessRecordings
            .OrderByDescending(p => p.SessionDate)
            .Take(5)
            .Select(p => new
            {
                type = "session",
                description = $"Session with resident #{p.ResidentId} by {p.SocialWorker}",
                date = p.SessionDate
            })
            .ToListAsync();

        var recentIncidents = await db.IncidentReports
            .OrderByDescending(i => i.IncidentDate)
            .Take(5)
            .Select(i => new
            {
                type = "incident",
                description = $"{i.Severity} {i.IncidentType} at safehouse #{i.SafehouseId}",
                date = i.IncidentDate
            })
            .ToListAsync();

        var activity = recentDonations
            .Cast<object>()
            .Concat(recentRecordings)
            .Concat(recentIncidents)
            .ToList();

        return Ok(activity);
    }

    [AllowAnonymous]
    [HttpGet("safehouse-summary")]
    public async Task<IActionResult> GetSafehouseSummary()
    {
        var summary = await db.Safehouses
            .Select(s => new
            {
                s.SafehouseId,
                s.Name,
                s.Region,
                s.Status,
                s.CapacityGirls,
                s.CurrentOccupancy,
                activeResidents = s.Residents.Count(r => r.CaseStatus == "Active")
            })
            .ToListAsync();

        return Ok(summary);
    }
}
