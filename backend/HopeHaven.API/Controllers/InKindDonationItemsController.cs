using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
public class InKindDonationItemsController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<InKindDonationItem>>> GetAll(
        [FromQuery] int? donationId = null)
    {
        var query = db.InKindDonationItems.AsQueryable();
        if (donationId.HasValue) query = query.Where(i => i.DonationId == donationId);
        return Ok(await query.ToListAsync());
    }

    [HttpPost]

    public async Task<ActionResult<InKindDonationItem>> Create(InKindDonationItem item)
    {
        db.InKindDonationItems.Add(item);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), item);
    }

    [HttpDelete("{id:int}")]

    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.InKindDonationItems.FindAsync(id);
        if (item is null) return NotFound();
        db.InKindDonationItems.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
