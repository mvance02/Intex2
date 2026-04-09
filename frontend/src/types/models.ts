// Mirrors C# models — all dates are strings (ISO 8601) from JSON serialization

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Safehouse {
  safehouseId: number;
  safehouseCode: string | null;
  name: string | null;
  region: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  openDate: string | null;
  status: string | null;
  capacityGirls: number | null;
  capacityStaff: number | null;
  currentOccupancy: number | null;
  notes: string | null;
}

export interface Supporter {
  supporterId: number;
  supporterType: string | null;
  displayName: string | null;
  organizationName: string | null;
  firstName: string | null;
  lastName: string | null;
  relationshipType: string | null;
  region: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  createdAt: string | null;
  firstDonationDate: string | null;
  acquisitionChannel: string | null;
  donations?: Donation[];
}

export interface Donation {
  donationId: number;
  supporterId: number | null;
  donationType: string | null;
  donationDate: string | null;
  isRecurring: boolean;
  campaignName: string | null;
  channelSource: string | null;
  currencyCode: string | null;
  amount: number | null;
  estimatedValue: number | null;
  impactUnit: string | null;
  notes: string | null;
  referralPostId: string | null;
  shareOnDonorWall: boolean;
  donorWallName: string | null;
  supporter?: Supporter;
  allocations?: DonationAllocation[];
  inKindItems?: InKindDonationItem[];
}

export interface DonorWallEntry {
  displayName: string;
  donationCount: number;
  latestDonationDate: string | null;
}

export interface DonationAllocation {
  allocationId: number;
  donationId: number | null;
  safehouseId: number | null;
  programArea: string | null;
  amountAllocated: number | null;
  allocationDate: string | null;
  allocationNotes: string | null;
}

export interface InKindDonationItem {
  itemId: number;
  donationId: number | null;
  itemName: string | null;
  itemCategory: string | null;
  quantity: number | null;
  unitOfMeasure: string | null;
  estimatedUnitValue: number | null;
  intendedUse: string | null;
  receivedCondition: string | null;
}

export interface Partner {
  partnerId: number;
  partnerName: string | null;
  partnerType: string | null;
  roleType: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  assignments?: PartnerAssignment[];
}

export interface PartnerAssignment {
  assignmentId: number;
  partnerId: number | null;
  safehouseId: number | null;
  programArea: string | null;
  assignmentStart: string | null;
  assignmentEnd: string | null;
  responsibilityNotes: string | null;
  isPrimary: boolean;
  status: string | null;
}

export interface Resident {
  residentId: number;
  caseControlNo: string | null;
  internalCode: string | null;
  safehouseId: number | null;
  caseStatus: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  birthStatus: string | null;
  placeOfBirth: string | null;
  religion: string | null;
  caseCategory: string | null;
  subCatOrphaned: boolean;
  subCatTrafficked: boolean;
  subCatChildLabor: boolean;
  subCatPhysicalAbuse: boolean;
  subCatSexualAbuse: boolean;
  subCatOsaec: boolean;
  subCatCicl: boolean;
  subCatAtRisk: boolean;
  subCatStreetChild: boolean;
  subCatChildWithHiv: boolean;
  isPwd: boolean;
  pwdType: string | null;
  hasSpecialNeeds: boolean;
  specialNeedsDiagnosis: string | null;
  familyIs4Ps: boolean;
  familySoloParent: boolean;
  familyIndigenous: boolean;
  familyParentPwd: boolean;
  familyInformalSettler: boolean;
  dateOfAdmission: string | null;
  ageUponAdmission: string | null;
  presentAge: string | null;
  lengthOfStay: string | null;
  referralSource: string | null;
  referringAgencyPerson: string | null;
  dateColbRegistered: string | null;
  dateColbObtained: string | null;
  assignedSocialWorker: string | null;
  initialCaseAssessment: string | null;
  dateCaseStudyPrepared: string | null;
  reintegrationType: string | null;
  reintegrationStatus: string | null;
  initialRiskLevel: string | null;
  currentRiskLevel: string | null;
  dateEnrolled: string | null;
  dateClosed: string | null;
  createdAt: string | null;
  notesRestricted: string | null;
  safehouse?: Safehouse;
  processRecordings?: ProcessRecording[];
  homeVisitations?: HomeVisitation[];
  incidentReports?: IncidentReport[];
  interventionPlans?: InterventionPlan[];
  healthRecords?: HealthWellbeingRecord[];
  educationRecords?: EducationRecord[];
}

