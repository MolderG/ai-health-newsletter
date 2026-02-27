import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createServerClient } from '@/lib/supabase-server'
import { calculateScoreDelta } from '@/lib/lead-scoring'

// Maps Resend event types to our internal event types
function normalizeEventType(resendType: string): string {
  const map: Record<string, string> = {
    'email.opened': 'open',
    'email.clicked': 'click',
    'email.unsubscribed': 'unsubscribe',
    'email.bounced': 'bounce',
  }
  return map[resendType] ?? resendType
}

export async function POST(request: NextRequest) {
  // Verify Resend webhook signature
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  let payload: { type: string; data: Record<string, unknown> }

  if (webhookSecret) {
    const wh = new Webhook(webhookSecret)
    const svixId = request.headers.get('svix-id')
    const svixTimestamp = request.headers.get('svix-timestamp')
    const svixSignature = request.headers.get('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
    }

    const body = await request.text()
    try {
      wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      })
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    payload = JSON.parse(body)
  } else {
    payload = await request.json()
  }

  const { type, data } = payload

  if (!type) {
    return NextResponse.json({ error: 'Missing event type' }, { status: 400 })
  }

  const emailTo = data?.email_to as string[] | undefined
  const emailToAlt = data?.to as string[] | undefined
  const email = emailTo?.[0] ?? emailToAlt?.[0]
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
  const clickData = data?.click as { link?: string } | undefined
  const urlClicked = clickData?.link ?? null

  // Extract email_id from tags to link event to the edition
  const tags = data?.tags as Array<{ name: string; value: string }> | undefined
  const emailId = tags?.find((t) => t.name === 'email_id')?.value ?? null

  // Save event
  await supabase.from('email_events').insert({
    subscriber_id: subscriber.id,
    email_id: emailId,
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
