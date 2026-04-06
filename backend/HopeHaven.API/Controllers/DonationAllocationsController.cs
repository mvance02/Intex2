using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DonationAllocationsController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<DonationAllocation>>> GetAll(
        [FromQuery] int? donationId = null,
        [FromQuery] int? safehouseId = null)
    {
        var query = db.DonationAllocations
            .Include(a => a.Donation)
            .Include(a => a.Safehouse)
            .AsQueryable();

        if (donationId.HasValue) query = query.Where(a => a.DonationId == donationId);
        if (safehouseId.HasValue) query = query.Where(a => a.SafehouseId == safehouseId);

        return Ok(await query.OrderByDescending(a => a.AllocationDate).ToListAsync());
    }

    [HttpPost]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public async Task<ActionResult<DonationAllocation>> Create(DonationAllocation allocation)
    {
        db.DonationAllocations.Add(allocation);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), allocation);
    }

    [HttpDelete("{id:int}")]
    // [Authorize(Roles = "Admin")] // IS 414
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.DonationAllocations.FindAsync(id);
        if (item is null) return NotFound();
        db.DonationAllocations.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