export interface ProcessRecording {
  recordingId: number;
  residentId: number | null;
  sessionDate: string | null;
  socialWorker: string | null;
  sessionType: string | null;
  sessionDurationMinutes: number | null;
  emotionalStateObserved: string | null;
  emotionalStateEnd: string | null;
  sessionNarrative: string | null;
  interventionsApplied: string | null;
  followUpActions: string | null;
  progressNoted: boolean;
  concernsFlagged: boolean;
  referralMade: boolean;
  notesRestricted: string | null;
}

export interface HomeVisitation {
  visitationId: number;
  residentId: number | null;
  visitDate: string | null;
  socialWorker: string | null;
  visitType: string | null;
  locationVisited: string | null;
  familyMembersPresent: string | null;
  purpose: string | null;
  observations: string | null;
  familyCooperationLevel: string | null;
  safetyConcernsNoted: boolean;
  followUpNeeded: boolean;
  followUpNotes: string | null;
  visitOutcome: string | null;
}

export interface IncidentReport {
  incidentId: number;
  residentId: number | null;
  safehouseId: number | null;
  incidentDate: string | null;
  incidentType: string | null;
  severity: string | null;
  description: string | null;
  responseTaken: string | null;
  resolved: boolean;
  resolutionDate: string | null;
  reportedBy: string | null;
  followUpRequired: boolean;
}

