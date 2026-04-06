using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IncidentReportsController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<IncidentReport>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? residentId = null,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? severity = null)
    {
        var query = db.IncidentReports.Include(i => i.Resident).AsQueryable();

        if (residentId.HasValue) query = query.Where(i => i.ResidentId == residentId);
        if (safehouseId.HasValue) query = query.Where(i => i.SafehouseId == safehouseId);
        if (!string.IsNullOrWhiteSpace(severity)) query = query.Where(i => i.Severity == severity);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(i => i.IncidentDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PaginatedResponse<IncidentReport> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<IncidentReport>> GetById(int id)
    {
        var report = await db.IncidentReports
            .Include(i => i.Resident)
            .Include(i => i.Safehouse)
            .FirstOrDefaultAsync(i => i.IncidentId == id);
        return report is null ? NotFound() : Ok(report);
    }

    [HttpPost]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<ActionResult<IncidentReport>> Create(IncidentReport report)
    {
        db.IncidentReports.Add(report);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = report.IncidentId }, report);
    }

    [HttpPut("{id:int}")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<IActionResult> Update(int id, IncidentReport report)
    {
        if (id != report.IncidentId) return BadRequest("ID mismatch.");
        db.Entry(report).State = EntityState.Modified;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await db.IncidentReports.AnyAsync(i => i.IncidentId == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    // [Authorize(Roles = "Admin")] // IS 414
    public async Task<IActionResult> Delete(int id)
    {
        var report = await db.IncidentReports.FindAsync(id);
        if (report is null) return NotFound();
        db.IncidentReports.Remove(report);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
