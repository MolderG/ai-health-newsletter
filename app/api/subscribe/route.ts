import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase-server'
import { confirmationEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const body = await request.json()
  const { name, email, role, hospital, city, state } = body

  if (!email || !name) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
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

  const { error: emailError } = await resend.emails.send({
    from: 'AI Health Newsletter <newsletter@seudominio.com.br>',
    to: email,
    subject: 'Confirme sua assinatura — AI Health Newsletter',
    html: confirmationEmail(name, confirmUrl),
  })

  if (emailError) {
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