export interface InterventionPlan {
  planId: number;
  residentId: number | null;
  planCategory: string | null;
  planDescription: string | null;
  servicesProvided: string | null;
  targetValue: number | null;
  targetDate: string | null;
  status: string | null;
  caseConferenceDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface HealthWellbeingRecord {
  healthRecordId: number;
  residentId: number | null;
  recordDate: string | null;
  generalHealthScore: number | null;
  nutritionScore: number | null;
  sleepQualityScore: number | null;
  energyLevelScore: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  medicalCheckupDone: boolean;
  dentalCheckupDone: boolean;
  psychologicalCheckupDone: boolean;
  notes: string | null;
}

export interface EducationRecord {
  educationRecordId: number;
  residentId: number | null;
  recordDate: string | null;
  educationLevel: string | null;
  schoolName: string | null;
  enrollmentStatus: string | null;
  attendanceRate: number | null;
  progressPercent: number | null;
  completionStatus: string | null;
  notes: string | null;
}

export interface SocialMediaPost {
  postId: number;
  platform: string | null;
  platformPostId: string | null;
  postUrl: string | null;
  createdAt: string | null;
  dayOfWeek: string | null;
  postHour: number | null;
  postType: string | null;
  mediaType: string | null;
  caption: string | null;
  hashtags: string | null;
  numHashtags: number | null;
  mentionsCount: number | null;
  hasCallToAction: boolean;
  callToActionType: string | null;
  contentTopic: string | null;
  sentimentTone: string | null;
  captionLength: number | null;
  featuresResidentStory: boolean;
  campaignName: string | null;
  isBoosted: boolean;
  boostBudgetPhp: number | null;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clickThroughs: number | null;
  videoViews: number | null;
  engagementRate: number | null;
  profileVisits: number | null;
  donationReferrals: number | null;
  estimatedDonationValuePhp: number | null;
  followerCountAtPost: number | null;
  watchTimeSeconds: number | null;
  avgViewDurationSeconds: number | null;
  subscriberCountAtPost: number | null;
  forwards: number | null;
}

export interface SafehouseMonthlyMetric {
  metricId: number;
  safehouseId: number | null;
  monthStart: string | null;
  monthEnd: string | null;
  activeResidents: number | null;
  avgEducationProgress: number | null;
  avgHealthScore: number | null;
  processRecordingCount: number | null;
  homeVisitationCount: number | null;
  incidentCount: number | null;
  notes: string | null;
}

export interface PublicImpactSnapshot {
  snapshotId: number;
  snapshotDate: string | null;
  headline: string | null;
  summaryText: string | null;
  metricPayloadJson: string | null;
  isPublished: boolean;
  publishedAt: string | null;
}

// Dashboard / report shapes
export interface DashboardMetrics {
  activeResidents: number;
  totalSupporters: number;
  ytdDonations: number;
  activeSafehouses: number;
  openIncidents: number;
  highRiskResidents: number;
}

export interface RecentActivityItem {
  type: 'donation' | 'session' | 'incident';
  description: string;
  date: string;
}

export interface SafehouseSummaryItem {
  safehouseId: number;
  name: string | null;
  region: string | null;
  status: string | null;
  capacityGirls: number | null;
  currentOccupancy: number | null;
  activeResidents: number;
}

export interface SocialDraftPredictionRequest {
  platform: string;
  day_of_week: string;
  post_hour: number;
  post_type: string;
  media_type: string;
  content_topic: string;
  sentiment_tone: string;
  num_hashtags: number;
  mentions_count: number;
  has_call_to_action: boolean;
  call_to_action_type: string;
  features_resident_story: boolean;
  caption_length: number;
  is_boosted: boolean;
  boost_budget_php: number;
}

export interface SocialDraftPredictionResult {
  predicted_donation_referrals: number;
  predicted_estimated_donation_value_php: number;
  high_performer_probability: number;
  high_performer_class: number;
  high_performer_definition: string | null;
  training_threshold_referrals: number | null;
  performance_band_label: string;
  performance_band_key: 'high' | 'mid' | 'low' | string;
  high_performer_classifier: string | null;
  disclaimer: string;
}

export interface SocialDraftSweepHourResult {
  best_post_hour: number;
  predicted_donation_referrals_at_best: number;
  sweep: Array<{
    post_hour: number;
    predicted_donation_referrals: number;
  }>;
}

export interface PublicOkrMetric {
  metricName: string;
  ratePercent: number;
  stableCount: number;
  eligibleCount: number;
  previousStableCount: number;
  previousRatePercent: number;
  deltaPoints: number;
  deltaCount: number;
}

export interface SocialOptimizeRequest {
  platform: string;
  optimize_for: 'donation_value' | 'referrals';
  is_boosted?: boolean | null;
  boost_budget_php?: number | null;
  features_resident_story?: boolean | null;
  has_call_to_action?: boolean | null;
  num_hashtags?: number | null;
  mentions_count?: number | null;
  caption_length?: number | null;
  top_n?: number;
}

export interface SocialOptimizeRecommendation {
  rank: number;
  day_of_week: string;
  post_hour: number;
  post_type: string;
  media_type: string;
  content_topic: string;
  sentiment_tone: string;
  call_to_action_type: string;
  has_call_to_action: boolean;
  features_resident_story: boolean;
  predicted_value: number;
}

export interface SocialOptimizeResult {
  platform: string;
  optimize_for: string;
  target_label: string;
  total_combinations_evaluated: number;
  top_n: number;
  recommendations: SocialOptimizeRecommendation[];
  constraints_applied: Record<string, unknown>;
  disclaimer: string;
}

export interface SocialWeeklyScheduleRequest {
  optimize_for: 'donation_value' | 'referrals';
  is_boosted?: boolean | null;
  boost_budget_php?: number | null;
  features_resident_story?: boolean | null;
  has_call_to_action?: boolean | null;
  num_hashtags?: number | null;
  mentions_count?: number | null;
  caption_length?: number | null;
}

export interface SocialWeeklyScheduleDay {
  day_of_week: string;
  platform: string;
  post_hour: number;
  post_type: string;
  media_type: string;
  content_topic: string;
  sentiment_tone: string;
  call_to_action_type: string;
  has_call_to_action: boolean;
  features_resident_story: boolean;
  predicted_value: number;
}

export interface SocialWeeklyScheduleResult {
  optimize_for: string;
  target_label: string;
  total_combinations_evaluated: number;
  weekly_total_predicted: number;
  schedule: SocialWeeklyScheduleDay[];
  constraints_applied: Record<string, unknown>;
  disclaimer: string;
}
