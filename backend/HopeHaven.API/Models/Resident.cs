using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HopeHaven.API.Models;

[Table("residents")]
public class Resident
{
    [Key]
    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("case_control_no")]
    [Required]
    [MaxLength(50)]
    public string? CaseControlNo { get; set; }

    [Column("internal_code")]
    [MaxLength(50)]
    public string? InternalCode { get; set; }

    [Column("safehouse_id")]
    public int? SafehouseId { get; set; }

    [Column("case_status")]
    [MaxLength(50)]
    public string? CaseStatus { get; set; }

    [Column("sex")]
    [MaxLength(10)]
    public string? Sex { get; set; }

    [Column("date_of_birth")]
    public DateOnly? DateOfBirth { get; set; }

    [Column("birth_status")]
    [MaxLength(50)]
    public string? BirthStatus { get; set; }

    [Column("place_of_birth")]
    [MaxLength(200)]
    public string? PlaceOfBirth { get; set; }

    [Column("religion")]
    [MaxLength(100)]
    public string? Religion { get; set; }

    [Column("case_category")]
    [MaxLength(100)]
    public string? CaseCategory { get; set; }

    // Sub-categories
    [Column("sub_cat_orphaned")]
    public bool SubCatOrphaned { get; set; }

    [Column("sub_cat_trafficked")]
    public bool SubCatTrafficked { get; set; }

    [Column("sub_cat_child_labor")]
    public bool SubCatChildLabor { get; set; }

    [Column("sub_cat_physical_abuse")]
    public bool SubCatPhysicalAbuse { get; set; }

    [Column("sub_cat_sexual_abuse")]
    public bool SubCatSexualAbuse { get; set; }

    [Column("sub_cat_osaec")]
    public bool SubCatOsaec { get; set; }

    [Column("sub_cat_cicl")]
    public bool SubCatCicl { get; set; }

    [Column("sub_cat_at_risk")]
    public bool SubCatAtRisk { get; set; }

    [Column("sub_cat_street_child")]
    public bool SubCatStreetChild { get; set; }

    [Column("sub_cat_child_with_hiv")]
    public bool SubCatChildWithHiv { get; set; }

    // Disability
    [Column("is_pwd")]
    public bool IsPwd { get; set; }

    [Column("pwd_type")]
    [MaxLength(100)]
    public string? PwdType { get; set; }

    [Column("has_special_needs")]
    public bool HasSpecialNeeds { get; set; }

    [Column("special_needs_diagnosis")]
    [MaxLength(200)]
    public string? SpecialNeedsDiagnosis { get; set; }

    // Family socio-demographic
    [Column("family_is_4ps")]
    public bool FamilyIs4Ps { get; set; }

    [Column("family_solo_parent")]
    public bool FamilySoloParent { get; set; }

    [Column("family_indigenous")]
    public bool FamilyIndigenous { get; set; }

    [Column("family_parent_pwd")]
    public bool FamilyParentPwd { get; set; }

    [Column("family_informal_settler")]
    public bool FamilyInformalSettler { get; set; }

    // Admission
    [Column("date_of_admission")]
    public DateOnly? DateOfAdmission { get; set; }

    [Column("age_upon_admission")]
    [MaxLength(50)]
    public string? AgeUponAdmission { get; set; }

    [Column("present_age")]
    [MaxLength(50)]
    public string? PresentAge { get; set; }

    [Column("length_of_stay")]
    [MaxLength(50)]
    public string? LengthOfStay { get; set; }

    [Column("referral_source")]
    [MaxLength(100)]
    public string? ReferralSource { get; set; }

    [Column("referring_agency_person")]
    [MaxLength(200)]
    public string? ReferringAgencyPerson { get; set; }

    [Column("date_colb_registered")]
    public DateOnly? DateColbRegistered { get; set; }

    [Column("date_colb_obtained")]
    public DateOnly? DateColbObtained { get; set; }

    [Column("assigned_social_worker")]
    [MaxLength(50)]
    public string? AssignedSocialWorker { get; set; }

    [Column("initial_case_assessment")]
    [MaxLength(200)]
    public string? InitialCaseAssessment { get; set; }

    [Column("date_case_study_prepared")]
    public DateOnly? DateCaseStudyPrepared { get; set; }

    // Reintegration
    [Column("reintegration_type")]
    [MaxLength(100)]
    public string? ReintegrationType { get; set; }

    [Column("reintegration_status")]
    [MaxLength(50)]
    public string? ReintegrationStatus { get; set; }

    [Column("initial_risk_level")]
    [MaxLength(50)]
    public string? InitialRiskLevel { get; set; }

    [Column("current_risk_level")]
    [MaxLength(50)]
    public string? CurrentRiskLevel { get; set; }

    [Column("date_enrolled")]
    public DateOnly? DateEnrolled { get; set; }

    [Column("date_closed")]
    public DateOnly? DateClosed { get; set; }

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("notes_restricted")]
    public string? NotesRestricted { get; set; }

    // Navigation
    [ForeignKey(nameof(SafehouseId))]
    public Safehouse? Safehouse { get; set; }
    public ICollection<ProcessRecording> ProcessRecordings { get; set; } = [];
    public ICollection<HomeVisitation> HomeVisitations { get; set; } = [];
    public ICollection<IncidentReport> IncidentReports { get; set; } = [];
    public ICollection<InterventionPlan> InterventionPlans { get; set; } = [];
    public ICollection<HealthWellbeingRecord> HealthRecords { get; set; } = [];
    public ICollection<EducationRecord> EducationRecords { get; set; } = [];
}
