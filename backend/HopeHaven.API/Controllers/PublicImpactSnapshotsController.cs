using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
[Authorize]
public class PublicImpactSnapshotsController(HopeHavenDbContext db) : ControllerBase
{
    // Public endpoint — no auth required (shown on public impact page)
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<PublicImpactSnapshot>>> GetPublished()
    {
        return Ok(await db.PublicImpactSnapshots
            .Where(s => s.IsPublished)
            .OrderByDescending(s => s.SnapshotDate)
            .ToListAsync());
    }

    [HttpGet("all")]
    public async Task<ActionResult<IEnumerable<PublicImpactSnapshot>>> GetAll()
    {
        return Ok(await db.PublicImpactSnapshots
            .OrderByDescending(s => s.SnapshotDate)
            .ToListAsync());
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<ActionResult<PublicImpactSnapshot>> Create(PublicImpactSnapshot snapshot)
    {
        db.PublicImpactSnapshots.Add(snapshot);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPublished), snapshot);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<IActionResult> Update(int id, PublicImpactSnapshot snapshot)
    {
        if (id != snapshot.SnapshotId) return BadRequest("ID mismatch.");
        db.Entry(snapshot).State = EntityState.Modified;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await db.PublicImpactSnapshots.AnyAsync(s => s.SnapshotId == id)) return NotFound();
            throw;
        }
        return NoContent();
    }
}
