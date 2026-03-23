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
import { moduleRegistry } from '../utils/types.ts'

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

function formatSkillTag(skill_tag: string) {
  return skill_tag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function responseLabel(item: AssessmentItem, response_value: string) {
  if (!response_value) {
    return 'Blank'
  }

  if (item.item_type === 'single_choice') {
    return item.options?.find((option) => option.value === response_value)?.label ?? response_value
  }

  return response_value
}

function correctAnswerLabel(item: AssessmentItem) {
  if (item.item_type === 'single_choice') {
    return item.options?.find((option) => option.value === String(item.correct_answer))?.label ?? String(item.correct_answer)
  }

  return String(item.correct_answer)
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
  const isAdvertisingPractice =
    mode === 'practice' &&
    Boolean(form.module_key) &&
    moduleRegistry[form.module_key!].pathway === 'Advertising Analytics'

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
      setError('Enter a learner ID, assessment code, and confirmation before starting.')
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
      setError(startError instanceof Error ? startError.message : 'Unable to start this assessment.')
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
      setError('This assessment session is no longer valid. Start again.')
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
          ? 'This attempt was already submitted, so the saved result was kept.'
          : 'Results saved successfully.',
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
          <span className="panel-label">{mode === 'practice' ? 'Checkpoint' : 'Timed diagnostic'}</span>
          <h2>{form.title}</h2>
          <p>{form.instructions}</p>
        </div>

        <div className="metric-strip wide">
          <MetricCard value={String(items.length)} label="items" />
          <MetricCard value={`${form.duration_minutes} min`} label="recommended duration" />
          <MetricCard value={mode === 'practice' ? 'Self-check' : 'Timed'} label="format" />
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
            <h3>{mode === 'practice' ? 'Start checkpoint' : 'Start timed diagnostic'}</h3>
            <p>
              {mode === 'practice'
                ? isAdvertisingPractice
                  ? 'Treat this set like a real measurement review: calculate carefully, pressure-test the interpretation, and avoid claiming more than the evidence supports.'
                  : 'Use this short set to check whether the lesson concepts are stable before you move on.'
                : 'Enter your learner ID and assessment code to begin the timed diagnostic.'}
            </p>

            {mode === 'recorded' ? (
              <div className="assessment-gate">
                <label className="text-control">
                  <span>Learner ID</span>
                  <input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="ex: STATS-017" />
                </label>
                <label className="text-control">
                  <span>Assessment code</span>
                  <input value={testCode} onChange={(event) => setTestCode(event.target.value)} placeholder="ex: spring-review-a" />
                </label>
                <label className="consent-row">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(event) => setConsentAccepted(event.target.checked)}
                  />
                  <span>
                    I understand that my results will be saved under this learner ID for course use.
                  </span>
                </label>
                <div className="button-stack">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleRecordedStart()}
                    disabled={!isAssessmentApiConfigured() || status === 'starting'}
                  >
                    {status === 'starting' ? 'Starting...' : 'Start diagnostic'}
                  </button>
                </div>
                {!isAssessmentApiConfigured() ? (
                  <p className="note-text">
                    Timed diagnostics are temporarily unavailable in this version of the site.
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
                <strong>{mode === 'practice' ? 'Checkpoint in progress' : 'Diagnostic in progress'}</strong>
                <span>{draft.student_id ? `Learner ${draft.student_id}` : 'Self-check mode'}</span>
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
                      Item {index + 1} • {formatSkillTag(item.skill_tag)}
                    </span>
                    <span className="question-difficulty">{item.difficulty_band}</span>
                  </div>

                  {item.scenario_title || item.scenario_context || item.decision_focus ? (
                    <div className="question-context-card">
                      {item.scenario_title ? <strong>{item.scenario_title}</strong> : null}
                      {item.scenario_context ? <p>{item.scenario_context}</p> : null}
                      {item.decision_focus ? <span>{item.decision_focus}</span> : null}
                    </div>
                  ) : null}

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
                    : 'Submit diagnostic'}
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
                <MetricCard value={mode === 'practice' ? 'Completed' : 'Saved'} label="status" />
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
                      {item.scenario_title ? <span className="review-kicker">{item.scenario_title}</span> : null}
                      <div className="review-meta">
                        <span>Skill: {formatSkillTag(item.skill_tag)}</span>
                        <span>Your answer: {responseLabel(item, result?.response_value ?? '')}</span>
                        <span>Correct answer: {correctAnswerLabel(item)}</span>
                        <span>{result?.is_correct ? 'Correct' : 'Incorrect'}</span>
                      </div>
                      <p>{item.rationale}</p>
                      {item.decision_focus ? <p className="review-decision-focus">{item.decision_focus}</p> : null}
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
