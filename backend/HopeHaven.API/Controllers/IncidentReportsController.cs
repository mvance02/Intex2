using HopeHaven.API.Controllers.Base;
using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

public class IncidentReportsController(HopeHavenDbContext db) : CrudController<IncidentReport>(db)
{
    protected override DbSet<IncidentReport> EntitySet => Db.IncidentReports;
    protected override int GetKey(IncidentReport entity) => entity.IncidentId;

    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<IncidentReport>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? residentId = null,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? severity = null)
    {
        var query = Db.IncidentReports.Include(i => i.Resident).AsQueryable();
        if (residentId.HasValue) query = query.Where(i => i.ResidentId == residentId);
        if (safehouseId.HasValue) query = query.Where(i => i.SafehouseId == safehouseId);
        if (!string.IsNullOrWhiteSpace(severity)) query = query.Where(i => i.Severity == severity);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(i => i.IncidentDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new PaginatedResponse<IncidentReport> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("{id:int}")]
    public override async Task<ActionResult<IncidentReport>> GetById(int id)
    {
        var report = await Db.IncidentReports.Include(i => i.Resident).Include(i => i.Safehouse).FirstOrDefaultAsync(i => i.IncidentId == id);
        return report is null ? NotFound() : Ok(report);
    }
}
