using HopeHaven.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet("donation-trends")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<IActionResult> GetDonationTrends(
        [FromQuery] int? year = null,
        [FromQuery] int? startYear = null,
        [FromQuery] int? endYear = null)
    {
        var query = db.Donations.Where(d => d.DonationDate.HasValue);

        if (year.HasValue)
            query = query.Where(d => d.DonationDate!.Value.Year == year.Value);
        else
        {
            if (startYear.HasValue) query = query.Where(d => d.DonationDate!.Value.Year >= startYear.Value);
            if (endYear.HasValue) query = query.Where(d => d.DonationDate!.Value.Year <= endYear.Value);
        }

        var trends = await query
            .GroupBy(d => new { d.DonationDate!.Value.Year, d.DonationDate!.Value.Month })
            .Select(g => new
            {
                year = g.Key.Year,
                month = g.Key.Month,
                totalAmount = g.Sum(d => (decimal?)d.Amount ?? 0),
                donationCount = g.Count(),
                uniqueSupporters = g.Select(d => d.SupporterId).Distinct().Count()
            })
            .OrderBy(t => t.year)
            .ThenBy(t => t.month)
            .ToListAsync();

        var byCurrency = await query
            .GroupBy(d => d.CurrencyCode)
            .Select(g => new
            {
                currency = g.Key,
                totalAmount = g.Sum(d => (decimal?)d.Amount ?? 0),
                donationCount = g.Count()
            })
            .OrderByDescending(c => c.totalAmount)
            .ToListAsync();

        var byType = await query
            .GroupBy(d => d.DonationType)
            .Select(g => new
            {
                donationType = g.Key,
                totalAmount = g.Sum(d => (decimal?)d.Amount ?? 0),
                donationCount = g.Count()
            })
            .OrderByDescending(t => t.totalAmount)
            .ToListAsync();

        return Ok(new { trends, byCurrency, byType });
    }

    [HttpGet("resident-outcomes")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<IActionResult> GetResidentOutcomes(
        [FromQuery] int? safehouseId = null,
        [FromQuery] int? startYear = null,
        [FromQuery] int? endYear = null)
    {
        var query = db.Residents.AsQueryable();
        if (safehouseId.HasValue) query = query.Where(r => r.SafehouseId == safehouseId.Value);
        if (startYear.HasValue) query = query.Where(r => r.DateOfAdmission.HasValue && r.DateOfAdmission.Value.Year >= startYear.Value);
        if (endYear.HasValue) query = query.Where(r => r.DateOfAdmission.HasValue && r.DateOfAdmission.Value.Year <= endYear.Value);

        var byStatus = await query
            .GroupBy(r => r.CaseStatus)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync();

        var byRiskLevel = await query
            .GroupBy(r => r.CurrentRiskLevel)
            .Select(g => new { riskLevel = g.Key, count = g.Count() })
            .ToListAsync();

        var byCategory = await query
            .GroupBy(r => r.CaseCategory)
            .Select(g => new { category = g.Key, count = g.Count() })
            .OrderByDescending(g => g.count)
            .ToListAsync();

        var byReintegrationType = await query
            .Where(r => r.ReintegrationType != null)
            .GroupBy(r => r.ReintegrationType)
            .Select(g => new { reintegrationType = g.Key, count = g.Count() })
            .ToListAsync();

        var educationProgress = await db.EducationRecords
            .Where(e => !safehouseId.HasValue || db.Residents.Any(r => r.ResidentId == e.ResidentId && r.SafehouseId == safehouseId))
            .GroupBy(e => e.EducationLevel)
            .Select(g => new { educationLevel = g.Key, count = g.Count() })
            .ToListAsync();

        var healthScores = await db.HealthWellbeingRecords
            .Where(h => h.RecordDate.HasValue &&
                        (!safehouseId.HasValue || db.Residents.Any(r => r.ResidentId == h.ResidentId && r.SafehouseId == safehouseId)))
            .GroupBy(h => new { h.RecordDate!.Value.Year, h.RecordDate!.Value.Month })
            .Select(g => new
            {
                year = g.Key.Year,
                month = g.Key.Month,
                avgGeneralHealthScore = g.Average(h => h.GeneralHealthScore),
                avgNutritionScore = g.Average(h => h.NutritionScore),
                avgSleepQualityScore = g.Average(h => h.SleepQualityScore)
            })
            .OrderBy(h => h.year).ThenBy(h => h.month)
            .ToListAsync();

        return Ok(new { byStatus, byRiskLevel, byCategory, byReintegrationType, educationProgress, healthScores });
    }

    [HttpGet("safehouse-comparison")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<IActionResult> GetSafehouseComparison(
        [FromQuery] int? startYear = null,
        [FromQuery] int? endYear = null)
    {
        var safehouses = await db.Safehouses
            .Select(s => new
            {
                s.SafehouseId,
                s.Name,
                s.Region,
                s.Status,
                s.CapacityGirls,
                s.CurrentOccupancy,
                activeResidents = s.Residents.Count(r => r.CaseStatus == "Active"),
                totalResidents = s.Residents.Count(),
                openIncidents = s.IncidentReports.Count(i => !i.Resolved),
                totalIncidents = s.IncidentReports.Count(),
                highRiskResidents = s.Residents.Count(r => r.CurrentRiskLevel == "Critical" || r.CurrentRiskLevel == "High")
            })
            .ToListAsync();

        var monthlyMetrics = await db.SafehouseMonthlyMetrics
            .Where(m => m.MonthStart.HasValue &&
                        (!startYear.HasValue || m.MonthStart!.Value.Year >= startYear.Value) &&
                        (!endYear.HasValue || m.MonthStart!.Value.Year <= endYear.Value))
            .GroupBy(m => m.SafehouseId)
            .Select(g => new
            {
                safehouseId = g.Key,
                avgActiveResidents = g.Average(m => (double?)m.ActiveResidents),
                avgIncidentCount = g.Average(m => (double?)m.IncidentCount),
                avgEducationProgress = g.Average(m => m.AvgEducationProgress),
                avgHealthScore = g.Average(m => m.AvgHealthScore),
                totalProcessRecordings = g.Sum(m => m.ProcessRecordingCount),
                totalHomeVisitations = g.Sum(m => m.HomeVisitationCount)
            })
            .ToListAsync();

        return Ok(new { safehouses, monthlyMetrics });
    }

    [HttpGet("reintegration")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<IActionResult> GetReintegrationStats(
        [FromQuery] int? safehouseId = null,
        [FromQuery] int? startYear = null,
        [FromQuery] int? endYear = null)
    {
        var query = db.Residents.Where(r => r.ReintegrationType != null);

        if (safehouseId.HasValue) query = query.Where(r => r.SafehouseId == safehouseId.Value);
        if (startYear.HasValue) query = query.Where(r => r.DateClosed.HasValue && r.DateClosed.Value.Year >= startYear.Value);
        if (endYear.HasValue) query = query.Where(r => r.DateClosed.HasValue && r.DateClosed.Value.Year <= endYear.Value);

        var byType = await query
            .GroupBy(r => r.ReintegrationType)
            .Select(g => new
            {
                reintegrationType = g.Key,
                count = g.Count(),
                reintegratedCount = g.Count(r => r.ReintegrationStatus == "Reintegrated")
            })
            .OrderByDescending(g => g.count)
            .ToListAsync();

        var overTime = await query
            .Where(r => r.DateClosed.HasValue)
            .GroupBy(r => new { r.DateClosed!.Value.Year, r.DateClosed!.Value.Month })
            .Select(g => new
            {
                year = g.Key.Year,
                month = g.Key.Month,
                count = g.Count()
            })
            .OrderBy(g => g.year).ThenBy(g => g.month)
            .ToListAsync();

        var totalReintegrated = await query.CountAsync();

        return Ok(new { byType, overTime, totalReintegrated });
    }

    [HttpGet("annual-summary")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<IActionResult> GetAnnualSummary([FromQuery] int? year = null)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var startDate = new DateOnly(targetYear, 1, 1);
        var endDate = new DateOnly(targetYear, 12, 31);

        var totalDonations = await db.Donations
            .Where(d => d.DonationDate.HasValue && d.DonationDate >= startDate && d.DonationDate <= endDate)
            .SumAsync(d => (decimal?)d.Amount ?? 0);

        var donationCount = await db.Donations
            .CountAsync(d => d.DonationDate.HasValue && d.DonationDate >= startDate && d.DonationDate <= endDate);

        var residentStats = await db.Residents
            .Where(r => r.DateOfAdmission.HasValue &&
                        r.DateOfAdmission.Value.Year <= targetYear &&
                        (!r.DateClosed.HasValue || r.DateClosed.Value.Year >= targetYear))
            .GroupBy(r => r.CaseStatus)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync();

        var sessionCount = await db.ProcessRecordings
            .CountAsync(p => p.SessionDate.HasValue && p.SessionDate.Value.Year == targetYear);

        var visitCount = await db.HomeVisitations
            .CountAsync(v => v.VisitDate.HasValue && v.VisitDate.Value.Year == targetYear);

        var incidentCount = await db.IncidentReports
            .CountAsync(i => i.IncidentDate.HasValue && i.IncidentDate.Value.Year == targetYear);

        var reintegrationCount = await db.Residents
            .CountAsync(r => r.DateClosed.HasValue && r.DateClosed.Value.Year == targetYear && r.ReintegrationType != null);

        return Ok(new
        {
            year = targetYear,
            totalDonations,
            donationCount,
            residentStats,
            sessionCount,
            visitCount,
            incidentCount,
            reintegrationCount
        });
    }
}
