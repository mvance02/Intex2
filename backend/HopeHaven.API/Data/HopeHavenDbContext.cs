using HopeHaven.API.Models;
using Microsoft.EntityFrameworkCore;

namespace HopeHaven.API.Data;

public class HopeHavenDbContext(DbContextOptions<HopeHavenDbContext> options) : DbContext(options)
{
    // Donor & Support Domain
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();

    // Case Management Domain
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();

    // Outreach & Communication Domain
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Decimal precision for monetary fields
        modelBuilder.Entity<Donation>(e =>
        {
            e.Property(d => d.Amount).HasPrecision(18, 2);
            e.Property(d => d.EstimatedValue).HasPrecision(18, 2);
        });

        modelBuilder.Entity<DonationAllocation>(e =>
            e.Property(d => d.AmountAllocated).HasPrecision(18, 2));

        modelBuilder.Entity<InKindDonationItem>(e =>
            e.Property(d => d.EstimatedUnitValue).HasPrecision(18, 2));

        modelBuilder.Entity<SocialMediaPost>(e =>
        {
            e.Property(d => d.BoostBudgetPhp).HasPrecision(18, 2);
            e.Property(d => d.EstimatedDonationValuePhp).HasPrecision(18, 2);
        });

        // No cascade delete on sensitive entities
        modelBuilder.Entity<Resident>()
            .HasOne(r => r.Safehouse)
            .WithMany(s => s.Residents)
            .HasForeignKey(r => r.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Donation>()
            .HasOne(d => d.Supporter)
            .WithMany(s => s.Donations)
            .HasForeignKey(d => d.SupporterId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
