import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken } from '@/lib/admin-auth'
import { timingSafeEqual } from 'crypto'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'ADMIN_SECRET not configured' }, { status: 500 })
  }

  const pwBuf = Buffer.from(password ?? '')
  const secretBuf = Buffer.from(secret)
  if (pwBuf.length !== secretBuf.length || !timingSafeEqual(pwBuf, secretBuf)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = createSessionToken(secret)
  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return response
}
