import { randomUUID } from 'node:crypto'
import { getDiagnosticForm } from '../_lib/form-manifests.js'
import { readJsonBody, sendJson } from '../_lib/http.js'
import { signSessionToken } from '../_lib/token.js'

function parseTestCodes() {
  const raw = process.env.ASSESSMENT_TEST_CODES_JSON
  if (!raw) {
    throw new Error('Missing ASSESSMENT_TEST_CODES_JSON configuration.')
  }
  return JSON.parse(raw)
}

function isExpired(expires_at) {
  if (!expires_at) {
    return false
  }
  return new Date(expires_at).getTime() < Date.now()
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
    const { assessment_id, student_id, test_code, consent_accepted } = body

    if (!assessment_id || !student_id || !test_code || !consent_accepted) {
      return sendJson(res, 400, { error: 'assessment_id, student_id, test_code, and consent_accepted are required.' })
    }

    if (!/^[A-Za-z0-9_-]{4,40}$/.test(student_id) || student_id.includes('@')) {
      return sendJson(res, 400, { error: 'student_id must be a pseudonymous issued ID with no direct personal identifiers.' })
    }

    const form = getDiagnosticForm(assessment_id)
    if (!form) {
      return sendJson(res, 404, { error: 'Unknown recorded assessment.' })
    }

    const codes = parseTestCodes()
    const codeConfig = codes[test_code]
    if (!codeConfig) {
      return sendJson(res, 403, { error: 'Invalid test code.' })
    }
    if (isExpired(codeConfig.expires_at)) {
      return sendJson(res, 403, { error: 'This test code has expired.' })
    }

    const allowedAssessments = codeConfig.assessment_ids ?? []
    if (!allowedAssessments.includes(assessment_id)) {
      return sendJson(res, 403, { error: 'This test code is not valid for the requested assessment.' })
    }

    const secret = process.env.ASSESSMENT_SESSION_SECRET
    if (!secret) {
      throw new Error('Missing ASSESSMENT_SESSION_SECRET configuration.')
    }

    const started_at = new Date().toISOString()
    const sessionPayload = {
      session_id: randomUUID(),
      assessment_id,
      form_version: form.form_version,
      student_id,
      test_code,
      started_at,
    }

    return sendJson(res, 200, {
      ...sessionPayload,
      session_token: signSessionToken(sessionPayload, secret),
      duration_minutes: form.duration_minutes,
    })
  } catch (error) {
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Unable to create assessment session.',
    })
  }
}
