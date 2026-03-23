import { useEffect, useState } from 'react'
import type { MasteryBand } from './assessmentTypes.ts'
import type { ModuleKey } from './types.ts'

const PROGRESS_STORAGE_KEY = 'statistics-course-progress-v1'
const PROGRESS_EVENT = 'statistics-course-progress-updated'

export type StoredAssessmentResult = {
  assessment_id: string
  form_version: string
  raw_score: number
  max_score: number
  pct_correct: number
  mastery_band: MasteryBand
  completed_at: string
  mode: 'checkpoint' | 'diagnostic'
}

export type CourseProgress = {
  visited_modules: ModuleKey[]
  last_module_key?: ModuleKey
  checkpoint_results: Record<string, StoredAssessmentResult>
  formal_results: Record<string, StoredAssessmentResult>
}

const defaultProgress: CourseProgress = {
  visited_modules: [],
  checkpoint_results: {},
  formal_results: {},
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function emitProgressUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT))
  }
}

export function loadCourseProgress(): CourseProgress {
  if (!canUseStorage()) {
    return defaultProgress
  }

  const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY)
  if (!raw) {
    return defaultProgress
  }

  try {
    return { ...defaultProgress, ...JSON.parse(raw) as CourseProgress }
  } catch {
    return defaultProgress
  }
}

function saveCourseProgress(progress: CourseProgress) {
  if (!canUseStorage()) {
    return
  }
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress))
  emitProgressUpdate()
}

export function markVisitedModule(module_key: ModuleKey) {
  const current = loadCourseProgress()
  const visited_modules = current.visited_modules.includes(module_key)
    ? current.visited_modules
    : [...current.visited_modules, module_key]

  saveCourseProgress({
    ...current,
    visited_modules,
    last_module_key: module_key,
  })
}

export function saveCheckpointResult(module_key: ModuleKey, result: StoredAssessmentResult) {
  const current = loadCourseProgress()
  saveCourseProgress({
    ...current,
    checkpoint_results: {
      ...current.checkpoint_results,
      [module_key]: result,
    },
  })
}

export function saveFormalAssessmentResult(result: StoredAssessmentResult) {
  const current = loadCourseProgress()
  saveCourseProgress({
    ...current,
    formal_results: {
      ...current.formal_results,
      [result.assessment_id]: result,
    },
  })
}

export function useCourseProgress() {
  const [progress, setProgress] = useState<CourseProgress>(() => loadCourseProgress())

  useEffect(() => {
    const refresh = () => setProgress(loadCourseProgress())
    window.addEventListener(PROGRESS_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PROGRESS_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return progress
}
