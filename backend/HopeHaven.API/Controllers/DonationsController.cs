using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
public class DonationsController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<Donation>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? supporterId = null,
        [FromQuery] string? donationType = null,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null)
    {
        var query = db.Donations.Include(d => d.Supporter).AsQueryable();

        if (supporterId.HasValue) query = query.Where(d => d.SupporterId == supporterId);
        if (!string.IsNullOrWhiteSpace(donationType)) query = query.Where(d => d.DonationType == donationType);
        if (from.HasValue) query = query.Where(d => d.DonationDate >= from);
        if (to.HasValue) query = query.Where(d => d.DonationDate <= to);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(d => d.DonationDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PaginatedResponse<Donation> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Donation>> GetById(int id)
    {
        var donation = await db.Donations
            .Include(d => d.Supporter)
            .Include(d => d.Allocations)
            .Include(d => d.InKindItems)
            .FirstOrDefaultAsync(d => d.DonationId == id);
        return donation is null ? NotFound() : Ok(donation);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<ActionResult<Donation>> Create(Donation donation)
    {
        db.Donations.Add(donation);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = donation.DonationId }, donation);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<IActionResult> Update(int id, Donation donation)
    {
        if (id != donation.DonationId) return BadRequest("ID mismatch.");
        db.Entry(donation).State = EntityState.Modified;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await db.Donations.AnyAsync(d => d.DonationId == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<IActionResult> Delete(int id)
    {
        var donation = await db.Donations.FindAsync(id);
        if (donation is null) return NotFound();
        db.Donations.Remove(donation);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
