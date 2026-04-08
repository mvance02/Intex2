import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { apiFetch, displaySafehouseName } from '../../utils/api'
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

type Tab = 'Profile' | 'Timeline' | 'Sessions' | 'Visits' | 'Health & Education' | 'Plans' | 'Incidents'
const TABS: Tab[] = ['Profile', 'Timeline', 'Sessions', 'Visits', 'Health & Education', 'Plans', 'Incidents']

// ─── Emotional state mapping ──────────────────────────────────────────────────

const EMOTIONAL_STATE_SCORE: Record<string, number> = {
  'Distressed': 1,
  'Agitated': 1,
  'Angry': 1,
  'Anxious': 2,
  'Fearful': 2,
  'Sad': 3,
  'Withdrawn': 3,
  'Neutral': 4,
  'Flat': 4,
  'Calm': 5,
  'Relaxed': 5,
  'Happy': 6,
  'Content': 6,
  'Hopeful': 7,
  'Positive': 7,
}

function emotionalScore(state: string | null | undefined): number | null {
  if (!state) return null
  const trimmed = state.trim()
  if (EMOTIONAL_STATE_SCORE[trimmed] != null) return EMOTIONAL_STATE_SCORE[trimmed]
  // Try matching any key that appears in the state string
  for (const [key, val] of Object.entries(EMOTIONAL_STATE_SCORE)) {
    if (trimmed.toLowerCase().includes(key.toLowerCase())) return val
  }
  return null
}

// ─── Timeline tab ─────────────────────────────────────────────────────────────

interface TimelineEvent {
  date: Date
  type: 'Admission' | 'Session' | 'Visit' | 'Incident' | 'Plan' | 'Reintegration'
  description: string
  detail?: string
  severityBadge?: { label: string; color: string }
}

function dotColor(type: TimelineEvent['type']): string {
  switch (type) {
    case 'Admission':     return 'bg-teal-500'
    case 'Session':       return 'bg-blue-500'
    case 'Visit':         return 'bg-green-500'
    case 'Incident':      return 'bg-red-500'
    case 'Plan':          return 'bg-purple-500'
    case 'Reintegration': return 'bg-yellow-500'
  }
}

function typeBadgeColor(type: TimelineEvent['type']): string {
  switch (type) {
    case 'Admission':     return 'bg-teal-100 text-teal-700'
    case 'Session':       return 'bg-blue-100 text-blue-700'
    case 'Visit':         return 'bg-green-100 text-green-700'
    case 'Incident':      return 'bg-red-100 text-red-700'
    case 'Plan':          return 'bg-purple-100 text-purple-700'
    case 'Reintegration': return 'bg-yellow-100 text-yellow-700'
  }
}

function severityColor(severity: string | null): string {
  switch (severity) {
    case 'Critical': return 'bg-red-100 text-red-700'
    case 'High':     return 'bg-orange-100 text-orange-700'
    case 'Medium':   return 'bg-yellow-100 text-yellow-700'
    case 'Low':      return 'bg-green-100 text-green-700'
    default:         return 'bg-gray-100 text-gray-600'
  }
}

