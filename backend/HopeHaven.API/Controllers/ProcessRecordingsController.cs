using HopeHaven.API.Controllers.Base;
using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[Authorize(Roles = "Admin")]
public class ProcessRecordingsController(HopeHavenDbContext db) : CrudController<ProcessRecording>(db)
{
    protected override DbSet<ProcessRecording> EntitySet => Db.ProcessRecordings;
    protected override int GetKey(ProcessRecording entity) => entity.RecordingId;

    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<ProcessRecording>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? residentId = null,
        [FromQuery] string? socialWorker = null)
    {
        var query = Db.ProcessRecordings.Include(p => p.Resident).AsQueryable();
        if (residentId.HasValue) query = query.Where(p => p.ResidentId == residentId);
        if (!string.IsNullOrWhiteSpace(socialWorker)) query = query.Where(p => p.SocialWorker == socialWorker);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(p => p.SessionDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new PaginatedResponse<ProcessRecording> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("{id:int}")]
    public override async Task<ActionResult<ProcessRecording>> GetById(int id)
    {
        var recording = await Db.ProcessRecordings.Include(p => p.Resident).FirstOrDefaultAsync(p => p.RecordingId == id);
        return recording is null ? NotFound() : Ok(recording);
    }
}
