using Microsoft.AspNetCore.Mvc;

namespace HopeHaven.API.Controllers;

public record ReferralRequest(
    string SubjectLocation,
    string Situation,
    string Urgency,
    string? SubjectAge,
    string? ReferrerName,
    string? ReferrerContact,
    bool Anonymous
);

public record ReferralResponse(string ReferenceNumber);

[ApiController]
[Route("api/[controller]")]
public class ReferralsController(ILogger<ReferralsController> logger) : ControllerBase
{
    [HttpPost]
    public ActionResult<ReferralResponse> Submit(ReferralRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SubjectLocation))
            return BadRequest("Location is required.");
        if (string.IsNullOrWhiteSpace(request.Situation))
            return BadRequest("Situation description is required.");

        var refNumber = $"REF-{DateTimeOffset.UtcNow.ToUnixTimeSeconds():X}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}";

        logger.LogInformation(
            "Referral {RefNumber} received — location: {Location}, urgency: {Urgency}, anonymous: {Anonymous}",
            refNumber, request.SubjectLocation, request.Urgency, request.Anonymous);

        // IS 414/455: wire to email notification or case management intake here
        return Ok(new ReferralResponse(refNumber));
    }
}
