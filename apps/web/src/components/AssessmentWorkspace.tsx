import { useEffect, useMemo, useState } from 'react'
import { MetricCard } from './MetricCard.tsx'
import {
  clearAssessmentDraft,
  isAssessmentApiConfigured,
  loadAssessmentDraft,
  saveAssessmentDraft,
  scoreAssessment,
  startRecordedSession,
  submitRecordedAssessment,
  type AssessmentDraftState,
} from '../utils/assessment.ts'
import type {
  AssessmentForm,
  AssessmentItem,
  AssessmentScoringSummary,
} from '../utils/assessmentTypes.ts'
import { saveCheckpointResult, saveFormalAssessmentResult } from '../utils/progress.ts'

type AssessmentWorkspaceProps = {
  form: AssessmentForm
  items: AssessmentItem[]
  mode: 'practice' | 'recorded'
}

function formatCountdown(milliseconds: number) {
  const safe = Math.max(0, milliseconds)
  const minutes = Math.floor(safe / 60000)
  const seconds = Math.floor((safe % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function AssessmentWorkspace({ form, items, mode }: AssessmentWorkspaceProps) {
  const initialDraft = useMemo(() => loadAssessmentDraft(form.assessment_id, mode), [form.assessment_id, mode])
  const [draft, setDraft] = useState<AssessmentDraftState | null>(() =>
    initialDraft && initialDraft.form_version === form.form_version ? initialDraft : null,
  )
  const [studentId, setStudentId] = useState(initialDraft?.student_id ?? '')
  const [testCode, setTestCode] = useState(initialDraft?.test_code ?? '')
  const [consentAccepted, setConsentAccepted] = useState(initialDraft?.consent_accepted ?? false)
  const [summary, setSummary] = useState<AssessmentScoringSummary | null>(null)
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'submitting' | 'complete'>(
    draft ? 'running' : 'idle',
  )
  const [error, setError] = useState('')
  const [submissionNote, setSubmissionNote] = useState('')
  const [nowMs, setNowMs] = useState(() =>
    draft ? Date.now() : 0,
  )

  useEffect(() => {
    if (!draft || summary) {
      return
    }
    saveAssessmentDraft(draft)
  }, [draft, summary])

  useEffect(() => {
    if (!draft || summary) {
      return
    }

    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [draft, summary])

  const elapsedMs = draft ? Math.max(0, nowMs - new Date(draft.started_at).getTime()) : 0
  const remainingMs = form.duration_minutes * 60000 - elapsedMs

  const initializeDraft = (started_at: string, extras?: Partial<AssessmentDraftState>): AssessmentDraftState => ({
    assessment_id: form.assessment_id,
    form_version: form.form_version,
    mode,
    started_at,
    answers: extras?.answers ?? {},
    session: extras?.session,
    student_id: extras?.student_id,
    test_code: extras?.test_code,
    consent_accepted: extras?.consent_accepted,
  })

  const handlePracticeStart = () => {
    const nextDraft = initializeDraft(new Date().toISOString())
    setDraft(nextDraft)
    setStatus('running')
    setSummary(null)
    setError('')
    setSubmissionNote('')
    setNowMs(Date.now())
  }

  const handleRecordedStart = async () => {
    setError('')
    setSubmissionNote('')
    if (!studentId.trim() || !testCode.trim() || !consentAccepted) {
      setError('Enter a student ID, test code, and consent acknowledgement before starting.')
      return
    }
    setStatus('starting')

    try {
      const session = await startRecordedSession({
        assessment_id: form.assessment_id,
        student_id: studentId.trim(),
        test_code: testCode.trim(),
        consent_accepted: consentAccepted,
      })
      const nextDraft = initializeDraft(session.started_at, {
        session,
        student_id: studentId.trim(),
        test_code: testCode.trim(),
        consent_accepted: consentAccepted,
      })
      setDraft(nextDraft)
      setStatus('running')
      setNowMs(new Date(session.started_at).getTime())
    } catch (startError) {
      setStatus('idle')
      setError(startError instanceof Error ? startError.message : 'Unable to start the recorded session.')
    }
  }

  const handleAnswerChange = (item: AssessmentItem, response_value: string, timestamp_ms: number) => {
    if (!draft || summary) {
      return
    }

    const previous = draft.answers[item.item_id]
    const nextAnswer = {
      item_id: item.item_id,
      response_value,
      changed_answer_count:
        previous && previous.response_value !== '' && previous.response_value !== response_value
          ? previous.changed_answer_count + 1
          : previous?.changed_answer_count ?? 0,
      first_answered_at_ms:
        previous?.first_answered_at_ms ?? (response_value !== '' ? timestamp_ms : undefined),
      last_changed_at_ms: response_value !== '' ? timestamp_ms : previous?.last_changed_at_ms,
    }

    setDraft({
      ...draft,
      answers: {
        ...draft.answers,
        [item.item_id]: nextAnswer,
      },
    })
  }

  const restartAssessment = () => {
    clearAssessmentDraft(form.assessment_id, mode)
    setDraft(null)
    setSummary(null)
    setStatus('idle')
    setError('')
    setSubmissionNote('')
  }

  const handleSubmit = async () => {
    if (!draft || summary) {
      return
    }

    const submitted_at = new Date().toISOString()
    const nextSummary = scoreAssessment(form, items, draft.answers, draft.started_at, submitted_at)
    setError('')

    if (mode === 'practice') {
      if (!form.module_key) {
        setError('This practice form is missing its module mapping.')
        return
      }

      saveCheckpointResult(form.module_key, {
        assessment_id: form.assessment_id,
        form_version: form.form_version,
        raw_score: nextSummary.raw_score,
        max_score: nextSummary.max_score,
        pct_correct: nextSummary.pct_correct,
        mastery_band: nextSummary.mastery_band,
        completed_at: submitted_at,
        mode: 'checkpoint',
      })
      clearAssessmentDraft(form.assessment_id, mode)
      setSummary(nextSummary)
      setStatus('complete')
      setDraft(null)
      return
    }

    if (!draft.session || !draft.student_id) {
      setError('Recorded sessions require a valid session token and student ID.')
      return
    }

    setStatus('submitting')

    try {
      const response = await submitRecordedAssessment({
        session_id: draft.session.session_id,
        session_token: draft.session.session_token,
        student_id: draft.student_id,
        assessment_id: form.assessment_id,
        form_version: form.form_version,
        test_code: draft.test_code,
        started_at: draft.started_at,
        submitted_at,
        duration_ms: Math.max(0, new Date(submitted_at).getTime() - new Date(draft.started_at).getTime()),
        completion_status: 'submitted',
        raw_score: nextSummary.raw_score,
        pct_correct: nextSummary.pct_correct,
        mastery_band: nextSummary.mastery_band,
        responses: nextSummary.item_results,
      })

      saveFormalAssessmentResult({
        assessment_id: form.assessment_id,
        form_version: form.form_version,
        raw_score: response.raw_score,
        max_score: nextSummary.max_score,
        pct_correct: response.pct_correct,
        mastery_band: response.mastery_band,
        completed_at: submitted_at,
        mode: 'diagnostic',
      })

      clearAssessmentDraft(form.assessment_id, mode)
      setSubmissionNote(
        response.duplicate
          ? 'This session was already recorded earlier, so the existing submission was kept.'
          : 'Submission recorded successfully for the pilot data pipeline.',
      )
      setSummary({
        ...nextSummary,
        raw_score: response.raw_score,
        pct_correct: response.pct_correct,
        mastery_band: response.mastery_band,
      })
      setStatus('complete')
      setDraft(null)
    } catch (submitError) {
      setStatus('running')
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit the assessment.')
    }
  }

  const isExpired = mode === 'recorded' && Boolean(draft) && !summary && remainingMs <= 0

  return (
    <div className="stack-layout">
      <section className="content-card">
        <div className="module-header">
          <span className="panel-label">{mode === 'practice' ? 'Practice checkpoint' : 'Recorded pilot form'}</span>
          <h2>{form.title}</h2>
          <p>{form.instructions}</p>
        </div>

        <div className="metric-strip wide">
          <MetricCard value={String(items.length)} label="items" />
          <MetricCard value={`${form.duration_minutes} min`} label="recommended duration" />
          <MetricCard value={mode === 'practice' ? 'Local only' : 'GitHub-backed'} label="result storage" />
          <MetricCard value={summary ? `${Math.round(summary.pct_correct * 100)}%` : '--'} label="latest score" />
        </div>

        {error ? (
          <div className="status-banner error">
            <strong>Assessment error</strong>
            <span>{error}</span>
          </div>
        ) : null}

        {isExpired ? (
          <div className="status-banner error">
            <strong>Time expired</strong>
            <span>The form is locked. Submit now to record the responses captured before time ran out.</span>
          </div>
        ) : null}

        {submissionNote ? (
          <div className="status-banner success">
            <strong>Submission status</strong>
            <span>{submissionNote}</span>
          </div>
        ) : null}

        {!draft && !summary ? (
          <section className="content-card inset">
            <h3>{mode === 'practice' ? 'Start local checkpoint' : 'Start recorded session'}</h3>
            <p>
              {mode === 'practice'
                ? 'This checkpoint scores locally and updates your progress on this device.'
                : 'This form records item-level responses, timing, and scoring metadata for pilot psychometric analysis.'}
            </p>

            {mode === 'recorded' ? (
              <div className="assessment-gate">
                <label className="text-control">
                  <span>Issued student ID</span>
                  <input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="ex: STAT-204-017" />
                </label>
                <label className="text-control">
                  <span>Instructor test code</span>
                  <input value={testCode} onChange={(event) => setTestCode(event.target.value)} placeholder="ex: core-spring-pilot" />
                </label>
                <label className="consent-row">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(event) => setConsentAccepted(event.target.checked)}
                  />
                  <span>
                    I understand this is a pilot assessment and that my pseudonymous item-level
                    responses may be stored for measurement analysis.
                  </span>
                </label>
                <div className="button-stack">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleRecordedStart()}
                    disabled={!isAssessmentApiConfigured() || status === 'starting'}
                  >
                    {status === 'starting' ? 'Starting session...' : 'Start recorded assessment'}
                  </button>
                </div>
                {!isAssessmentApiConfigured() ? (
                  <p className="note-text">
                    This build is missing <code>VITE_ASSESSMENT_API_BASE_URL</code>, so recorded
                    submissions are disabled until the Pages frontend is pointed at the Vercel API.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="button-stack">
                <button type="button" className="primary-button" onClick={handlePracticeStart}>
                  Start checkpoint
                </button>
              </div>
            )}
          </section>
        ) : null}

        {draft ? (
          <div className="assessment-runner">
            <div className="assessment-toolbar">
              <div className="assessment-toolbar-block">
                <strong>{mode === 'practice' ? 'Checkpoint in progress' : 'Recorded session live'}</strong>
                <span>{draft.student_id ? `Student ${draft.student_id}` : 'Local practice mode'}</span>
              </div>
              <div className="assessment-toolbar-block align-right">
                <strong>{mode === 'recorded' ? formatCountdown(remainingMs) : formatCountdown(elapsedMs)}</strong>
                <span>{mode === 'recorded' ? 'time remaining' : 'elapsed time'}</span>
              </div>
            </div>

            <div className="question-nav">
              {items.map((item, index) => {
                const answered = Boolean(draft.answers[item.item_id]?.response_value)
                return (
                  <span key={item.item_id} className={`question-chip ${answered ? 'answered' : ''}`}>
                    {index + 1}
                  </span>
                )
              })}
            </div>

            <div className="assessment-question-stack">
              {items.map((item, index) => (
                <section key={item.item_id} className="content-card inset question-card">
                  <div className="question-header">
                    <span className="panel-label">
                      Item {index + 1} • {item.skill_tag}
                    </span>
                    <span className="question-difficulty">{item.difficulty_band}</span>
                  </div>
                  <p className="strong-text">{item.prompt}</p>

                  {item.item_type === 'single_choice' ? (
                    <div className="assessment-options">
                      {item.options?.map((option) => {
                        const checked = draft.answers[item.item_id]?.response_value === option.value
                        return (
                          <label key={option.value} className={`assessment-option ${checked ? 'selected' : ''}`}>
                            <input
                              type="radio"
                              name={item.item_id}
                              value={option.value}
                              checked={checked}
                              disabled={status === 'submitting' || isExpired}
                              onChange={(event) => handleAnswerChange(item, event.target.value, event.timeStamp)}
                            />
                            <span>{option.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <label className="text-control">
                      <span>Numeric response</span>
                      <input
                        value={draft.answers[item.item_id]?.response_value ?? ''}
                        disabled={status === 'submitting' || isExpired}
                        onChange={(event) => handleAnswerChange(item, event.target.value, event.timeStamp)}
                        inputMode="decimal"
                        placeholder="Enter a number"
                      />
                    </label>
                  )}
                </section>
              ))}
            </div>

            <div className="button-stack">
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSubmit()}
                disabled={status === 'submitting'}
              >
                {status === 'submitting'
                  ? 'Submitting...'
                  : mode === 'practice'
                    ? 'Finish checkpoint'
                    : 'Submit recorded form'}
              </button>
              <button type="button" className="secondary-button" onClick={restartAssessment}>
                Reset this attempt
              </button>
            </div>
          </div>
        ) : null}

        {summary ? (
          <div className="assessment-results">
            <section className="content-card inset">
              <h3>Result summary</h3>
              <div className="metric-strip wide">
                <MetricCard value={`${summary.raw_score} / ${summary.max_score}`} label="raw score" />
                <MetricCard value={`${Math.round(summary.pct_correct * 100)}%`} label="percent correct" />
                <MetricCard value={summary.mastery_band} label="mastery band" />
                <MetricCard value={mode === 'practice' ? 'Local completion' : 'Recorded pilot completion'} label="status" />
              </div>
            </section>

            <section className="content-card inset">
              <h3>Item review</h3>
              <div className="assessment-review-stack">
                {items.map((item) => {
                  const result = summary.item_results.find((candidate) => candidate.item_id === item.item_id)
                  return (
                    <div key={item.item_id} className={`review-card ${result?.is_correct ? 'correct' : 'incorrect'}`}>
                      <strong>{item.prompt}</strong>
                      <span>
                        Your answer: {result?.response_value || 'blank'} • {result?.is_correct ? 'correct' : 'incorrect'}
                      </span>
                      <p>{item.rationale}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <div className="button-stack">
              <button type="button" className="secondary-button" onClick={restartAssessment}>
                Start a new attempt
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
