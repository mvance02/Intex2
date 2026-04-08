using HopeHaven.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers.Base;

/// <summary>
/// Generic base controller providing standard Create, GetById, Update, and Delete
/// implementations. Subclasses provide GetAll (with domain-specific filtering/ordering)
/// and override GetById when .Include() chains are needed.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public abstract class CrudController<TEntity>(HopeHavenDbContext db) : ControllerBase
    where TEntity : class
{
    protected HopeHavenDbContext Db { get; } = db;
    protected abstract DbSet<TEntity> EntitySet { get; }
    protected abstract int GetKey(TEntity entity);

    [HttpGet("{id:int}")]
    public virtual async Task<ActionResult<TEntity>> GetById(int id)
    {
        var entity = await EntitySet.FindAsync(id);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public virtual async Task<ActionResult<TEntity>> Create(TEntity entity)
    {
        EntitySet.Add(entity);
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = GetKey(entity) }, entity);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public virtual async Task<IActionResult> Update(int id, TEntity entity)
    {
        if (id != GetKey(entity)) return BadRequest("ID mismatch.");
        Db.Entry(entity).State = EntityState.Modified;
        try
        {
            await Db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (await EntitySet.FindAsync(id) is null) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public virtual async Task<IActionResult> Delete(int id)
    {
        var entity = await EntitySet.FindAsync(id);
        if (entity is null) return NotFound();
        EntitySet.Remove(entity);
        await Db.SaveChangesAsync();
        return NoContent();
    }
}
