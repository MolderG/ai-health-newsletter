import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function createSessionToken(secret: string): string {
  const nonce = randomBytes(32).toString('hex')
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS
  const payload = `${nonce}.${expiresAt}`
  const signature = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${signature}`
}

export function validateSessionToken(token: string, secret: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false

  const [nonce, expiresAtStr, signature] = parts
  const payload = `${nonce}.${expiresAtStr}`
  const expected = createHmac('sha256', secret).update(payload).digest('hex')

  // Timing-safe comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature, 'hex')
  const expBuf = Buffer.from(expected, 'hex')
  if (sigBuf.length !== expBuf.length) return false
  if (!timingSafeEqual(sigBuf, expBuf)) return false

  // Check expiration
  if (Date.now() > Number(expiresAtStr)) return false

  return true
}

/**
 * Verifies the admin session cookie. Returns null if valid, or a 401 response if not.
 */
export function verifyAdmin(request: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'ADMIN_SECRET not configured' }, { status: 500 })
  }

  const token = request.cookies.get('admin_token')?.value
  if (!token || !validateSessionToken(token, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
