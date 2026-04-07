using Microsoft.AspNetCore.Mvc;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PredictController(IHttpClientFactory httpClientFactory, ILogger<PredictController> logger)
    : ControllerBase
{
    /// <summary>
    /// GET /api/predict/reintegration/{residentId}
    /// Proxies to the FastAPI ML sidecar and returns the readiness score + type prediction.
    /// Returns 503 if the ML service is unavailable so the UI can degrade gracefully.
    /// </summary>
    [HttpGet("reintegration/{residentId:int}")]
    public async Task<IActionResult> GetReintegrationPrediction(int residentId)
    {
        var client = httpClientFactory.CreateClient("MLService");
        try
        {
            // FastAPI endpoint: POST /predict/{resident_id}
            var response = await client.PostAsync($"/predict/{residentId}", content: null);

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                return NotFound(new { message = $"Resident {residentId} not found in ML service." });

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("ML service returned {Status} for resident {Id}", response.StatusCode, residentId);
                return StatusCode(503, new { message = "ML service returned an error. Check that the sidecar is running." });
            }

            var json = await response.Content.ReadAsStringAsync();
            return Content(json, "application/json");
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "ML service unreachable for resident {Id}", residentId);
            return StatusCode(503, new { message = "ML service is not reachable. Run: uvicorn api:app --port 8001 in ml-pipelines/." });
        }
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
}
