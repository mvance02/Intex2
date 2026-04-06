import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../../utils/api'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorAlert from '../../components/shared/ErrorAlert'
import EmptyState from '../../components/shared/EmptyState'
import type {
  Resident,
  ProcessRecording,
  HomeVisitation,
  HealthWellbeingRecord,
  EducationRecord,
  InterventionPlan,
  IncidentReport,
  PaginatedResponse,
} from '../../types/models'

// ─── Local helpers ────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value ?? '—'}</dd>
    </div>
  )
}

function fmt(date: string | null | undefined): string {
  return date ? new Date(date).toLocaleDateString() : '—'
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'Profile' | 'Sessions' | 'Visits' | 'Health & Education' | 'Plans' | 'Incidents'
const TABS: Tab[] = ['Profile', 'Sessions', 'Visits', 'Health & Education', 'Plans', 'Incidents']

// ─── Tab content components ───────────────────────────────────────────────────

function ProfileTab({ resident }: { resident: Resident }) {
  const subCats: string[] = []
  if (resident.subCatOrphaned) subCats.push('Orphaned')
  if (resident.subCatTrafficked) subCats.push('Trafficked')
  if (resident.subCatChildLabor) subCats.push('Child Labor')
  if (resident.subCatPhysicalAbuse) subCats.push('Physical Abuse')
  if (resident.subCatSexualAbuse) subCats.push('Sexual Abuse')
  if (resident.subCatOsaec) subCats.push('OSAEC')
  if (resident.subCatCicl) subCats.push('CICL')
  if (resident.subCatAtRisk) subCats.push('At Risk')
  if (resident.subCatStreetChild) subCats.push('Street Child')
  if (resident.subCatChildWithHiv) subCats.push('Child with HIV')

  const familyFlags: string[] = []
  if (resident.familyIs4Ps) familyFlags.push('4Ps Beneficiary')
  if (resident.familySoloParent) familyFlags.push('Solo Parent')
  if (resident.familyIndigenous) familyFlags.push('Indigenous')
  if (resident.familyParentPwd) familyFlags.push('Parent PWD')
  if (resident.familyInformalSettler) familyFlags.push('Informal Settler')

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
      <Field label="Date of Birth" value={fmt(resident.dateOfBirth)} />
      <Field label="Age Upon Admission" value={resident.ageUponAdmission} />
      <Field label="Present Age" value={resident.presentAge} />
      <Field label="Sex" value={resident.sex} />
      <Field label="Place of Birth" value={resident.placeOfBirth} />
      <Field label="Religion" value={resident.religion} />
      <Field label="Birth Status" value={resident.birthStatus} />

      <div className="sm:col-span-2">
        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Case Category
        </dt>
        <dd className="mt-1 text-sm text-gray-800">
          {resident.caseCategory ?? '—'}
        </dd>
        {subCats.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {subCats.map((s) => (
              <Badge key={s} label={s} color="bg-indigo-100 text-indigo-700" />
            ))}
          </div>
        )}
      </div>

      {familyFlags.length > 0 && (
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Family Info
          </dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {familyFlags.map((f) => (
              <Badge key={f} label={f} color="bg-amber-100 text-amber-700" />
            ))}
          </dd>
        </div>
      )}

      {resident.isPwd && (
        <>
          <Field label="PWD Type" value={resident.pwdType} />
          {resident.hasSpecialNeeds && (
            <Field label="Special Needs Diagnosis" value={resident.specialNeedsDiagnosis} />
          )}
        </>
      )}

      <Field label="Referral Source" value={resident.referralSource} />
      <Field label="Referring Agency / Person" value={resident.referringAgencyPerson} />
      <Field label="Reintegration Type" value={resident.reintegrationType} />
      <Field label="Reintegration Status" value={resident.reintegrationStatus} />

      {resident.notesRestricted && (
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</dt>
          <dd className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
            {resident.notesRestricted}
          </dd>
        </div>
      )}
    </dl>
  )
}

