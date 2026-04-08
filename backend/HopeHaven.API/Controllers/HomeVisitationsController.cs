using HopeHaven.API.Controllers.Base;
using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[Authorize(Roles = "Admin")]
public class HomeVisitationsController(HopeHavenDbContext db) : CrudController<HomeVisitation>(db)
{
    protected override DbSet<HomeVisitation> EntitySet => Db.HomeVisitations;
    protected override int GetKey(HomeVisitation entity) => entity.VisitationId;

    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<HomeVisitation>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? residentId = null,
        [FromQuery] string? visitType = null)
    {
        var query = Db.HomeVisitations.Include(h => h.Resident).AsQueryable();
        if (residentId.HasValue) query = query.Where(h => h.ResidentId == residentId);
        if (!string.IsNullOrWhiteSpace(visitType)) query = query.Where(h => h.VisitType == visitType);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(h => h.VisitDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new PaginatedResponse<HomeVisitation> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("{id:int}")]
    public override async Task<ActionResult<HomeVisitation>> GetById(int id)
    {
        var visit = await Db.HomeVisitations.Include(h => h.Resident).FirstOrDefaultAsync(h => h.VisitationId == id);
        return visit is null ? NotFound() : Ok(visit);
    }
}
