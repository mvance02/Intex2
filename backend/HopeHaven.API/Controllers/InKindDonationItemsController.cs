using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
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
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<ActionResult<InKindDonationItem>> Create(InKindDonationItem item)
    {
        db.InKindDonationItems.Add(item);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), item);
    }

    [HttpDelete("{id:int}")]
    // [Authorize(Roles = "Admin")] // IS 414
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.InKindDonationItems.FindAsync(id);
        if (item is null) return NotFound();
        db.InKindDonationItems.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
