using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
public class ResidentsController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<Resident>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? caseStatus = null,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? caseCategory = null,
        [FromQuery] string? riskLevel = null,
        [FromQuery] DateOnly? dateFrom = null,
        [FromQuery] DateOnly? dateTo = null)
    {
        var query = db.Residents.Include(r => r.Safehouse).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(r =>
                (r.CaseControlNo != null && r.CaseControlNo.Contains(search)) ||
                (r.InternalCode != null && r.InternalCode.Contains(search)) ||
                (r.AssignedSocialWorker != null && r.AssignedSocialWorker.Contains(search)));

        if (!string.IsNullOrWhiteSpace(caseStatus))
            query = query.Where(r => r.CaseStatus == caseStatus);

        if (safehouseId.HasValue)
            query = query.Where(r => r.SafehouseId == safehouseId);

        if (!string.IsNullOrWhiteSpace(caseCategory))
            query = query.Where(r => r.CaseCategory == caseCategory);

        if (!string.IsNullOrWhiteSpace(riskLevel))
            query = query.Where(r => r.CurrentRiskLevel == riskLevel);

        if (dateFrom.HasValue)
            query = query.Where(r => r.DateOfAdmission >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(r => r.DateOfAdmission <= dateTo.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.DateOfAdmission)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PaginatedResponse<Resident> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Resident>> GetById(int id)
    {
        var resident = await db.Residents
            .Include(r => r.Safehouse)
            .Include(r => r.ProcessRecordings.OrderByDescending(p => p.SessionDate))
            .Include(r => r.HomeVisitations.OrderByDescending(h => h.VisitDate))
            .Include(r => r.IncidentReports.OrderByDescending(i => i.IncidentDate))
            .Include(r => r.InterventionPlans)
            .Include(r => r.HealthRecords.OrderByDescending(h => h.RecordDate).Take(1))
            .Include(r => r.EducationRecords.OrderByDescending(e => e.RecordDate).Take(1))
            .FirstOrDefaultAsync(r => r.ResidentId == id);

        return resident is null ? NotFound() : Ok(resident);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<ActionResult<Resident>> Create(Resident resident)
    {
        resident.CreatedAt = DateTime.UtcNow;
        db.Residents.Add(resident);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = resident.ResidentId }, resident);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<IActionResult> Update(int id, Resident resident)
    {
        if (id != resident.ResidentId) return BadRequest("ID mismatch.");
        db.Entry(resident).State = EntityState.Modified;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await db.Residents.AnyAsync(r => r.ResidentId == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<IActionResult> Delete(int id)
    {
        var resident = await db.Residents.FindAsync(id);
        if (resident is null) return NotFound();

        // Cascade: remove all child case records before the resident so FK
        // constraints on ResidentId are satisfied.
        db.ProcessRecordings.RemoveRange(db.ProcessRecordings.Where(p => p.ResidentId == id));
        db.HomeVisitations.RemoveRange(db.HomeVisitations.Where(h => h.ResidentId == id));
        db.IncidentReports.RemoveRange(db.IncidentReports.Where(i => i.ResidentId == id));
        db.InterventionPlans.RemoveRange(db.InterventionPlans.Where(p => p.ResidentId == id));
        db.HealthWellbeingRecords.RemoveRange(db.HealthWellbeingRecords.Where(h => h.ResidentId == id));
        db.EducationRecords.RemoveRange(db.EducationRecords.Where(e => e.ResidentId == id));

        db.Residents.Remove(resident);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
