import { getDiagnosticForm, getItemDefinition } from './_lib/form-manifests.js'
import { readRepoFile, writeRepoFile } from './_lib/github.js'
import { readJsonBody, sendJson } from './_lib/http.js'
import { verifySessionToken } from './_lib/token.js'

function masteryBandFromPct(pct_correct) {
  if (pct_correct >= 0.85) return 'Advanced'
  if (pct_correct >= 0.65) return 'Proficient'
  return 'Developing'
}

function normalizeNumeric(response_value) {
  const value = Number(response_value)
  return Number.isFinite(value) ? value : null
}

function normalizeResponse(itemDefinition, response) {
  const response_value = String(response.response_value ?? '').trim()
  let is_correct = false

  if (itemDefinition.item_type === 'single_choice') {
    is_correct = response_value === String(itemDefinition.correct_answer)
  } else if (response_value !== '') {
    const numeric = normalizeNumeric(response_value)
    if (numeric !== null) {
      is_correct = Math.abs(numeric - Number(itemDefinition.correct_answer)) <= (itemDefinition.tolerance ?? 0.01)
    }
  }

  return {
    item_id: response.item_id,
    module_key: itemDefinition.module_key,
    item_type: itemDefinition.item_type,
    skill_tag: itemDefinition.skill_tag,
    position: Number(response.position),
    response_value,
    is_correct,
    score: is_correct ? 1 : 0,
    latency_ms: Math.max(0, Number(response.latency_ms ?? 0)),
    changed_answer_count: Math.max(0, Number(response.changed_answer_count ?? 0)),
  }
}

function validateIso(value) {
  return !Number.isNaN(new Date(value).getTime())
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true })
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  try {
    const body = await readJsonBody(req)
    const forbiddenKeys = ['student_name', 'email', 'name']
    const foundForbidden = forbiddenKeys.find((key) => key in body)
    if (foundForbidden) {
      return sendJson(res, 400, { error: `Direct PII field "${foundForbidden}" is not allowed in assessment submissions.` })
    }

    const {
      session_id,
      session_token,
      student_id,
      assessment_id,
      form_version,
      started_at,
      submitted_at,
      duration_ms,
      responses,
    } = body

    if (
      !session_id ||
      !session_token ||
      !student_id ||
      !assessment_id ||
      !form_version ||
      !started_at ||
      !submitted_at ||
      !Array.isArray(responses)
    ) {
      return sendJson(res, 400, { error: 'Missing required submission fields.' })
    }

    if (!validateIso(started_at) || !validateIso(submitted_at)) {
      return sendJson(res, 400, { error: 'started_at and submitted_at must be valid ISO timestamps.' })
    }

    const secret = process.env.ASSESSMENT_SESSION_SECRET
    if (!secret) {
      throw new Error('Missing ASSESSMENT_SESSION_SECRET configuration.')
    }

    const sessionPayload = verifySessionToken(session_token, secret)
    if (
      sessionPayload.session_id !== session_id ||
      sessionPayload.student_id !== student_id ||
      sessionPayload.assessment_id !== assessment_id ||
      sessionPayload.form_version !== form_version
    ) {
      return sendJson(res, 403, { error: 'Submission does not match the signed session token.' })
    }

    const form = getDiagnosticForm(assessment_id)
    if (!form || form.form_version !== form_version) {
      return sendJson(res, 400, { error: 'Unknown assessment form version.' })
    }

    const uniqueIds = new Set(responses.map((response) => response.item_id))
    if (uniqueIds.size !== responses.length) {
      return sendJson(res, 400, { error: 'Duplicate item_id values are not allowed in a single submission.' })
    }

    const expectedIds = new Set(form.item_ids)
    const allItemsValid = responses.every((response) => expectedIds.has(response.item_id))
    if (!allItemsValid || responses.length !== form.item_ids.length) {
      return sendJson(res, 400, { error: 'Submission items do not match the expected form item IDs.' })
    }

    const normalizedResponses = responses
      .map((response) => {
        const itemDefinition = getItemDefinition(response.item_id)
        if (!itemDefinition) {
          throw new Error(`Unknown item_id ${response.item_id}.`)
        }
        return normalizeResponse(itemDefinition, response)
      })
      .sort((left, right) => left.position - right.position)

    const raw_score = normalizedResponses.reduce((sum, response) => sum + response.score, 0)
    const pct_correct = normalizedResponses.length === 0 ? 0 : raw_score / normalizedResponses.length
    const mastery_band = masteryBandFromPct(pct_correct)

    const record = {
      session_id,
      student_id,
      assessment_id,
      form_version,
      test_code: sessionPayload.test_code,
      raw_score,
      pct_correct,
      mastery_band,
      started_at,
      submitted_at,
      duration_ms: Math.max(0, Number(duration_ms ?? 0)),
      completion_status: 'submitted',
      responses: normalizedResponses,
    }

    const submissionDate = submitted_at.slice(0, 10)
    const path = `submissions/date=${submissionDate}/assessment=${assessment_id}.jsonl`
    const existing = await readRepoFile(path)
    const existingLines = existing.content
      ? existing.content.split('\n').filter(Boolean).map((line) => JSON.parse(line))
      : []
    const duplicate = existingLines.find((line) => line.session_id === session_id)

    if (duplicate) {
      return sendJson(res, 200, {
        ok: true,
        duplicate: true,
        raw_score: duplicate.raw_score,
        pct_correct: duplicate.pct_correct,
        mastery_band: duplicate.mastery_band,
      })
    }

    const nextContent = `${existing.content}${JSON.stringify(record)}\n`
    await writeRepoFile(
      path,
      nextContent,
      `Record assessment submission ${assessment_id} ${session_id}`,
      existing.sha ?? undefined,
    )

    return sendJson(res, 200, { ok: true, raw_score, pct_correct, mastery_band })
  } catch (error) {
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Unable to record assessment submission.',
    })
  }
}
