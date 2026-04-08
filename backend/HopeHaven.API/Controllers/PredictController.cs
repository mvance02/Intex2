using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace HopeHaven.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
public class PredictController(
    IHttpClientFactory httpClientFactory,
    IMemoryCache cache,
    ILogger<PredictController> logger) : ControllerBase
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(30);

    /// <summary>
    /// GET /api/predict/reintegration/{residentId}
    /// Proxies to the FastAPI ML sidecar. Results cached 30 min.
    /// Returns 503 if the ML service is unavailable.
    /// </summary>
    [HttpGet("reintegration/{residentId:int}")]
    public async Task<IActionResult> GetReintegrationPrediction(int residentId)
    {
        var cacheKey = $"predict:reintegration:{residentId}";
        if (cache.TryGetValue(cacheKey, out string? cached))
            return Content(cached!, "application/json");

        var result = await FetchFromMl(residentId);
        if (result is null)
            return StatusCode(503, new { message = "ML service is not reachable." });
        if (result == "notfound")
            return NotFound(new { message = $"Resident {residentId} not found in ML service." });

        cache.Set(cacheKey, result, CacheTtl);
        return Content(result, "application/json");
    }

    /// <summary>
    /// POST /api/predict/reintegration/batch
    /// Body: { "residentIds": [1, 2, 3, ...] }
    /// Fetches all predictions in parallel. Cached results are returned immediately;
    /// uncached ones are fetched from the ML service concurrently.
    /// Returns a dictionary: { "1": { ... }, "2": null, ... }
    /// null means the ML service had no result for that ID.
    /// </summary>
    [HttpPost("reintegration/batch")]
    public async Task<IActionResult> GetBatchPredictions([FromBody] BatchPredictRequest request)
    {
        if (request.ResidentIds is null || request.ResidentIds.Length == 0)
            return BadRequest(new { message = "residentIds is required." });

        var tasks = request.ResidentIds.Select(async id =>
        {
            var cacheKey = $"predict:reintegration:{id}";
            if (cache.TryGetValue(cacheKey, out string? cached))
                return (id, json: cached!);

            var json = await FetchFromMl(id);
            if (json is not null && json != "notfound")
                cache.Set(cacheKey, json, CacheTtl);

            return (id, json);
        });

        var results = await Task.WhenAll(tasks);

        // Build a raw JSON object so we can embed the ML response strings as-is
        var sb = new System.Text.StringBuilder("{");
        var first = true;
        foreach (var (id, json) in results)
        {
            if (!first) sb.Append(',');
            first = false;
            sb.Append($"\"{id}\":");
            sb.Append(json is not null && json != "notfound" ? json : "null");
        }
        sb.Append('}');
        return Content(sb.ToString(), "application/json");
    }

    /// <summary>
    /// GET /api/predict/health — check whether the ML sidecar is up.
    /// </summary>
    [HttpGet("health")]
    public async Task<IActionResult> MlHealth()
    {
        var client = httpClientFactory.CreateClient("MLService");
        try
        {
            var response = await client.GetAsync("/health");
            var json = await response.Content.ReadAsStringAsync();
            return Content(json, "application/json");
        }
        catch (HttpRequestException)
        {
            return StatusCode(503, new { status = "ML service unreachable" });
        }
    }

    // Returns null on network error, "notfound" on 404, JSON string on success
    private async Task<string?> FetchFromMl(int residentId)
    {
        var client = httpClientFactory.CreateClient("MLService");
        try
        {
            var response = await client.PostAsync($"/predict/{residentId}", content: null);
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                return "notfound";
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("ML service returned {Status} for resident {Id}", response.StatusCode, residentId);
                return null;
            }
            return await response.Content.ReadAsStringAsync();
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "ML service unreachable for resident {Id}", residentId);
            return null;
        }
    }
}

public record BatchPredictRequest(int[] ResidentIds);
