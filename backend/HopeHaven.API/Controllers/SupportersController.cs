using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
public class SupportersController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<Supporter>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? supporterType = null,
        [FromQuery] string? status = null)
    {
        var query = db.Supporters.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s =>
                (s.DisplayName != null && s.DisplayName.Contains(search)) ||
                (s.Email != null && s.Email.Contains(search)) ||
                (s.FirstName != null && s.FirstName.Contains(search)) ||
                (s.LastName != null && s.LastName.Contains(search)));

        if (!string.IsNullOrWhiteSpace(supporterType))
            query = query.Where(s => s.SupporterType == supporterType);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(s => s.Status == status);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(s => s.DisplayName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PaginatedResponse<Supporter>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Supporter>> GetById(int id)
    {
        var supporter = await db.Supporters
            .Include(s => s.Donations)
            .FirstOrDefaultAsync(s => s.SupporterId == id);
        return supporter is null ? NotFound() : Ok(supporter);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<ActionResult<Supporter>> Create(Supporter supporter)
    {
        supporter.CreatedAt = DateTime.UtcNow;
        db.Supporters.Add(supporter);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = supporter.SupporterId }, supporter);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<IActionResult> Update(int id, Supporter supporter)
    {
        if (id != supporter.SupporterId) return BadRequest("ID mismatch.");
        db.Entry(supporter).State = EntityState.Modified;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await db.Supporters.AnyAsync(s => s.SupporterId == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<IActionResult> Delete(int id)
    {
        var supporter = await db.Supporters.FindAsync(id);
        if (supporter is null) return NotFound();

        var donations = db.Donations.Where(d => d.SupporterId == id);
        db.Donations.RemoveRange(donations);

        db.Supporters.Remove(supporter);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
