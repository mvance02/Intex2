using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HopeHaven.API.Models;

[Table("process_recordings")]
public class ProcessRecording
{
    [Key]
    [Column("recording_id")]
    public int RecordingId { get; set; }

    [Column("resident_id")]
    public int? ResidentId { get; set; }

    [Column("session_date")]
    public DateOnly? SessionDate { get; set; }

    [Column("social_worker")]
    [MaxLength(50)]
    public string? SocialWorker { get; set; }

    [Column("session_type")]
    [MaxLength(50)]
    public string? SessionType { get; set; }

    [Column("session_duration_minutes")]
    public int? SessionDurationMinutes { get; set; }

    [Column("emotional_state_observed")]
    [MaxLength(100)]
    public string? EmotionalStateObserved { get; set; }

    [Column("emotional_state_end")]
    [MaxLength(100)]
    public string? EmotionalStateEnd { get; set; }

    [Column("session_narrative")]
    public string? SessionNarrative { get; set; }

    [Column("interventions_applied")]
    [MaxLength(200)]
    public string? InterventionsApplied { get; set; }

    [Column("follow_up_actions")]
    public string? FollowUpActions { get; set; }

    [Column("progress_noted")]
    public bool ProgressNoted { get; set; }

    [Column("concerns_flagged")]
    public bool ConcernsFlagged { get; set; }

    [Column("referral_made")]
    public bool ReferralMade { get; set; }

    [Column("notes_restricted")]
    public string? NotesRestricted { get; set; }

    // Navigation
    [ForeignKey(nameof(ResidentId))]
    public Resident? Resident { get; set; }
}
