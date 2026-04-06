using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SafehousesController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Safehouse>>> GetAll()
    {
        return Ok(await db.Safehouses.OrderBy(s => s.Name).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Safehouse>> GetById(int id)
    {
        var safehouse = await db.Safehouses.FindAsync(id);
        return safehouse is null ? NotFound() : Ok(safehouse);
    }

    [HttpPost]
    // [Authorize(Roles = "Admin")] // IS 414
    public async Task<ActionResult<Safehouse>> Create(Safehouse safehouse)
    {
        db.Safehouses.Add(safehouse);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = safehouse.SafehouseId }, safehouse);
    }

    [HttpPut("{id:int}")]
    // [Authorize(Roles = "Admin")] // IS 414
    public async Task<IActionResult> Update(int id, Safehouse safehouse)
    {
        if (id != safehouse.SafehouseId) return BadRequest("ID mismatch.");
        db.Entry(safehouse).State = EntityState.Modified;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await db.Safehouses.AnyAsync(s => s.SafehouseId == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    // [Authorize(Roles = "Admin")] // IS 414
    public async Task<IActionResult> Delete(int id)
    {
        var safehouse = await db.Safehouses.FindAsync(id);
        if (safehouse is null) return NotFound();
        db.Safehouses.Remove(safehouse);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
