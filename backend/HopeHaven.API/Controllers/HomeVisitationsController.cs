using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HomeVisitationsController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<HomeVisitation>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? residentId = null,
        [FromQuery] string? visitType = null)
    {
        var query = db.HomeVisitations.Include(h => h.Resident).AsQueryable();

        if (residentId.HasValue) query = query.Where(h => h.ResidentId == residentId);
        if (!string.IsNullOrWhiteSpace(visitType)) query = query.Where(h => h.VisitType == visitType);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(h => h.VisitDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PaginatedResponse<HomeVisitation> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<HomeVisitation>> GetById(int id)
    {
        var visit = await db.HomeVisitations
            .Include(h => h.Resident)
            .FirstOrDefaultAsync(h => h.VisitationId == id);
        return visit is null ? NotFound() : Ok(visit);
    }

    [HttpPost]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<ActionResult<HomeVisitation>> Create(HomeVisitation visit)
    {
        db.HomeVisitations.Add(visit);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = visit.VisitationId }, visit);
    }

    [HttpPut("{id:int}")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<IActionResult> Update(int id, HomeVisitation visit)
    {
        if (id != visit.VisitationId) return BadRequest("ID mismatch.");
        db.Entry(visit).State = EntityState.Modified;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await db.HomeVisitations.AnyAsync(h => h.VisitationId == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<IActionResult> Delete(int id)
    {
        var visit = await db.HomeVisitations.FindAsync(id);
        if (visit is null) return NotFound();
        db.HomeVisitations.Remove(visit);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