function SessionsTab({ recordings }: { recordings: ProcessRecording[] }) {
  if (recordings.length === 0) {
    return <EmptyState title="No sessions recorded" message="Process recordings will appear here." />
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Date', 'Social Worker', 'Type', 'Duration (min)', 'Emotional State Before', 'Emotional State After', 'Concerns Flagged'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {recordings.map((r) => (
            <tr key={r.recordingId} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap">{fmt(r.sessionDate)}</td>
              <td className="px-4 py-3">{r.socialWorker ?? '—'}</td>
              <td className="px-4 py-3">{r.sessionType ?? '—'}</td>
              <td className="px-4 py-3">{r.sessionDurationMinutes ?? '—'}</td>
              <td className="px-4 py-3">{r.emotionalStateObserved ?? '—'}</td>
              <td className="px-4 py-3">{r.emotionalStateEnd ?? '—'}</td>
              <td className="px-4 py-3">
                {r.concernsFlagged ? (
                  <Badge label="Yes" color="bg-red-100 text-red-700" />
                ) : (
                  <Badge label="No" color="bg-green-100 text-green-700" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VisitsTab({ visits }: { visits: HomeVisitation[] }) {
  if (visits.length === 0) {
    return <EmptyState title="No home visits recorded" message="Home visitations will appear here." />
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Date', 'Social Worker', 'Type', 'Location', 'Safety Concerns', 'Follow-up Needed'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {visits.map((v) => (
            <tr key={v.visitationId} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap">{fmt(v.visitDate)}</td>
              <td className="px-4 py-3">{v.socialWorker ?? '—'}</td>
              <td className="px-4 py-3">{v.visitType ?? '—'}</td>
              <td className="px-4 py-3">{v.locationVisited ?? '—'}</td>
              <td className="px-4 py-3">
                {v.safetyConcernsNoted ? (
                  <Badge label="Yes" color="bg-red-100 text-red-700" />
                ) : (
                  <Badge label="No" color="bg-green-100 text-green-700" />
                )}
              </td>
              <td className="px-4 py-3">
                {v.followUpNeeded ? (
                  <Badge label="Yes" color="bg-yellow-100 text-yellow-700" />
                ) : (
                  <Badge label="No" color="bg-gray-100 text-gray-600" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HealthEducationTab({
  healthRecords,
  educationRecords,
}: {
  healthRecords: HealthWellbeingRecord[]
  educationRecords: EducationRecord[]
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Health Records</h3>
        {healthRecords.length === 0 ? (
          <EmptyState title="No health records" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'General Health', 'Nutrition', 'Sleep', 'BMI', 'Checkups'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {healthRecords.map((r) => {
                  const checkups = [
                    r.medicalCheckupDone && 'Medical',
                    r.dentalCheckupDone && 'Dental',
                    r.psychologicalCheckupDone && 'Psych',
                  ].filter(Boolean) as string[]
                  return (
                    <tr key={r.healthRecordId} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{fmt(r.recordDate)}</td>
                      <td className="px-3 py-2">{r.generalHealthScore ?? '—'}</td>
                      <td className="px-3 py-2">{r.nutritionScore ?? '—'}</td>
                      <td className="px-3 py-2">{r.sleepQualityScore ?? '—'}</td>
                      <td className="px-3 py-2">{r.bmi ?? '—'}</td>
                      <td className="px-3 py-2">
                        {checkups.length > 0 ? checkups.join(', ') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Education Records</h3>
        {educationRecords.length === 0 ? (
          <EmptyState title="No education records" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Level', 'School', 'Enrollment', 'Attendance', 'Progress'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {educationRecords.map((r) => (
                  <tr key={r.educationRecordId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(r.recordDate)}</td>
                    <td className="px-3 py-2">{r.educationLevel ?? '—'}</td>
                    <td className="px-3 py-2">{r.schoolName ?? '—'}</td>
                    <td className="px-3 py-2">{r.enrollmentStatus ?? '—'}</td>
                    <td className="px-3 py-2">
                      {r.attendanceRate != null ? `${r.attendanceRate}%` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {r.progressPercent != null ? `${r.progressPercent}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function PlansTab({ plans }: { plans: InterventionPlan[] }) {
  if (plans.length === 0) {
    return <EmptyState title="No intervention plans" message="Plans will appear here once created." />
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Category', 'Description', 'Status', 'Target Date', 'Case Conference Date'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {plans.map((p) => (
            <tr key={p.planId} className="hover:bg-gray-50">
              <td className="px-4 py-3">{p.planCategory ?? '—'}</td>
              <td className="px-4 py-3 max-w-xs truncate">{p.planDescription ?? '—'}</td>
              <td className="px-4 py-3">{p.status ?? '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap">{fmt(p.targetDate)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{fmt(p.caseConferenceDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IncidentsTab({ incidents }: { incidents: IncidentReport[] }) {
  const severityColor = (severity: string | null): string => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-700'
      case 'High': return 'bg-orange-100 text-orange-700'
      case 'Medium': return 'bg-yellow-100 text-yellow-700'
      case 'Low': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (incidents.length === 0) {
    return <EmptyState title="No incidents" message="Incident reports will appear here." />
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Date', 'Type', 'Severity', 'Resolved', 'Reported By'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {incidents.map((i) => (
            <tr key={i.incidentId} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap">{fmt(i.incidentDate)}</td>
              <td className="px-4 py-3">{i.incidentType ?? '—'}</td>
              <td className="px-4 py-3">
                {i.severity ? (
                  <Badge label={i.severity} color={severityColor(i.severity)} />
                ) : '—'}
              </td>
              <td className="px-4 py-3">
                {i.resolved ? (
                  <Badge label="Yes" color="bg-green-100 text-green-700" />
                ) : (
                  <Badge label="No" color="bg-red-100 text-red-700" />
                )}
              </td>
              <td className="px-4 py-3">{i.reportedBy ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page data shape ─────────────────────────────────────────────────────────

interface PageData {
  resident: Resident
  recordings: ProcessRecording[]
  visits: HomeVisitation[]
  healthRecords: HealthWellbeingRecord[]
  educationRecords: EducationRecord[]
  plans: InterventionPlan[]
  incidents: IncidentReport[]
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResidentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Profile')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)

    Promise.all([
      apiFetch<Resident>(`/api/residents/${id}`),
      apiFetch<PaginatedResponse<ProcessRecording>>(`/api/processrecordings?residentId=${id}&pageSize=50`),
      apiFetch<PaginatedResponse<HomeVisitation>>(`/api/homevisitations?residentId=${id}&pageSize=50`),
      apiFetch<HealthWellbeingRecord[]>(`/api/healthwellbeingrecords?residentId=${id}`),
      apiFetch<EducationRecord[]>(`/api/educationrecords?residentId=${id}`),
      apiFetch<InterventionPlan[]>(`/api/interventionplans?residentId=${id}`),
      apiFetch<PaginatedResponse<IncidentReport>>(`/api/incidentreports?residentId=${id}&pageSize=50`),
    ])
      .then(([resident, recPage, visitPage, health, edu, plans, incidentPage]) => {
        document.title = `${resident.caseControlNo ?? resident.internalCode ?? 'Resident'} — Hope Haven`
        setData({
          resident,
          recordings: recPage.items,
          visits: visitPage.items,
          healthRecords: health,
          educationRecords: edu,
          plans,
          incidents: incidentPage.items,
        })
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load resident data.')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" label="Loading resident…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-teal-600 hover:underline"
        >
          ← Back to Residents
        </button>
        <ErrorAlert message={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  if (!data) return null

  const { resident, recordings, visits, healthRecords, educationRecords, plans, incidents } = data
  const caseLabel = resident.caseControlNo ?? resident.internalCode ?? `Resident ${resident.residentId}`

  const riskColor = (level: string | null): string => {
    switch (level) {
      case 'Critical': return 'bg-red-100 text-red-700'
      case 'High': return 'bg-orange-100 text-orange-700'
      case 'Medium': return 'bg-yellow-100 text-yellow-700'
      case 'Low': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const statusColor = (s: string | null): string => {
    if (s === 'Active') return 'bg-teal-100 text-teal-700'
    if (s === 'Reintegrated') return 'bg-blue-100 text-blue-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link to="/admin/residents" className="text-sm text-teal-600 hover:underline">
        ← Back to Residents
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Case: {caseLabel}</h1>
        {resident.caseStatus && (
          <Badge label={resident.caseStatus} color={statusColor(resident.caseStatus)} />
        )}
        {resident.currentRiskLevel && (
          <Badge label={resident.currentRiskLevel} color={riskColor(resident.currentRiskLevel)} />
        )}
      </div>

      {/* Meta row */}
      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <dt className="inline font-medium text-gray-500">Safehouse: </dt>
          <dd className="inline text-gray-800">{resident.safehouse?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-500">Social Worker: </dt>
          <dd className="inline text-gray-800">{resident.assignedSocialWorker ?? '—'}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-500">Date Admitted: </dt>
          <dd className="inline text-gray-800">{fmt(resident.dateOfAdmission)}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-500">Category: </dt>
          <dd className="inline text-gray-800">{resident.caseCategory ?? '—'}</dd>
        </div>
      </dl>

      {/* Tabs */}
      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-0 overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-current={activeTab === tab ? 'page' : undefined}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-6">
          {activeTab === 'Profile' && <ProfileTab resident={resident} />}
          {activeTab === 'Sessions' && <SessionsTab recordings={recordings} />}
          {activeTab === 'Visits' && <VisitsTab visits={visits} />}
          {activeTab === 'Health & Education' && (
            <HealthEducationTab healthRecords={healthRecords} educationRecords={educationRecords} />
          )}
          {activeTab === 'Plans' && <PlansTab plans={plans} />}
          {activeTab === 'Incidents' && <IncidentsTab incidents={incidents} />}
        </div>
      </div>
    </div>
  )
}