function buildTimeline(
  resident: Resident,
  recordings: ProcessRecording[],
  visits: HomeVisitation[],
  incidents: IncidentReport[],
  plans: InterventionPlan[],
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  if (resident.dateOfAdmission) {
    events.push({
      date: new Date(resident.dateOfAdmission),
      type: 'Admission',
      description: 'Admitted to safehouse',
      detail: displaySafehouseName(resident.safehouse?.name) !== '—' ? displaySafehouseName(resident.safehouse?.name) : undefined,
    })
  }

  if (resident.reintegrationStatus) {
    // Use a synthetic future-ish date; we don't have an exact reintegration date field
    const reintDate = resident.dateOfAdmission
      ? new Date(resident.dateOfAdmission)
      : new Date()
    reintDate.setFullYear(reintDate.getFullYear() + 1)
    events.push({
      date: reintDate,
      type: 'Reintegration',
      description: `Reintegration milestone: ${resident.reintegrationStatus}`,
      detail: resident.reintegrationType ?? undefined,
    })
  }

  for (const r of recordings) {
    if (!r.sessionDate) continue
    const parts: string[] = []
    if (r.sessionType) parts.push(r.sessionType)
    if (r.socialWorker) parts.push(`with ${r.socialWorker}`)
    events.push({
      date: new Date(r.sessionDate),
      type: 'Session',
      description: parts.length > 0 ? parts.join(' ') : 'Counseling session',
      detail: r.sessionDurationMinutes != null ? `${r.sessionDurationMinutes} min` : undefined,
    })
  }

  for (const v of visits) {
    if (!v.visitDate) continue
    const parts: string[] = []
    if (v.visitType) parts.push(v.visitType)
    if (v.locationVisited) parts.push(`at ${v.locationVisited}`)
    events.push({
      date: new Date(v.visitDate),
      type: 'Visit',
      description: parts.length > 0 ? parts.join(' ') : 'Home visit',
      detail: v.socialWorker ?? undefined,
    })
  }

  for (const i of incidents) {
    if (!i.incidentDate) continue
    events.push({
      date: new Date(i.incidentDate),
      type: 'Incident',
      description: i.incidentType ?? 'Incident reported',
      severityBadge: i.severity
        ? { label: i.severity, color: severityColor(i.severity) }
        : undefined,
    })
  }

  for (const p of plans) {
    const dateStr = p.caseConferenceDate ?? p.targetDate
    if (!dateStr) continue
    const parts: string[] = []
    if (p.planCategory) parts.push(p.planCategory)
    if (p.status) parts.push(`(${p.status})`)
    events.push({
      date: new Date(dateStr),
      type: 'Plan',
      description: parts.length > 0 ? parts.join(' ') : 'Intervention plan',
      detail: p.planDescription?.slice(0, 80) ?? undefined,
    })
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

function TimelineTab({
  resident,
  recordings,
  visits,
  incidents,
  plans,
}: {
  resident: Resident
  recordings: ProcessRecording[]
  visits: HomeVisitation[]
  incidents: IncidentReport[]
  plans: InterventionPlan[]
}) {
  const events = buildTimeline(resident, recordings, visits, incidents, plans)

  if (events.length === 0) {
    return <EmptyState title="No timeline events" message="Events will appear as data is added." />
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      {events.map((event, i) => (
        <div key={i} className="relative flex gap-4 pb-8 pl-10">
          {/* Dot */}
          <div
            className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${dotColor(event.type)}`}
            style={{ top: '1rem' }}
          />
          {/* Content */}
          <div className="bg-white rounded-lg border border-gray-100 p-4 flex-1 shadow-sm">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-medium text-gray-400">
                {event.date.toLocaleDateString()}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadgeColor(event.type)}`}>
                {event.type}
              </span>
              {event.severityBadge && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${event.severityBadge.color}`}>
                  {event.severityBadge.label}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-700">{event.description}</p>
            {event.detail && (
              <p className="text-xs text-gray-500 mt-0.5">{event.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Emotional journey chart ──────────────────────────────────────────────────

interface EmotionalDataPoint {
  date: string
  before: number | null
  after: number | null
}

function EmotionalJourneyChart({ recordings }: { recordings: ProcessRecording[] }) {
  const points: EmotionalDataPoint[] = recordings
    .filter((r) => r.sessionDate)
    .map((r) => ({
      date: fmt(r.sessionDate),
      before: emotionalScore(r.emotionalStateObserved),
      after: emotionalScore(r.emotionalStateEnd),
    }))
    .filter((p) => p.before != null || p.after != null)

  if (points.length < 2) return null

  const yLabels: Record<number, string> = {
    1: 'Distressed',
    2: 'Anxious',
    3: 'Sad',
    4: 'Neutral',
    5: 'Calm',
    6: 'Happy',
    7: 'Hopeful',
  }

  return (
    <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Emotional Journey</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
          />
          <YAxis
            domain={[1, 7]}
            ticks={[1, 2, 3, 4, 5, 6, 7]}
            tickFormatter={(v: number) => yLabels[v] ?? ''}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            width={70}
          />
          <Tooltip
            formatter={(value: unknown, name: unknown) => [
              yLabels[Number(value)] ?? value,
              name === 'before' ? 'Before Session' : 'After Session',
            ]}
          />
          <Line
            type="monotone"
            dataKey="before"
            name="before"
            stroke="#9ca3af"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="after"
            name="after"
            stroke="#0d9488"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-end">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block w-4 h-0.5 bg-gray-400" />
          Before Session
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block w-4 h-0.5 bg-teal-600" />
          After Session
        </span>
      </div>
    </div>
  )
}

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
    <div className="space-y-0">
      <EmotionalJourneyChart recordings={recordings} />
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

// ─── Readiness prediction ─────────────────────────────────────────────────────

interface TopFactor {
  feature: string
  direction: 'positive' | 'negative'
}

interface ReadinessPrediction {
  readiness_score: number
  readiness_label: 'High' | 'Medium' | 'Low'
  predicted_type: string
  type_probabilities: Record<string, number>
  top_factors: TopFactor[]
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
  const [readiness, setReadiness] = useState<ReadinessPrediction | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(false)

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

  // Fetch readiness prediction separately — non-blocking, degrades gracefully if ML sidecar is down
  useEffect(() => {
    if (!id) return
    setReadinessLoading(true)
    apiFetch<ReadinessPrediction>(`/api/predict/reintegration/${id}`)
      .then(setReadiness)
      .catch(() => setReadiness(null))
      .finally(() => setReadinessLoading(false))
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
      case 'High':     return 'bg-orange-100 text-orange-700'
      case 'Medium':   return 'bg-yellow-100 text-yellow-700'
      case 'Low':      return 'bg-green-100 text-green-700'
      default:         return 'bg-gray-100 text-gray-600'
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
        {readinessLoading && (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400 animate-pulse">
            Readiness…
          </span>
        )}
        {readiness && !readinessLoading && (
          <Badge
            label={`Readiness: ${readiness.readiness_label} (${Math.round(readiness.readiness_score * 100)}%)`}
            color={
              readiness.readiness_label === 'High'   ? 'bg-green-100 text-green-700' :
              readiness.readiness_label === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                       'bg-red-100 text-red-700'
            }
          />
        )}
      </div>

      {/* Meta row */}
      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <dt className="inline font-medium text-gray-500">Safehouse: </dt>
          <dd className="inline text-gray-800">{displaySafehouseName(resident.safehouse?.name)}</dd>
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

      {/* ML Readiness Insights */}
      {readiness && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            ML Reintegration Insights
          </h2>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-gray-500">Readiness Score</p>
              <p className="font-semibold text-gray-900">
                {Math.round(readiness.readiness_score * 100)}%
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  readiness.readiness_label === 'High'   ? 'bg-green-100 text-green-700' :
                  readiness.readiness_label === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                           'bg-red-100 text-red-700'
                }`}>{readiness.readiness_label}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Predicted Placement</p>
              <p className="font-semibold text-gray-900">{readiness.predicted_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Placement Probabilities</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(readiness.type_probabilities)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, prob]) => (
                    <span key={type} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                      {type}: {Math.round(prob * 100)}%
                    </span>
                  ))}
              </div>
            </div>
          </div>
          {readiness.top_factors.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Top Contributing Factors</p>
              <div className="flex flex-wrap gap-1.5">
                {readiness.top_factors.map((f) => (
                  <span
                    key={f.feature}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      f.direction === 'positive'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {f.direction === 'positive' ? '↑' : '↓'} {f.feature.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400">
            Model predictions are decision-support only — all placement decisions require social worker review.
          </p>
        </div>
      )}

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
          {activeTab === 'Timeline' && (
            <TimelineTab
              resident={resident}
              recordings={recordings}
              visits={visits}
              incidents={incidents}
              plans={plans}
            />
          )}
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
