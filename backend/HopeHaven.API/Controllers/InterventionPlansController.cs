using HopeHaven.API.Controllers.Base;
using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[Authorize(Roles = "Admin")]
public class InterventionPlansController(HopeHavenDbContext db) : CrudController<InterventionPlan>(db)
{
    protected override DbSet<InterventionPlan> EntitySet => Db.InterventionPlans;
    protected override int GetKey(InterventionPlan entity) => entity.PlanId;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InterventionPlan>>> GetAll(
        [FromQuery] int? residentId = null,
        [FromQuery] string? status = null)
    {
        var query = Db.InterventionPlans.AsQueryable();
        if (residentId.HasValue) query = query.Where(p => p.ResidentId == residentId);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(p => p.Status == status);
        return Ok(await query.OrderByDescending(p => p.CreatedAt).ToListAsync());
    }

    [HttpPost]
    public override async Task<ActionResult<InterventionPlan>> Create(InterventionPlan plan)
    {
        plan.CreatedAt = DateTime.UtcNow;
        plan.UpdatedAt = DateTime.UtcNow;
        return await base.Create(plan);
    }

    [HttpPut("{id:int}")]
    public override async Task<IActionResult> Update(int id, InterventionPlan plan)
    {
        plan.UpdatedAt = DateTime.UtcNow;
        return await base.Update(id, plan);
    }
}
