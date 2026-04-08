using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;

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

    /// <summary>
    /// POST /api/predict/social/draft
    /// Proxies social post features to the social donation ML service.
    /// </summary>
    [HttpPost("social/draft")]
    public async Task<IActionResult> PredictSocialDraft([FromBody] SocialDraftRequest request)
    {
        var body = JsonSerializer.Serialize(request);
        var result = await ForwardToSocialMl("/predict/draft", body);
        return result;
    }

    /// <summary>
    /// POST /api/predict/social/draft/sweep-hours
    /// Returns best posting hour recommendations for the same draft.
    /// </summary>
    [HttpPost("social/draft/sweep-hours")]
    public async Task<IActionResult> PredictSocialDraftSweepHours([FromBody] SocialDraftRequest request)
    {
        var body = JsonSerializer.Serialize(request);
        var result = await ForwardToSocialMl("/predict/draft/sweep-hours", body);
        return result;
    }

    /// <summary>
    /// GET /api/predict/social/model-info
    /// Returns social planner model metadata.
    /// </summary>
    [HttpGet("social/model-info")]
    public async Task<IActionResult> SocialModelInfo()
    {
        var client = httpClientFactory.CreateClient("MLSocialService");
        try
        {
            var response = await client.GetAsync("/model-info");
            var json = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, json);
            return Content(json, "application/json");
        }
        catch (HttpRequestException)
        {
            return StatusCode(503, new { message = "Social ML service is not reachable." });
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

    private async Task<IActionResult> ForwardToSocialMl(string path, string jsonBody)
    {
        var client = httpClientFactory.CreateClient("MLSocialService");
        using var content = new StringContent(jsonBody, System.Text.Encoding.UTF8, "application/json");

        try
        {
            var response = await client.PostAsync(path, content);
            var json = await response.Content.ReadAsStringAsync();
            if (response.StatusCode == HttpStatusCode.NotFound)
                return NotFound(new { message = "Social prediction route not found in ML service." });
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, json);
            return Content(json, "application/json");
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Social ML service unreachable for path {Path}", path);
            return StatusCode(503, new { message = "Social ML service is not reachable." });
        }
    }
}

public record BatchPredictRequest(int[] ResidentIds);
public record SocialDraftRequest(
    [property: JsonPropertyName("platform")] string Platform,
    [property: JsonPropertyName("day_of_week")] string DayOfWeek,
    [property: JsonPropertyName("post_hour")] int PostHour,
    [property: JsonPropertyName("post_type")] string PostType,
    [property: JsonPropertyName("media_type")] string MediaType,
    [property: JsonPropertyName("content_topic")] string ContentTopic,
    [property: JsonPropertyName("sentiment_tone")] string SentimentTone,
    [property: JsonPropertyName("num_hashtags")] int NumHashtags,
    [property: JsonPropertyName("mentions_count")] int MentionsCount,
    [property: JsonPropertyName("has_call_to_action")] bool HasCallToAction,
    [property: JsonPropertyName("call_to_action_type")] string CallToActionType,
    [property: JsonPropertyName("features_resident_story")] bool FeaturesResidentStory,
    [property: JsonPropertyName("caption_length")] int CaptionLength,
    [property: JsonPropertyName("is_boosted")] bool IsBoosted,
    [property: JsonPropertyName("boost_budget_php")] double BoostBudgetPhp
);
