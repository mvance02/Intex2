using HopeHaven.API.Data;
using HopeHaven.API.Models;
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
public class ReferralsController(
    HopeHavenDbContext db,
    ILogger<ReferralsController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ReferralResponse>> Submit(ReferralRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SubjectLocation))
            return BadRequest("Location is required.");
        if (string.IsNullOrWhiteSpace(request.Situation))
            return BadRequest("Situation description is required.");

        var refNumber = $"REF-{DateTimeOffset.UtcNow.ToUnixTimeSeconds():X}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}";

        var referral = new Referral
        {
            ReferenceNumber = refNumber,
            SubjectLocation = request.SubjectLocation,
            Situation = request.Situation,
            Urgency = request.Urgency ?? "Unknown",
            SubjectAge = request.SubjectAge,
            ReferrerName = request.Anonymous ? null : request.ReferrerName,
            ReferrerContact = request.Anonymous ? null : request.ReferrerContact,
            Anonymous = request.Anonymous,
            Status = "New",
            CreatedAt = DateTime.UtcNow
        };

        db.Referrals.Add(referral);
        await db.SaveChangesAsync();

        logger.LogInformation(
            "Referral {RefNumber} saved — location: {Location}, urgency: {Urgency}, anonymous: {Anonymous}",
            refNumber, request.SubjectLocation, request.Urgency, request.Anonymous);

        return Ok(new ReferralResponse(refNumber));
    }
}
