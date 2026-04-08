using HopeHaven.API.Data;
using HopeHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SocialMediaPostsController(HopeHavenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<SocialMediaPost>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? platform = null,
        [FromQuery] string? postType = null)
    {
        var query = db.SocialMediaPosts.AsQueryable();
        if (!string.IsNullOrWhiteSpace(platform)) query = query.Where(p => p.Platform == platform);
        if (!string.IsNullOrWhiteSpace(postType)) query = query.Where(p => p.PostType == postType);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PaginatedResponse<SocialMediaPost> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SocialMediaPost>> GetById(int id)
    {
        var post = await db.SocialMediaPosts.FindAsync(id);
        return post is null ? NotFound() : Ok(post);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<ActionResult<SocialMediaPost>> Create(SocialMediaPost post)
    {
        post.CreatedAt = DateTime.UtcNow;
        db.SocialMediaPosts.Add(post);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = post.PostId }, post);
    }

    [HttpPatch("{id:int}/url")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<IActionResult> UpdateUrl(int id, [FromBody] string? url)
    {
        var post = await db.SocialMediaPosts.FindAsync(id);
        if (post is null) return NotFound();
        post.PostUrl = string.IsNullOrWhiteSpace(url) ? null : url.Trim();
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageContent)]
    public async Task<IActionResult> Delete(int id)
    {
        var post = await db.SocialMediaPosts.FindAsync(id);
        if (post is null) return NotFound();
        db.SocialMediaPosts.Remove(post);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
