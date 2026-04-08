using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EducationRecordsController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EducationRecord>>> GetAll(
        [FromQuery] int? residentId = null)
    {
        var query = db.EducationRecords.AsQueryable();
        if (residentId.HasValue) query = query.Where(e => e.ResidentId == residentId);
        return Ok(await query.OrderByDescending(e => e.RecordDate).ToListAsync());
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<ActionResult<EducationRecord>> Create(EducationRecord record)
    {
        db.EducationRecords.Add(record);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), record);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<IActionResult> Update(int id, EducationRecord record)
    {
        if (id != record.EducationRecordId) return BadRequest("ID mismatch.");
        db.Entry(record).State = EntityState.Modified;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await db.EducationRecords.AnyAsync(e => e.EducationRecordId == id)) return NotFound();
            throw;
        }
        return NoContent();
    }
}
