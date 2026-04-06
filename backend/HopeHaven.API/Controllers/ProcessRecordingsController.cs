using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProcessRecordingsController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<ProcessRecording>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? residentId = null,
        [FromQuery] string? socialWorker = null)
    {
        var query = db.ProcessRecordings.Include(p => p.Resident).AsQueryable();

        if (residentId.HasValue) query = query.Where(p => p.ResidentId == residentId);
        if (!string.IsNullOrWhiteSpace(socialWorker)) query = query.Where(p => p.SocialWorker == socialWorker);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.SessionDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PaginatedResponse<ProcessRecording> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProcessRecording>> GetById(int id)
    {
        var recording = await db.ProcessRecordings
            .Include(p => p.Resident)
            .FirstOrDefaultAsync(p => p.RecordingId == id);
        return recording is null ? NotFound() : Ok(recording);
    }

    [HttpPost]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<ActionResult<ProcessRecording>> Create(ProcessRecording recording)
    {
        db.ProcessRecordings.Add(recording);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = recording.RecordingId }, recording);
    }

    [HttpPut("{id:int}")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<IActionResult> Update(int id, ProcessRecording recording)
    {
        if (id != recording.RecordingId) return BadRequest("ID mismatch.");
        db.Entry(recording).State = EntityState.Modified;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await db.ProcessRecordings.AnyAsync(p => p.RecordingId == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<IActionResult> Delete(int id)
    {
        var recording = await db.ProcessRecordings.FindAsync(id);
        if (recording is null) return NotFound();
        db.ProcessRecordings.Remove(recording);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
