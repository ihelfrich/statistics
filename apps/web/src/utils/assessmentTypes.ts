import type { ModuleKey } from './types.ts'

export type AssessmentItemType = 'single_choice' | 'numeric'
export type AssessmentDifficultyBand = 'foundation' | 'intermediate' | 'advanced'
export type AssessmentMode = 'checkpoint' | 'diagnostic'
export type MasteryBand = 'Developing' | 'Proficient' | 'Advanced'

export type AssessmentOption = {
  value: string
  label: string
}

export type AssessmentItem = {
  item_id: string
  module_key: ModuleKey
  skill_tag: string
  difficulty_band: AssessmentDifficultyBand
  item_type: AssessmentItemType
  prompt: string
  scenario_title?: string
  scenario_context?: string
  decision_focus?: string
  options?: AssessmentOption[]
  correct_answer: string | number
  tolerance?: number
  rationale: string
  scoring: {
    max_points: number
  }
}

export type AssessmentForm = {
  assessment_id: string
  form_version: string
  title: string
  subtitle: string
  mode: AssessmentMode
  module_key?: ModuleKey
  duration_minutes: number
  instructions: string
  item_ids: string[]
}

export type AssessmentCatalogEntry = {
  assessment_id: string
  title: string
  subtitle: string
  mode: AssessmentMode
  duration_minutes: number
  audience: string
  description: string
  route_path: string
}

export type AssessmentResponseDraft = {
  item_id: string
  response_value: string
  changed_answer_count: number
  first_answered_at_ms?: number
  last_changed_at_ms?: number
}

export type AssessmentSessionStart = {
  session_id: string
  session_token: string
  assessment_id: string
  form_version: string
  student_id: string
  started_at: string
  duration_minutes: number
}

export type AssessmentItemResult = {
  item_id: string
  module_key: ModuleKey
  item_type: AssessmentItemType
  skill_tag: string
  position: number
  response_value: string
  is_correct: boolean
  score: number
  latency_ms: number
  changed_answer_count: number
}

export type AssessmentSubmission = {
  session_id: string
  session_token?: string
  student_id: string
  assessment_id: string
  form_version: string
  test_code?: string
  started_at: string
  submitted_at: string
  duration_ms: number
  completion_status: 'submitted' | 'practice'
  raw_score: number
  pct_correct: number
  mastery_band: MasteryBand
  responses: AssessmentItemResult[]
}

export type AssessmentScoringSummary = {
  raw_score: number
  max_score: number
  pct_correct: number
  mastery_band: MasteryBand
  item_results: AssessmentItemResult[]
}
