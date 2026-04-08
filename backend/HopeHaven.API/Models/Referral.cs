using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HopeHaven.API.Models;

[Table("referrals")]
public class Referral
{
    [Key]
    [Column("referral_id")]
    public int ReferralId { get; set; }

    [Column("reference_number")]
    [Required]
    [MaxLength(30)]
    public string ReferenceNumber { get; set; } = string.Empty;

    [Column("subject_location")]
    [Required]
    [MaxLength(500)]
    public string SubjectLocation { get; set; } = string.Empty;

    [Column("situation")]
    [Required]
    public string Situation { get; set; } = string.Empty;

    [Column("urgency")]
    [MaxLength(50)]
    public string? Urgency { get; set; }

    [Column("subject_age")]
    [MaxLength(50)]
    public string? SubjectAge { get; set; }

    [Column("referrer_name")]
    [MaxLength(200)]
    public string? ReferrerName { get; set; }

    [Column("referrer_contact")]
    [MaxLength(200)]
    public string? ReferrerContact { get; set; }

    [Column("anonymous")]
    public bool Anonymous { get; set; }

    [Column("status")]
    [MaxLength(50)]
    public string Status { get; set; } = "New";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
