using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PartnersController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Partner>>> GetAll(
        [FromQuery] string? status = null)
    {
        var query = db.Partners.AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(p => p.Status == status);
        return Ok(await query.OrderBy(p => p.PartnerName).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Partner>> GetById(int id)
    {
        var partner = await db.Partners
            .Include(p => p.Assignments)
            .FirstOrDefaultAsync(p => p.PartnerId == id);
        return partner is null ? NotFound() : Ok(partner);
    }

    [HttpPost]
    // [Authorize(Roles = "Admin")] // IS 414
    public async Task<ActionResult<Partner>> Create(Partner partner)
    {
        db.Partners.Add(partner);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = partner.PartnerId }, partner);
    }

    [HttpPut("{id:int}")]
    // [Authorize(Roles = "Admin")] // IS 414
    public async Task<IActionResult> Update(int id, Partner partner)
    {
        if (id != partner.PartnerId) return BadRequest("ID mismatch.");
        db.Entry(partner).State = EntityState.Modified;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await db.Partners.AnyAsync(p => p.PartnerId == id)) return NotFound();
            throw;
        }
        return NoContent();
    }
}
