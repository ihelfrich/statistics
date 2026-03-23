export function corsHeaders() {
  const configured = process.env.ASSESSMENT_ALLOWED_ORIGINS
  const allowOrigin = configured ? configured.split(',')[0].trim() : '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  const headers = corsHeaders()
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value)
  })
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }

  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
