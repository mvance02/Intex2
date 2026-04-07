using CsvHelper;
using CsvHelper.Configuration;
using CsvHelper.TypeConversion;
using HopeHaven.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace HopeHaven.API.Data;

// ── Custom type converters ────────────────────────────────────────────────────

file sealed class DateOnlyConverter : DefaultTypeConverter
{
    public override object? ConvertFromString(string? text, IReaderRow row, MemberMapData memberMapData)
        => DateOnly.TryParse(text, out var d) ? d : (DateOnly?)null;
}

file sealed class NullableDateTimeUtcConverter : DefaultTypeConverter
{
    public override object? ConvertFromString(string? text, IReaderRow row, MemberMapData memberMapData)
        => DateTime.TryParse(text, out var dt) ? DateTime.SpecifyKind(dt, DateTimeKind.Utc) : (DateTime?)null;
}

file sealed class TruthyBoolConverter : DefaultTypeConverter
{
    public override object? ConvertFromString(string? text, IReaderRow row, MemberMapData memberMapData)
        => text?.Trim().ToLowerInvariant() is "true" or "1" or "yes";
}

file sealed class NullableIntFromDoubleConverter : DefaultTypeConverter
{
    public override object? ConvertFromString(string? text, IReaderRow row, MemberMapData memberMapData)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        return double.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out var d)
            ? (int?)((int)d)
            : null;
    }
}

file sealed class NullIfEmptyStringConverter : DefaultTypeConverter
{
    public override object? ConvertFromString(string? text, IReaderRow row, MemberMapData memberMapData)
        => string.IsNullOrWhiteSpace(text) ? null : text.Trim();
}

// ── Seeder ────────────────────────────────────────────────────────────────────

public static class SeedData
{
    public static async Task SeedAsync(HopeHavenDbContext db, string csvPath)
    {
        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            MissingFieldFound = null,
            BadDataFound = null,
            PrepareHeaderForMatch = args => args.Header.Replace("_", "").ToLowerInvariant(),
        };

        // Seed in FK-safe order
        await Seed<Safehouse>(db, db.Safehouses, Path.Combine(csvPath, "safehouses.csv"), config);
        await Seed<Supporter>(db, db.Supporters, Path.Combine(csvPath, "supporters.csv"), config);
        await Seed<Partner>(db, db.Partners, Path.Combine(csvPath, "partners.csv"), config);
        await Seed<SocialMediaPost>(db, db.SocialMediaPosts, Path.Combine(csvPath, "social_media_posts.csv"), config);
        await Seed<PublicImpactSnapshot>(db, db.PublicImpactSnapshots, Path.Combine(csvPath, "public_impact_snapshots.csv"), config);
        await Seed<Donation>(db, db.Donations, Path.Combine(csvPath, "donations.csv"), config);
        await Seed<PartnerAssignment>(db, db.PartnerAssignments, Path.Combine(csvPath, "partner_assignments.csv"), config);
        await Seed<SafehouseMonthlyMetric>(db, db.SafehouseMonthlyMetrics, Path.Combine(csvPath, "safehouse_monthly_metrics.csv"), config);
        await Seed<DonationAllocation>(db, db.DonationAllocations, Path.Combine(csvPath, "donation_allocations.csv"), config);
        await Seed<InKindDonationItem>(db, db.InKindDonationItems, Path.Combine(csvPath, "in_kind_donation_items.csv"), config);
        await Seed<Resident>(db, db.Residents, Path.Combine(csvPath, "residents.csv"), config);
        await Seed<ProcessRecording>(db, db.ProcessRecordings, Path.Combine(csvPath, "process_recordings.csv"), config);
        await Seed<HomeVisitation>(db, db.HomeVisitations, Path.Combine(csvPath, "home_visitations.csv"), config);
        await Seed<IncidentReport>(db, db.IncidentReports, Path.Combine(csvPath, "incident_reports.csv"), config);
        await Seed<InterventionPlan>(db, db.InterventionPlans, Path.Combine(csvPath, "intervention_plans.csv"), config);
        await Seed<HealthWellbeingRecord>(db, db.HealthWellbeingRecords, Path.Combine(csvPath, "health_wellbeing_records.csv"), config);
        await Seed<EducationRecord>(db, db.EducationRecords, Path.Combine(csvPath, "education_records.csv"), config);
    }

    private static async Task Seed<T>(
        HopeHavenDbContext db,
        DbSet<T> dbSet,
        string filePath,
        CsvConfiguration config) where T : class
    {
        if (await dbSet.AnyAsync()) return;
        if (!File.Exists(filePath))
        {
            Console.WriteLine($"[Seed] CSV not found: {filePath}");
            return;
        }

        using var reader = new StreamReader(filePath);
        using var csv = new CsvReader(reader, config);
        csv.Context.TypeConverterCache.AddConverter<DateOnly>(new DateOnlyConverter());
        csv.Context.TypeConverterCache.AddConverter<DateOnly?>(new DateOnlyConverter());
        csv.Context.TypeConverterCache.AddConverter<DateTime?>(new NullableDateTimeUtcConverter());
        csv.Context.TypeConverterCache.AddConverter<bool>(new TruthyBoolConverter());
        csv.Context.TypeConverterCache.AddConverter<int?>(new NullableIntFromDoubleConverter());
        csv.Context.TypeConverterCache.AddConverter<string>(new NullIfEmptyStringConverter());
        var records = csv.GetRecords<T>().ToList();
        await dbSet.AddRangeAsync(records);
        await db.SaveChangesAsync();
        Console.WriteLine($"[Seed] {typeof(T).Name}: {records.Count} rows");
    }
}
