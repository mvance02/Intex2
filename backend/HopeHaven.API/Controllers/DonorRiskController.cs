using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/donor-risk")]
public class DonorRiskController(IWebHostEnvironment env, ILogger<DonorRiskController> logger)
    : ControllerBase
{
    private readonly string _scoresPath = Path.Combine(
        env.ContentRootPath, "Infrastructure", "donor_risk_scores.json");

    private static JsonObject? _cache;

    private JsonObject LoadScores()
    {
        if (_cache is not null) return _cache;

        if (!System.IO.File.Exists(_scoresPath))
        {
            logger.LogWarning("donor_risk_scores.json not found at {Path}", _scoresPath);
            throw new FileNotFoundException("Donor risk scores not found.", _scoresPath);
        }

        var json = System.IO.File.ReadAllText(_scoresPath);
        _cache = JsonNode.Parse(json)!.AsObject();
        return _cache;
    }

    /// <summary>GET /api/donor-risk/stats</summary>
    [HttpGet("stats")]
    public IActionResult GetStats()
    {
        try
        {
            var data = LoadScores();
            return Content(data["stats"]!.ToJsonString(), "application/json");
        }
        catch (FileNotFoundException ex)
        {
            return StatusCode(503, new { message = ex.Message });
        }
    }

    /// <summary>GET /api/donor-risk/all?tier=Critical&minRisk=0.5</summary>
    [HttpGet("all")]
    public IActionResult GetAll([FromQuery] string? tier, [FromQuery] double minRisk = 0.0)
    {
        try
        {
            var data = LoadScores();
            var donors = data["donors"]!.AsArray()
                .Select(d => d!.AsObject())
                .Where(d => (double?)d["churn_risk"] >= minRisk)
                .Where(d => tier == null || (string?)d["risk_tier"] == tier)
                .ToList();

            var result = new JsonObject
            {
                ["donors"] = new JsonArray(donors.Select(d => JsonNode.Parse(d.ToJsonString())).ToArray()),
                ["count"]  = donors.Count,
            };
            return Content(result.ToJsonString(), "application/json");
        }
        catch (FileNotFoundException ex)
        {
            return StatusCode(503, new { message = ex.Message });
        }
    }

    /// <summary>GET /api/donor-risk/health</summary>
    [HttpGet("health")]
    public IActionResult Health()
    {
        try
        {
            var data = LoadScores();
            var count = data["donors"]!.AsArray().Count;
            return Ok(new { status = "ok", donor_count = count });
        }
        catch (FileNotFoundException)
        {
            return StatusCode(503, new { status = "scores_not_found" });
        }
    }
}
