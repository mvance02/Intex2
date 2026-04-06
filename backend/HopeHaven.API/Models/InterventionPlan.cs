using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HopeHaven.API.Models;

[Table("intervention_plans")]
public class InterventionPlan
{
    [Key]
    [Column("plan_id")]
    public int PlanId { get; set; }

    [Column("resident_id")]
    public int? ResidentId { get; set; }

    [Column("plan_category")]
    [MaxLength(100)]
    public string? PlanCategory { get; set; }

    [Column("plan_description")]
    public string? PlanDescription { get; set; }

    [Column("services_provided")]
    [MaxLength(500)]
    public string? ServicesProvided { get; set; }

    [Column("target_value")]
    public double? TargetValue { get; set; }

    [Column("target_date")]
    public DateOnly? TargetDate { get; set; }

    [Column("status")]
    [MaxLength(50)]
    public string? Status { get; set; }

    [Column("case_conference_date")]
    public DateOnly? CaseConferenceDate { get; set; }

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    [ForeignKey(nameof(ResidentId))]
    public Resident? Resident { get; set; }
}
