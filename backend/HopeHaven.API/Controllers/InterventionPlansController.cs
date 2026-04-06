using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InterventionPlansController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<InterventionPlan>>> GetAll(
        [FromQuery] int? residentId = null,
        [FromQuery] string? status = null)
    {
        var query = db.InterventionPlans.AsQueryable();
        if (residentId.HasValue) query = query.Where(p => p.ResidentId == residentId);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(p => p.Status == status);
        return Ok(await query.OrderByDescending(p => p.CreatedAt).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<InterventionPlan>> GetById(int id)
    {
        var plan = await db.InterventionPlans.FindAsync(id);
        return plan is null ? NotFound() : Ok(plan);
    }

    [HttpPost]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<ActionResult<InterventionPlan>> Create(InterventionPlan plan)
    {
        plan.CreatedAt = DateTime.UtcNow;
        plan.UpdatedAt = DateTime.UtcNow;
        db.InterventionPlans.Add(plan);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = plan.PlanId }, plan);
    }

    [HttpPut("{id:int}")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<IActionResult> Update(int id, InterventionPlan plan)
    {
        if (id != plan.PlanId) return BadRequest("ID mismatch.");
        plan.UpdatedAt = DateTime.UtcNow;
        db.Entry(plan).State = EntityState.Modified;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await db.InterventionPlans.AnyAsync(p => p.PlanId == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    // [Authorize(Roles = "Admin")] // IS 414
    public async Task<IActionResult> Delete(int id)
    {
        var plan = await db.InterventionPlans.FindAsync(id);
        if (plan is null) return NotFound();
        db.InterventionPlans.Remove(plan);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
