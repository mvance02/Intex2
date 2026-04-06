using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HopeHaven.API.Models;

[Table("home_visitations")]
public class HomeVisitation
{
    [Key]
    [Column("visitation_id")]
    public int VisitationId { get; set; }

    [Column("resident_id")]
    public int? ResidentId { get; set; }

    [Column("visit_date")]
    public DateOnly? VisitDate { get; set; }

    [Column("social_worker")]
    [MaxLength(50)]
    public string? SocialWorker { get; set; }

    [Column("visit_type")]
    [MaxLength(100)]
    public string? VisitType { get; set; }

    [Column("location_visited")]
    [MaxLength(200)]
    public string? LocationVisited { get; set; }

    [Column("family_members_present")]
    [MaxLength(500)]
    public string? FamilyMembersPresent { get; set; }

    [Column("purpose")]
    [MaxLength(500)]
    public string? Purpose { get; set; }

    [Column("observations")]
    public string? Observations { get; set; }

    [Column("family_cooperation_level")]
    [MaxLength(50)]
    public string? FamilyCooperationLevel { get; set; }

    [Column("safety_concerns_noted")]
    public bool SafetyConcernsNoted { get; set; }

    [Column("follow_up_needed")]
    public bool FollowUpNeeded { get; set; }

    [Column("follow_up_notes")]
    public string? FollowUpNotes { get; set; }

    [Column("visit_outcome")]
    [MaxLength(100)]
    public string? VisitOutcome { get; set; }

    // Navigation
    [ForeignKey(nameof(ResidentId))]
    public Resident? Resident { get; set; }
}
