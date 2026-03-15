import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sendNewsletter } from '@/lib/newsletter-sender'
import {
  sendMissedSendNotification,
  sendErrorNotification,
} from '@/lib/telegram'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Find the scheduled email
  const { data: email } = await supabase
    .from('emails')
    .select('id')
    .eq('status', 'scheduled')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (email) {
    try {
      const result = await sendNewsletter(email.id)
      await supabase
        .from('emails')
        .update({ approval_status: 'sent', status: 'sent' })
        .eq('id', email.id)
      return NextResponse.json({ ok: true, ...result })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      // Already sent (e.g. admin panel sent it manually) — no-op, no notification
      if (message === 'Newsletter already sent') {
        return NextResponse.json({ ok: true, sent: 0, alreadySent: true })
      }
      await sendErrorNotification('enviar newsletter', message).catch(() => {})
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  // No scheduled email — notify editor and mark pending draft as send_immediately.
  // Check both pending_approval and pending_feedback so the flag is set even if
  // a regeneration cycle is underway (editor will send immediately on next approval).
  const { data: pendingEmail } = await supabase
    .from('emails')
    .select('id')
    .in('approval_status', ['pending_approval', 'pending_feedback'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (pendingEmail) {
    const missedMsgId = await sendMissedSendNotification().catch(() => null)
    await supabase
      .from('emails')
      .update({
        send_immediately: true,
        ...(missedMsgId ? { telegram_message_id: missedMsgId } : {}),
      })
      .eq('id', pendingEmail.id)
  } else {
    await sendMissedSendNotification().catch(() => {})
  }

  return NextResponse.json({ ok: true, sent: 0, notified: true })
}
