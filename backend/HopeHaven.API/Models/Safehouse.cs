using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HopeHaven.API.Models;

[Table("safehouses")]
public class Safehouse
{
    [Key]
    [Column("safehouse_id")]
    public int SafehouseId { get; set; }

    [Column("safehouse_code")]
    [MaxLength(20)]
    public string? SafehouseCode { get; set; }

    [Column("name")]
    [MaxLength(200)]
    public string? Name { get; set; }

    [Column("region")]
    [MaxLength(100)]
    public string? Region { get; set; }

    [Column("city")]
    [MaxLength(100)]
    public string? City { get; set; }

    [Column("province")]
    [MaxLength(100)]
    public string? Province { get; set; }

    [Column("country")]
    [MaxLength(100)]
    public string? Country { get; set; }

    [Column("open_date")]
    public DateOnly? OpenDate { get; set; }

    [Column("status")]
    [MaxLength(50)]
    public string? Status { get; set; }

    [Column("capacity_girls")]
    public int? CapacityGirls { get; set; }

    [Column("capacity_staff")]
    public int? CapacityStaff { get; set; }

    [Column("current_occupancy")]
    public int? CurrentOccupancy { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    // Navigation
    public ICollection<Resident> Residents { get; set; } = [];
    public ICollection<DonationAllocation> DonationAllocations { get; set; } = [];
    public ICollection<PartnerAssignment> PartnerAssignments { get; set; } = [];
    public ICollection<IncidentReport> IncidentReports { get; set; } = [];
    public ICollection<SafehouseMonthlyMetric> MonthlyMetrics { get; set; } = [];
}
