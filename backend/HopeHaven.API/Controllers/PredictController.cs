using Microsoft.AspNetCore.Mvc;

namespace HopeHaven.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PredictController : ControllerBase
{
    // IS 455 — ML inference placeholder
    // Wire to Flask/FastAPI inference service once ML pipeline is ready
    // builder.Services.AddHttpClient("MLService", c => c.BaseAddress = new Uri(config["ML:BaseUrl"]!));

    [HttpPost("risk")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public IActionResult PredictRisk([FromBody] object payload)
    {
        // TODO (IS 455): Call ML service and return predicted risk level + confidence score
        // var client = httpClientFactory.CreateClient("MLService");
        // var result = await client.PostAsJsonAsync("/predict/risk", payload);
        return StatusCode(501, new { message = "ML risk prediction not yet implemented. Coming in IS 455." });
    }

    [HttpPost("reintegration")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public IActionResult PredictReintegration([FromBody] object payload)
    {
        // TODO (IS 455): Predict reintegration readiness score
        return StatusCode(501, new { message = "ML reintegration prediction not yet implemented. Coming in IS 455." });
    }

    [HttpPost("outcomes")]
    // [Authorize(Roles = "Admin,Staff")] // IS 414
    public IActionResult PredictOutcomes([FromBody] object payload)
    {
        // TODO (IS 455): Predict resident outcomes based on current indicators
        return StatusCode(501, new { message = "ML outcome prediction not yet implemented. Coming in IS 455." });
    }
}
