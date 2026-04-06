using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HopeHaven.API.Models;

[Table("donations")]
public class Donation
{
    [Key]
    [Column("donation_id")]
    public int DonationId { get; set; }

    [Column("supporter_id")]
    public int? SupporterId { get; set; }

    [Column("donation_type")]
    [MaxLength(50)]
    public string? DonationType { get; set; }

    [Column("donation_date")]
    public DateOnly? DonationDate { get; set; }

    [Column("is_recurring")]
    public bool IsRecurring { get; set; }

    [Column("campaign_name")]
    [MaxLength(200)]
    public string? CampaignName { get; set; }

    [Column("channel_source")]
    [MaxLength(100)]
    public string? ChannelSource { get; set; }

    [Column("currency_code")]
    [MaxLength(10)]
    public string? CurrencyCode { get; set; }

    [Column("amount")]
    public decimal? Amount { get; set; }

    [Column("estimated_value")]
    public decimal? EstimatedValue { get; set; }

    [Column("impact_unit")]
    [MaxLength(100)]
    public string? ImpactUnit { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("referral_post_id")]
    [MaxLength(100)]
    public string? ReferralPostId { get; set; }

    // Navigation
    [ForeignKey(nameof(SupporterId))]
    public Supporter? Supporter { get; set; }
    public ICollection<DonationAllocation> Allocations { get; set; } = [];
    public ICollection<InKindDonationItem> InKindItems { get; set; } = [];
}
