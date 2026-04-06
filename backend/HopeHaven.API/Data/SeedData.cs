using CsvHelper;
using CsvHelper.Configuration;
using CsvHelper.TypeConversion;
using HopeHaven.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace HopeHaven.API.Data;

public static class SeedData
{
    public static async Task SeedAsync(HopeHavenDbContext db, string csvPath)
    {
        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            MissingFieldFound = null,
            BadDataFound = null,
            PrepareHeaderForMatch = args =>
                args.Header.Replace("_", "").ToLowerInvariant(),
        };

        // Seed in FK-safe order
        await SeedTable(db, db.Safehouses, Path.Combine(csvPath, "safehouses.csv"), config, ParseSafehouse);
        await SeedTable(db, db.Supporters, Path.Combine(csvPath, "supporters.csv"), config, ParseSupporter);
        await SeedTable(db, db.Partners, Path.Combine(csvPath, "partners.csv"), config, ParsePartner);
        await SeedTable(db, db.SocialMediaPosts, Path.Combine(csvPath, "social_media_posts.csv"), config, ParseSocialMediaPost);
        await SeedTable(db, db.PublicImpactSnapshots, Path.Combine(csvPath, "public_impact_snapshots.csv"), config, ParsePublicImpactSnapshot);
        await SeedTable(db, db.Donations, Path.Combine(csvPath, "donations.csv"), config, ParseDonation);
        await SeedTable(db, db.PartnerAssignments, Path.Combine(csvPath, "partner_assignments.csv"), config, ParsePartnerAssignment);
        await SeedTable(db, db.SafehouseMonthlyMetrics, Path.Combine(csvPath, "safehouse_monthly_metrics.csv"), config, ParseSafehouseMonthlyMetric);
        await SeedTable(db, db.DonationAllocations, Path.Combine(csvPath, "donation_allocations.csv"), config, ParseDonationAllocation);
        await SeedTable(db, db.InKindDonationItems, Path.Combine(csvPath, "in_kind_donation_items.csv"), config, ParseInKindDonationItem);
        await SeedTable(db, db.Residents, Path.Combine(csvPath, "residents.csv"), config, ParseResident);
        await SeedTable(db, db.ProcessRecordings, Path.Combine(csvPath, "process_recordings.csv"), config, ParseProcessRecording);
        await SeedTable(db, db.HomeVisitations, Path.Combine(csvPath, "home_visitations.csv"), config, ParseHomeVisitation);
        await SeedTable(db, db.IncidentReports, Path.Combine(csvPath, "incident_reports.csv"), config, ParseIncidentReport);
        await SeedTable(db, db.InterventionPlans, Path.Combine(csvPath, "intervention_plans.csv"), config, ParseInterventionPlan);
        await SeedTable(db, db.HealthWellbeingRecords, Path.Combine(csvPath, "health_wellbeing_records.csv"), config, ParseHealthWellbeingRecord);
        await SeedTable(db, db.EducationRecords, Path.Combine(csvPath, "education_records.csv"), config, ParseEducationRecord);
    }

    // ── Generic seeder ────────────────────────────────────────────────────
    private static async Task SeedTable<T>(
        HopeHavenDbContext db,
        DbSet<T> dbSet,
        string filePath,
        CsvConfiguration config,
        Func<IReaderRow, T?> parser) where T : class
    {
        if (await dbSet.AnyAsync()) return;
        if (!File.Exists(filePath))
        {
            Console.WriteLine($"[Seed] CSV not found: {filePath}");
            return;
        }

        using var reader = new StreamReader(filePath);
        using var csv = new CsvReader(reader, config);

        csv.Read();
        csv.ReadHeader();

        var records = new List<T>();
        while (csv.Read())
        {
            var record = parser(csv);
            if (record is not null) records.Add(record);
        }

        await dbSet.AddRangeAsync(records);
        await db.SaveChangesAsync();
        Console.WriteLine($"[Seed] {typeof(T).Name}: {records.Count} rows");
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private static DateOnly? ParseDate(string? val) =>
        DateOnly.TryParse(val, out var d) ? d : null;

    private static DateTime? ParseDateTime(string? val) =>
        DateTime.TryParse(val, out var dt) ? DateTime.SpecifyKind(dt, DateTimeKind.Utc) : null;

    private static bool ParseBool(string? val) =>
        val?.Trim().ToLower() is "true" or "1" or "yes";

    private static int? ParseNullableInt(string? val)
    {
        if (string.IsNullOrWhiteSpace(val)) return null;
        // Handle float-formatted integers like "8.0"
        if (double.TryParse(val, NumberStyles.Any, CultureInfo.InvariantCulture, out var d))
            return (int)d;
        return null;
    }

    private static double? ParseNullableDouble(string? val) =>
        double.TryParse(val, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : null;

    private static decimal? ParseNullableDecimal(string? val) =>
        decimal.TryParse(val, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : null;

    private static string? NullIfEmpty(string? val) =>
        string.IsNullOrWhiteSpace(val) ? null : val.Trim();

    private static string? GetField(IReaderRow csv, string header)
    {
        try { return csv.GetField(header); }
        catch { return null; }
    }

    // ── Parsers ───────────────────────────────────────────────────────────

    private static Safehouse? ParseSafehouse(IReaderRow csv) => new()
    {
        SafehouseId = ParseNullableInt(GetField(csv, "safehouseid")) ?? 0,
        SafehouseCode = NullIfEmpty(GetField(csv, "safehousecode")),
        Name = NullIfEmpty(GetField(csv, "name")),
        Region = NullIfEmpty(GetField(csv, "region")),
        City = NullIfEmpty(GetField(csv, "city")),
        Province = NullIfEmpty(GetField(csv, "province")),
        Country = NullIfEmpty(GetField(csv, "country")),
        OpenDate = ParseDate(GetField(csv, "opendate")),
        Status = NullIfEmpty(GetField(csv, "status")),
        CapacityGirls = ParseNullableInt(GetField(csv, "capacitygirls")),
        CapacityStaff = ParseNullableInt(GetField(csv, "capacitystaff")),
        CurrentOccupancy = ParseNullableInt(GetField(csv, "currentoccupancy")),
        Notes = NullIfEmpty(GetField(csv, "notes")),
    };

    private static Supporter? ParseSupporter(IReaderRow csv) => new()
    {
        SupporterId = ParseNullableInt(GetField(csv, "supporterid")) ?? 0,
        SupporterType = NullIfEmpty(GetField(csv, "supportertype")),
        DisplayName = NullIfEmpty(GetField(csv, "displayname")),
        OrganizationName = NullIfEmpty(GetField(csv, "organizationname")),
        FirstName = NullIfEmpty(GetField(csv, "firstname")),
        LastName = NullIfEmpty(GetField(csv, "lastname")),
        RelationshipType = NullIfEmpty(GetField(csv, "relationshiptype")),
        Region = NullIfEmpty(GetField(csv, "region")),
        Country = NullIfEmpty(GetField(csv, "country")),
        Email = NullIfEmpty(GetField(csv, "email")),
        Phone = NullIfEmpty(GetField(csv, "phone")),
        Status = NullIfEmpty(GetField(csv, "status")),
        CreatedAt = ParseDateTime(GetField(csv, "createdat")),
        FirstDonationDate = ParseDate(GetField(csv, "firstdonationdate")),
        AcquisitionChannel = NullIfEmpty(GetField(csv, "acquisitionchannel")),
    };

    private static Partner? ParsePartner(IReaderRow csv) => new()
    {
        PartnerId = ParseNullableInt(GetField(csv, "partnerid")) ?? 0,
        PartnerName = NullIfEmpty(GetField(csv, "partnername")),
        PartnerType = NullIfEmpty(GetField(csv, "partnertype")),
        RoleType = NullIfEmpty(GetField(csv, "roletype")),
        ContactName = NullIfEmpty(GetField(csv, "contactname")),
        Email = NullIfEmpty(GetField(csv, "email")),
        Phone = NullIfEmpty(GetField(csv, "phone")),
        Region = NullIfEmpty(GetField(csv, "region")),
        Status = NullIfEmpty(GetField(csv, "status")),
        StartDate = ParseDate(GetField(csv, "startdate")),
        EndDate = ParseDate(GetField(csv, "enddate")),
        Notes = NullIfEmpty(GetField(csv, "notes")),
    };

    private static Donation? ParseDonation(IReaderRow csv) => new()
    {
        DonationId = ParseNullableInt(GetField(csv, "donationid")) ?? 0,
        SupporterId = ParseNullableInt(GetField(csv, "supporterid")),
        DonationType = NullIfEmpty(GetField(csv, "donationtype")),
        DonationDate = ParseDate(GetField(csv, "donationdate")),
        IsRecurring = ParseBool(GetField(csv, "isrecurring")),
        CampaignName = NullIfEmpty(GetField(csv, "campaignname")),
        ChannelSource = NullIfEmpty(GetField(csv, "channelsource")),
        CurrencyCode = NullIfEmpty(GetField(csv, "currencycode")),
        Amount = ParseNullableDecimal(GetField(csv, "amount")),
        EstimatedValue = ParseNullableDecimal(GetField(csv, "estimatedvalue")),
        ImpactUnit = NullIfEmpty(GetField(csv, "impactunit")),
        Notes = NullIfEmpty(GetField(csv, "notes")),
        ReferralPostId = NullIfEmpty(GetField(csv, "referralpostid")),
    };

    private static DonationAllocation? ParseDonationAllocation(IReaderRow csv) => new()
    {
        AllocationId = ParseNullableInt(GetField(csv, "allocationid")) ?? 0,
        DonationId = ParseNullableInt(GetField(csv, "donationid")),
        SafehouseId = ParseNullableInt(GetField(csv, "safehouseid")),
        ProgramArea = NullIfEmpty(GetField(csv, "programarea")),
        AmountAllocated = ParseNullableDecimal(GetField(csv, "amountallocated")),
        AllocationDate = ParseDate(GetField(csv, "allocationdate")),
        AllocationNotes = NullIfEmpty(GetField(csv, "allocationnotes")),
    };

    private static InKindDonationItem? ParseInKindDonationItem(IReaderRow csv) => new()
    {
        ItemId = ParseNullableInt(GetField(csv, "itemid")) ?? 0,
        DonationId = ParseNullableInt(GetField(csv, "donationid")),
        ItemName = NullIfEmpty(GetField(csv, "itemname")),
        ItemCategory = NullIfEmpty(GetField(csv, "itemcategory")),
        Quantity = ParseNullableInt(GetField(csv, "quantity")),
        UnitOfMeasure = NullIfEmpty(GetField(csv, "unitofmeasure")),
        EstimatedUnitValue = ParseNullableDecimal(GetField(csv, "estimatedunitvalue")),
        IntendedUse = NullIfEmpty(GetField(csv, "intendeduse")),
        ReceivedCondition = NullIfEmpty(GetField(csv, "receivedcondition")),
    };

    private static PartnerAssignment? ParsePartnerAssignment(IReaderRow csv) => new()
    {
        AssignmentId = ParseNullableInt(GetField(csv, "assignmentid")) ?? 0,
        PartnerId = ParseNullableInt(GetField(csv, "partnerid")),
        SafehouseId = ParseNullableInt(GetField(csv, "safehouseid")), // handles "8.0" via ParseNullableInt
        ProgramArea = NullIfEmpty(GetField(csv, "programarea")),
        AssignmentStart = ParseDate(GetField(csv, "assignmentstart")),
        AssignmentEnd = ParseDate(GetField(csv, "assignmentend")),
        ResponsibilityNotes = NullIfEmpty(GetField(csv, "responsibilitynotes")),
        IsPrimary = ParseBool(GetField(csv, "isprimary")),
        Status = NullIfEmpty(GetField(csv, "status")),
    };

    private static Resident? ParseResident(IReaderRow csv) => new()
    {
        ResidentId = ParseNullableInt(GetField(csv, "residentid")) ?? 0,
        CaseControlNo = NullIfEmpty(GetField(csv, "casecontrolno")),
        InternalCode = NullIfEmpty(GetField(csv, "internalcode")),
        SafehouseId = ParseNullableInt(GetField(csv, "safehouseid")),
        CaseStatus = NullIfEmpty(GetField(csv, "casestatus")),
        Sex = NullIfEmpty(GetField(csv, "sex")),
        DateOfBirth = ParseDate(GetField(csv, "dateofbirth")),
        BirthStatus = NullIfEmpty(GetField(csv, "birthstatus")),
        PlaceOfBirth = NullIfEmpty(GetField(csv, "placeofbirth")),
        Religion = NullIfEmpty(GetField(csv, "religion")),
        CaseCategory = NullIfEmpty(GetField(csv, "casecategory")),
        SubCatOrphaned = ParseBool(GetField(csv, "subcatorphaned")),
        SubCatTrafficked = ParseBool(GetField(csv, "subcattrafficked")),
        SubCatChildLabor = ParseBool(GetField(csv, "subcatchildlabor")),
        SubCatPhysicalAbuse = ParseBool(GetField(csv, "subcatphysicalabuse")),
        SubCatSexualAbuse = ParseBool(GetField(csv, "subcatsexualabuse")),
        SubCatOsaec = ParseBool(GetField(csv, "subcatosaec")),
        SubCatCicl = ParseBool(GetField(csv, "subcatcicl")),
        SubCatAtRisk = ParseBool(GetField(csv, "subcatatrisk")),
        SubCatStreetChild = ParseBool(GetField(csv, "subcatstreetchild")),
        SubCatChildWithHiv = ParseBool(GetField(csv, "subcatchildwithhiv")),
        IsPwd = ParseBool(GetField(csv, "ispwd")),
        PwdType = NullIfEmpty(GetField(csv, "pwdtype")),
        HasSpecialNeeds = ParseBool(GetField(csv, "hasspecialneeds")),
        SpecialNeedsDiagnosis = NullIfEmpty(GetField(csv, "specialneedsdiagnosis")),
        FamilyIs4Ps = ParseBool(GetField(csv, "familyis4ps")),
        FamilySoloParent = ParseBool(GetField(csv, "familysoloparent")),
        FamilyIndigenous = ParseBool(GetField(csv, "familyindigenous")),
        FamilyParentPwd = ParseBool(GetField(csv, "familyparentpwd")),
        FamilyInformalSettler = ParseBool(GetField(csv, "familyinformalsettler")),
        DateOfAdmission = ParseDate(GetField(csv, "dateofadmission")),
        AgeUponAdmission = NullIfEmpty(GetField(csv, "ageuponadmission")),
        PresentAge = NullIfEmpty(GetField(csv, "presentage")),
        LengthOfStay = NullIfEmpty(GetField(csv, "lengthofstay")),
        ReferralSource = NullIfEmpty(GetField(csv, "referralsource")),
        ReferringAgencyPerson = NullIfEmpty(GetField(csv, "referringagencyperson")),
        DateColbRegistered = ParseDate(GetField(csv, "datecolbregistered")),
        DateColbObtained = ParseDate(GetField(csv, "datecolbobtained")),
        AssignedSocialWorker = NullIfEmpty(GetField(csv, "assignedsocialworker")),
        InitialCaseAssessment = NullIfEmpty(GetField(csv, "initialcaseassessment")),
        DateCaseStudyPrepared = ParseDate(GetField(csv, "datecasestudyprepared")),
        ReintegrationType = NullIfEmpty(GetField(csv, "reintegrationtype")),
        ReintegrationStatus = NullIfEmpty(GetField(csv, "reintegrationstatus")),
        InitialRiskLevel = NullIfEmpty(GetField(csv, "initialrisklevel")),
        CurrentRiskLevel = NullIfEmpty(GetField(csv, "currentrisklevel")),
        DateEnrolled = ParseDate(GetField(csv, "dateenrolled")),
        DateClosed = ParseDate(GetField(csv, "dateclosed")),
        CreatedAt = ParseDateTime(GetField(csv, "createdat")),
        NotesRestricted = NullIfEmpty(GetField(csv, "notesrestricted")),
    };

    private static ProcessRecording? ParseProcessRecording(IReaderRow csv) => new()
    {
        RecordingId = ParseNullableInt(GetField(csv, "recordingid")) ?? 0,
        ResidentId = ParseNullableInt(GetField(csv, "residentid")),
        SessionDate = ParseDate(GetField(csv, "sessiondate")),
        SocialWorker = NullIfEmpty(GetField(csv, "socialworker")),
        SessionType = NullIfEmpty(GetField(csv, "sessiontype")),
        SessionDurationMinutes = ParseNullableInt(GetField(csv, "sessiondurationminutes")),
        EmotionalStateObserved = NullIfEmpty(GetField(csv, "emotionalstateobserved")),
        EmotionalStateEnd = NullIfEmpty(GetField(csv, "emotionalstateend")),
        SessionNarrative = NullIfEmpty(GetField(csv, "sessionnarrative")),
        InterventionsApplied = NullIfEmpty(GetField(csv, "interventionsapplied")),
        FollowUpActions = NullIfEmpty(GetField(csv, "followupactions")),
        ProgressNoted = ParseBool(GetField(csv, "progressnoted")),
        ConcernsFlagged = ParseBool(GetField(csv, "concernsflagged")),
        ReferralMade = ParseBool(GetField(csv, "referralmade")),
        NotesRestricted = NullIfEmpty(GetField(csv, "notesrestricted")),
    };

    private static HomeVisitation? ParseHomeVisitation(IReaderRow csv) => new()
    {
        VisitationId = ParseNullableInt(GetField(csv, "visitationid")) ?? 0,
        ResidentId = ParseNullableInt(GetField(csv, "residentid")),
        VisitDate = ParseDate(GetField(csv, "visitdate")),
        SocialWorker = NullIfEmpty(GetField(csv, "socialworker")),
        VisitType = NullIfEmpty(GetField(csv, "visittype")),
        LocationVisited = NullIfEmpty(GetField(csv, "locationvisited")),
        FamilyMembersPresent = NullIfEmpty(GetField(csv, "familymemberspresent")),
        Purpose = NullIfEmpty(GetField(csv, "purpose")),
        Observations = NullIfEmpty(GetField(csv, "observations")),
        FamilyCooperationLevel = NullIfEmpty(GetField(csv, "familycooperationlevel")),
        SafetyConcernsNoted = ParseBool(GetField(csv, "safetyconcernsnoted")),
        FollowUpNeeded = ParseBool(GetField(csv, "followupneeded")),
        FollowUpNotes = NullIfEmpty(GetField(csv, "followupnotes")),
        VisitOutcome = NullIfEmpty(GetField(csv, "visitoutcome")),
    };

    private static IncidentReport? ParseIncidentReport(IReaderRow csv) => new()
    {
        IncidentId = ParseNullableInt(GetField(csv, "incidentid")) ?? 0,
        ResidentId = ParseNullableInt(GetField(csv, "residentid")),
        SafehouseId = ParseNullableInt(GetField(csv, "safehouseid")),
        IncidentDate = ParseDate(GetField(csv, "incidentdate")),
        IncidentType = NullIfEmpty(GetField(csv, "incidenttype")),
        Severity = NullIfEmpty(GetField(csv, "severity")),
        Description = NullIfEmpty(GetField(csv, "description")),
        ResponseTaken = NullIfEmpty(GetField(csv, "responsetaken")),
        Resolved = ParseBool(GetField(csv, "resolved")),
        ResolutionDate = ParseDate(GetField(csv, "resolutiondate")),
        ReportedBy = NullIfEmpty(GetField(csv, "reportedby")),
        FollowUpRequired = ParseBool(GetField(csv, "followuprequired")),
    };

    private static InterventionPlan? ParseInterventionPlan(IReaderRow csv) => new()
    {
        PlanId = ParseNullableInt(GetField(csv, "planid")) ?? 0,
        ResidentId = ParseNullableInt(GetField(csv, "residentid")),
        PlanCategory = NullIfEmpty(GetField(csv, "plancategory")),
        PlanDescription = NullIfEmpty(GetField(csv, "plandescription")),
        ServicesProvided = NullIfEmpty(GetField(csv, "servicesprovided")),
        TargetValue = ParseNullableDouble(GetField(csv, "targetvalue")),
        TargetDate = ParseDate(GetField(csv, "targetdate")),
        Status = NullIfEmpty(GetField(csv, "status")),
        CaseConferenceDate = ParseDate(GetField(csv, "caseconferencedate")),
        CreatedAt = ParseDateTime(GetField(csv, "createdat")),
        UpdatedAt = ParseDateTime(GetField(csv, "updatedat")),
    };

    private static HealthWellbeingRecord? ParseHealthWellbeingRecord(IReaderRow csv) => new()
    {
        HealthRecordId = ParseNullableInt(GetField(csv, "healthrecordid")) ?? 0,
        ResidentId = ParseNullableInt(GetField(csv, "residentid")),
        RecordDate = ParseDate(GetField(csv, "recorddate")),
        GeneralHealthScore = ParseNullableDouble(GetField(csv, "generalhealthscore")),
        NutritionScore = ParseNullableDouble(GetField(csv, "nutritionscore")),
        SleepQualityScore = ParseNullableDouble(GetField(csv, "sleepqualityscore")),
        EnergyLevelScore = ParseNullableDouble(GetField(csv, "energylevelscore")),
        HeightCm = ParseNullableDouble(GetField(csv, "heightcm")),
        WeightKg = ParseNullableDouble(GetField(csv, "weightkg")),
        Bmi = ParseNullableDouble(GetField(csv, "bmi")),
        MedicalCheckupDone = ParseBool(GetField(csv, "medicalcheckupdone")),
        DentalCheckupDone = ParseBool(GetField(csv, "dentalcheckupdone")),
        PsychologicalCheckupDone = ParseBool(GetField(csv, "psychologicalcheckupdone")),
        Notes = NullIfEmpty(GetField(csv, "notes")),
    };

    private static EducationRecord? ParseEducationRecord(IReaderRow csv) => new()
    {
        EducationRecordId = ParseNullableInt(GetField(csv, "educationrecordid")) ?? 0,
        ResidentId = ParseNullableInt(GetField(csv, "residentid")),
        RecordDate = ParseDate(GetField(csv, "recorddate")),
        EducationLevel = NullIfEmpty(GetField(csv, "educationlevel")),
        SchoolName = NullIfEmpty(GetField(csv, "schoolname")),
        EnrollmentStatus = NullIfEmpty(GetField(csv, "enrollmentstatus")),
        AttendanceRate = ParseNullableDouble(GetField(csv, "attendancerate")),
        ProgressPercent = ParseNullableDouble(GetField(csv, "progresspercent")),
        CompletionStatus = NullIfEmpty(GetField(csv, "completionstatus")),
        Notes = NullIfEmpty(GetField(csv, "notes")),
    };

    private static SafehouseMonthlyMetric? ParseSafehouseMonthlyMetric(IReaderRow csv) => new()
    {
        MetricId = ParseNullableInt(GetField(csv, "metricid")) ?? 0,
        SafehouseId = ParseNullableInt(GetField(csv, "safehouseid")),
        MonthStart = ParseDate(GetField(csv, "monthstart")),
        MonthEnd = ParseDate(GetField(csv, "monthend")),
        ActiveResidents = ParseNullableInt(GetField(csv, "activeresidents")),
        AvgEducationProgress = ParseNullableDouble(GetField(csv, "avgeducationprogress")),
        AvgHealthScore = ParseNullableDouble(GetField(csv, "avghealthscore")),
        ProcessRecordingCount = ParseNullableInt(GetField(csv, "processrecordingcount")),
        HomeVisitationCount = ParseNullableInt(GetField(csv, "homevisitationcount")),
        IncidentCount = ParseNullableInt(GetField(csv, "incidentcount")),
        Notes = NullIfEmpty(GetField(csv, "notes")),
    };

    private static PublicImpactSnapshot? ParsePublicImpactSnapshot(IReaderRow csv) => new()
    {
        SnapshotId = ParseNullableInt(GetField(csv, "snapshotid")) ?? 0,
        SnapshotDate = ParseDate(GetField(csv, "snapshotdate")),
        Headline = NullIfEmpty(GetField(csv, "headline")),
        SummaryText = NullIfEmpty(GetField(csv, "summarytext")),
        MetricPayloadJson = NullIfEmpty(GetField(csv, "metricpayloadjson")),
        IsPublished = ParseBool(GetField(csv, "ispublished")),
        PublishedAt = ParseDate(GetField(csv, "publishedat")),
    };

    private static SocialMediaPost? ParseSocialMediaPost(IReaderRow csv) => new()
    {
        PostId = ParseNullableInt(GetField(csv, "postid")) ?? 0,
        Platform = NullIfEmpty(GetField(csv, "platform")),
        PlatformPostId = NullIfEmpty(GetField(csv, "platformpostid")),
        PostUrl = NullIfEmpty(GetField(csv, "posturl")),
        CreatedAt = ParseDateTime(GetField(csv, "createdat")),
        DayOfWeek = NullIfEmpty(GetField(csv, "dayofweek")),
        PostHour = ParseNullableInt(GetField(csv, "posthour")),
        PostType = NullIfEmpty(GetField(csv, "posttype")),
        MediaType = NullIfEmpty(GetField(csv, "mediatype")),
        Caption = NullIfEmpty(GetField(csv, "caption")),
        Hashtags = NullIfEmpty(GetField(csv, "hashtags")),
        NumHashtags = ParseNullableInt(GetField(csv, "numhashtags")),
        MentionsCount = ParseNullableInt(GetField(csv, "mentionscount")),
        HasCallToAction = ParseBool(GetField(csv, "hascalltoaction")),
        CallToActionType = NullIfEmpty(GetField(csv, "calltoactiontype")),
        ContentTopic = NullIfEmpty(GetField(csv, "contenttopic")),
        SentimentTone = NullIfEmpty(GetField(csv, "sentimenttone")),
        CaptionLength = ParseNullableInt(GetField(csv, "captionlength")),
        FeaturesResidentStory = ParseBool(GetField(csv, "featuresresidentstory")),
        CampaignName = NullIfEmpty(GetField(csv, "campaignname")),
        IsBoosted = ParseBool(GetField(csv, "isboosted")),
        BoostBudgetPhp = ParseNullableDecimal(GetField(csv, "boostbudgetphp")),
        Impressions = ParseNullableInt(GetField(csv, "impressions")),
        Reach = ParseNullableInt(GetField(csv, "reach")),
        Likes = ParseNullableInt(GetField(csv, "likes")),
        Comments = ParseNullableInt(GetField(csv, "comments")),
        Shares = ParseNullableInt(GetField(csv, "shares")),
        Saves = ParseNullableInt(GetField(csv, "saves")),
        ClickThroughs = ParseNullableInt(GetField(csv, "clickthroughs")),
        VideoViews = ParseNullableInt(GetField(csv, "videoviews")),
        EngagementRate = ParseNullableDouble(GetField(csv, "engagementrate")),
        ProfileVisits = ParseNullableInt(GetField(csv, "profilevisits")),
        DonationReferrals = ParseNullableInt(GetField(csv, "donationreferrals")),
        EstimatedDonationValuePhp = ParseNullableDecimal(GetField(csv, "estimateddonationvaluephp")),
        FollowerCountAtPost = ParseNullableInt(GetField(csv, "followercountatpost")),
        WatchTimeSeconds = ParseNullableDouble(GetField(csv, "watchtimeseconds")),
        AvgViewDurationSeconds = ParseNullableDouble(GetField(csv, "avgviewdurationseconds")),
        SubscriberCountAtPost = ParseNullableInt(GetField(csv, "subscribercountatpost")),
        Forwards = ParseNullableDouble(GetField(csv, "forwards")),
    };
}
