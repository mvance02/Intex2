using HopeHaven.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
public class DashboardController(HopeHavenDbContext db) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("public-okr")]
    public async Task<IActionResult> GetPublicOkr()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var evaluationCutoff = today.AddDays(-90);
        var currentWindowStart = today.AddDays(-180);
        var previousWindowStart = today.AddDays(-270);

        string[] stableStatuses = [
            "completed",
            "stable",
            "successfully reintegrated",
            "reintegrated",
            "maintained"
        ];

        // Current reporting window: exits from 180 to 90 days ago.
        var eligibleNow = await db.Residents
            .Where(r =>
                r.DateClosed != null &&
                r.DateClosed > currentWindowStart &&
                r.DateClosed <= evaluationCutoff)
            .CountAsync();
        var stableNow = await db.Residents
            .Where(r =>
                r.DateClosed != null &&
                r.DateClosed > currentWindowStart &&
                r.DateClosed <= evaluationCutoff &&
                r.ReintegrationStatus != null &&
                stableStatuses.Contains(r.ReintegrationStatus.ToLower()))
            .CountAsync();

        // Previous reporting window: exits from 270 to 180 days ago.
        var eligiblePrev = await db.Residents
            .Where(r =>
                r.DateClosed != null &&
                r.DateClosed > previousWindowStart &&
                r.DateClosed <= currentWindowStart)
            .CountAsync();
        var stablePrev = await db.Residents
            .Where(r =>
                r.DateClosed != null &&
                r.DateClosed > previousWindowStart &&
                r.DateClosed <= currentWindowStart &&
                r.ReintegrationStatus != null &&
                stableStatuses.Contains(r.ReintegrationStatus.ToLower()))
            .CountAsync();

        var currentRate = eligibleNow > 0 ? (double)stableNow / eligibleNow : 0;
        var previousRate = eligiblePrev > 0 ? (double)stablePrev / eligiblePrev : 0;

        return Ok(new
        {
            metricName = "90-day Safe Reintegration Count",
            ratePercent = Math.Round(currentRate * 100, 1),
            stableCount = stableNow,
            eligibleCount = eligibleNow,
            previousStableCount = stablePrev,
            previousRatePercent = Math.Round(previousRate * 100, 1),
            deltaPoints = Math.Round((currentRate - previousRate) * 100, 1),
            deltaCount = stableNow - stablePrev
        });
    }

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
            .Include(p => p.Resident)
            .OrderByDescending(p => p.SessionDate)
            .Take(5)
            .Select(p => new
            {
                type = "session",
                description = $"Session with case {p.Resident!.CaseControlNo ?? "N/A"} by {p.SocialWorker}",
                date = p.SessionDate
            })
            .ToListAsync();

        var recentIncidents = await db.IncidentReports
            .Include(i => i.Safehouse)
            .OrderByDescending(i => i.IncidentDate)
            .Take(5)
            .Select(i => new
            {
                type = "incident",
                description = $"{i.Severity} {i.IncidentType} at {i.Safehouse!.Name ?? "Unknown"}",
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
