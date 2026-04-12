import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase-server'
import { confirmationEmail } from '@/lib/email-templates'
import { checkRateLimit } from '@/lib/rate-limit'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_PER_IP = 5
const RATE_LIMIT_PER_EMAIL = 3

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, email, role, hospital, city, state } = body

  if (!email || !name) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipCheck = await checkRateLimit(`subscribe:ip:${ip}`, RATE_LIMIT_PER_IP, RATE_LIMIT_WINDOW_MS)
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    )
  }

  // Rate limit by email
  const emailCheck = await checkRateLimit(`subscribe:email:${email}`, RATE_LIMIT_PER_EMAIL, RATE_LIMIT_WINDOW_MS)
  if (!emailCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests for this email. Try again later.' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    )
  }

  const source = request.nextUrl.searchParams.get('utm_source') ?? 'direct'
  const supabase = createServerClient()

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('subscribers')
    .select('id, status, confirmation_token')
    .eq('email', email)
    .single()

  if (existing?.status === 'active') {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 409 })
  }

  let confirmationToken: string

  if (existing) {
    confirmationToken = existing.confirmation_token
  } else {
    const { data, error } = await supabase
      .from('subscribers')
      .insert({ name, email, role, hospital, city, state, source })
      .select('id, confirmation_token')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to save subscriber' }, { status: 500 })
    }
    confirmationToken = data.confirmation_token
  }

  const confirmUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/confirm?token=${confirmationToken}`

  const { error: emailError } = await getResend().emails.send({
    from: `AI Health Newsletter <${process.env.RESEND_FROM_EMAIL ?? 'newsletter@seudominio.com.br'}>`,
    to: email,
    subject: 'Confirme sua assinatura — AI Health Newsletter',
    html: confirmationEmail(name, confirmUrl),
  })

  if (emailError) {
    console.error('Resend error:', emailError)
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
