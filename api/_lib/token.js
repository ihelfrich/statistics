import { createHmac, timingSafeEqual } from 'node:crypto'

function base64urlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64urlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

export function signSessionToken(payload, secret) {
  const encodedPayload = base64urlEncode(JSON.stringify(payload))
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url')
  return `${encodedPayload}.${signature}`
}

export function verifySessionToken(token, secret) {
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) {
    throw new Error('Malformed session token.')
  }

  const expected = createHmac('sha256', secret).update(encodedPayload).digest('base64url')
  const isValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  if (!isValid) {
    throw new Error('Invalid session token signature.')
  }

  return JSON.parse(base64urlDecode(encodedPayload))
}
