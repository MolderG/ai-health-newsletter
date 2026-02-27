import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { calculateScoreDelta } from '@/lib/lead-scoring'

// Maps Resend event types to our internal event types
function normalizeEventType(resendType: string): string {
  const map: Record<string, string> = {
    'email.opened': 'open',
    'email.clicked': 'click',
    'email.unsubscribed': 'unsubscribe',
    'email.bounced': 'bounce',
    'email.spam_complaint': 'bounce',
  }
  return map[resendType] ?? resendType
}

export async function POST(request: NextRequest) {
  const payload = await request.json()
  const { type, data } = payload

  if (!type) {
    return NextResponse.json({ error: 'Missing event type' }, { status: 400 })
  }

  const email = data?.email_to?.[0] ?? data?.to?.[0]
  if (!email) return NextResponse.json({ ok: true })

  const supabase = createServerClient()

  // Find subscriber
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('id, lead_score')
    .eq('email', email)
    .single()

  if (!subscriber) return NextResponse.json({ ok: true })

  const eventType = normalizeEventType(type)
  const urlClicked = data?.click?.link ?? null

  // Save event
  await supabase.from('email_events').insert({
    subscriber_id: subscriber.id,
    event_type: eventType,
    url_clicked: urlClicked,
  })

  // Update lead score
  const delta = calculateScoreDelta(eventType, urlClicked)
  if (delta > 0) {
    await supabase
      .from('subscribers')
      .update({ lead_score: subscriber.lead_score + delta })
      .eq('id', subscriber.id)
  }

  // Handle unsubscribe
  if (eventType === 'unsubscribe') {
    await supabase
      .from('subscribers')
      .update({ status: 'unsubscribed' })
      .eq('id', subscriber.id)
  }

  return NextResponse.json({ ok: true })
}
