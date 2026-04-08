using Microsoft.AspNetCore.Mvc;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DonorRiskController(IHttpClientFactory httpClientFactory, ILogger<DonorRiskController> logger)
    : ControllerBase
{
    /// <summary>
    /// GET /api/donor-risk/stats
    /// Returns KPI summary: total donors, high-priority count, avg risk, tier breakdown.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var client = httpClientFactory.CreateClient("DonorRiskService");
        try
        {
            var response = await client.GetAsync("/donor-risk/stats");
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Donor risk service returned {Status}", response.StatusCode);
                return StatusCode(503, new { message = "Donor risk service returned an error." });
            }
            var json = await response.Content.ReadAsStringAsync();
            return Content(json, "application/json");
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Donor risk service unreachable");
            return StatusCode(503, new { message = "Donor risk service is not reachable. Run: uvicorn donor_retention_risk_api:app --port 8003" });
        }
    }

    /// <summary>
    /// GET /api/donor-risk/all?tier=Critical&minRisk=0.5
    /// Returns all scored donors, optionally filtered by tier and minimum risk score.
    /// </summary>
    [HttpGet("all")]
    public async Task<IActionResult> GetAll([FromQuery] string? tier, [FromQuery] double minRisk = 0.0)
    {
        var client = httpClientFactory.CreateClient("DonorRiskService");
        try
        {
            var query = $"/donor-risk/all?min_risk={minRisk}";
            if (!string.IsNullOrWhiteSpace(tier))
                query += $"&tier={Uri.EscapeDataString(tier)}";

            var response = await client.GetAsync(query);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Donor risk service returned {Status}", response.StatusCode);
                return StatusCode(503, new { message = "Donor risk service returned an error." });
            }
            var json = await response.Content.ReadAsStringAsync();
            return Content(json, "application/json");
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Donor risk service unreachable");
            return StatusCode(503, new { message = "Donor risk service is not reachable." });
        }
    }

    /// <summary>
    /// GET /api/donor-risk/health — check whether the donor risk sidecar is up.
    /// </summary>
    [HttpGet("health")]
    public async Task<IActionResult> Health()
    {
        var client = httpClientFactory.CreateClient("DonorRiskService");
        try
        {
            var response = await client.GetAsync("/health");
            var json = await response.Content.ReadAsStringAsync();
            return Content(json, "application/json");
        }
        catch (HttpRequestException)
        {
            return StatusCode(503, new { status = "Donor risk service unreachable" });
        }
    }
}
