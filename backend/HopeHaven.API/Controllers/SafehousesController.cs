using HopeHaven.API.Controllers.Base;
using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

public class SafehousesController(HopeHavenDbContext db) : CrudController<Safehouse>(db)
{
    protected override DbSet<Safehouse> EntitySet => Db.Safehouses;
    protected override int GetKey(Safehouse entity) => entity.SafehouseId;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Safehouse>>> GetAll()
        => Ok(await Db.Safehouses.OrderBy(s => s.Name).ToListAsync());
}
