import type {
  AssessmentForm,
  AssessmentItem,
  AssessmentResponseDraft,
  AssessmentScoringSummary,
  AssessmentSessionStart,
  AssessmentSubmission,
  MasteryBand,
} from './assessmentTypes.ts'

const DRAFT_STORAGE_PREFIX = 'statistics-assessment-draft-v1'

export type AssessmentDraftState = {
  assessment_id: string
  form_version: string
  mode: 'practice' | 'recorded'
  started_at: string
  answers: Record<string, AssessmentResponseDraft>
  session?: AssessmentSessionStart
  student_id?: string
  test_code?: string
  consent_accepted?: boolean
}

function draftStorageKey(assessment_id: string, mode: AssessmentDraftState['mode']) {
  return `${DRAFT_STORAGE_PREFIX}:${mode}:${assessment_id}`
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function isAssessmentApiConfigured() {
  return Boolean(import.meta.env.VITE_ASSESSMENT_API_BASE_URL)
}

function assessmentApiBaseUrl() {
  const configured = import.meta.env.VITE_ASSESSMENT_API_BASE_URL as string | undefined
  if (!configured) {
    return ''
  }
  return configured.replace(/\/$/, '')
}

export function loadAssessmentDraft(assessment_id: string, mode: AssessmentDraftState['mode']) {
  if (!canUseStorage()) {
    return null
  }

  const raw = window.localStorage.getItem(draftStorageKey(assessment_id, mode))
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AssessmentDraftState
  } catch {
    return null
  }
}

export function saveAssessmentDraft(draft: AssessmentDraftState) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(
    draftStorageKey(draft.assessment_id, draft.mode),
    JSON.stringify(draft),
  )
}

export function clearAssessmentDraft(assessment_id: string, mode: AssessmentDraftState['mode']) {
  if (!canUseStorage()) {
    return
  }
  window.localStorage.removeItem(draftStorageKey(assessment_id, mode))
}

export function masteryBandFromPct(pct_correct: number): MasteryBand {
  if (pct_correct >= 0.85) {
    return 'Advanced'
  }
  if (pct_correct >= 0.65) {
    return 'Proficient'
  }
  return 'Developing'
}

export function scoreAssessment(
  _form: AssessmentForm,
  items: AssessmentItem[],
  answers: Record<string, AssessmentResponseDraft>,
  started_at: string,
  submitted_at: string,
): AssessmentScoringSummary {
  const started_at_ms = new Date(started_at).getTime()
  const submitted_at_ms = new Date(submitted_at).getTime()

  const item_results = items.map((item, index) => {
    const answer = answers[item.item_id]
    const response_value = answer?.response_value?.trim() ?? ''

    let is_correct = false
    if (item.item_type === 'single_choice') {
      is_correct = response_value === String(item.correct_answer)
    } else if (response_value !== '') {
      const numeric_response = Number(response_value)
      const target = Number(item.correct_answer)
      if (Number.isFinite(numeric_response)) {
        is_correct = Math.abs(numeric_response - target) <= (item.tolerance ?? 0.01)
      }
    }

    return {
      item_id: item.item_id,
      module_key: item.module_key,
      item_type: item.item_type,
      skill_tag: item.skill_tag,
      position: index + 1,
      response_value,
      is_correct,
      score: is_correct ? item.scoring.max_points : 0,
      latency_ms: Math.max(
        0,
        (answer?.first_answered_at_ms ?? submitted_at_ms) - started_at_ms,
      ),
      changed_answer_count: answer?.changed_answer_count ?? 0,
    }
  })

  const raw_score = item_results.reduce((sum, result) => sum + result.score, 0)
  const max_score = items.reduce((sum, item) => sum + item.scoring.max_points, 0)
  const pct_correct = max_score === 0 ? 0 : raw_score / max_score

  return {
    raw_score,
    max_score,
    pct_correct,
    mastery_band: masteryBandFromPct(pct_correct),
    item_results,
  }
}

type StartRecordedSessionInput = {
  assessment_id: string
  student_id: string
  test_code: string
  consent_accepted: boolean
}

export async function startRecordedSession(input: StartRecordedSessionInput) {
  const base_url = assessmentApiBaseUrl()
  if (!base_url) {
    throw new Error('Assessment API is not configured for this site build.')
  }

  const response = await fetch(`${base_url}/api/assessment-sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to start the recorded assessment session.')
  }

  return payload as AssessmentSessionStart
}

export async function submitRecordedAssessment(submission: AssessmentSubmission) {
  const base_url = assessmentApiBaseUrl()
  if (!base_url) {
    throw new Error('Assessment API is not configured for this site build.')
  }

  const response = await fetch(`${base_url}/api/assessment-submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to submit the assessment.')
  }

  return payload as {
    ok: boolean
    duplicate?: boolean
    raw_score: number
    pct_correct: number
    mastery_band: MasteryBand
  }
}
