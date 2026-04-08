using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
public class HealthWellbeingRecordsController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<HealthWellbeingRecord>>> GetAll(
        [FromQuery] int? residentId = null)
    {
        var query = db.HealthWellbeingRecords.AsQueryable();
        if (residentId.HasValue) query = query.Where(h => h.ResidentId == residentId);
        return Ok(await query.OrderByDescending(h => h.RecordDate).ToListAsync());
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<ActionResult<HealthWellbeingRecord>> Create(HealthWellbeingRecord record)
    {
        db.HealthWellbeingRecords.Add(record);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), record);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<IActionResult> Update(int id, HealthWellbeingRecord record)
    {
        if (id != record.HealthRecordId) return BadRequest("ID mismatch.");
        db.Entry(record).State = EntityState.Modified;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await db.HealthWellbeingRecords.AnyAsync(h => h.HealthRecordId == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<IActionResult> Delete(int id)
    {
        var record = await db.HealthWellbeingRecords.FindAsync(id);
        if (record is null) return NotFound();
        db.HealthWellbeingRecords.Remove(record);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
