import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  const [subscribersRes, emailsRes, eventsRes] = await Promise.all([
    supabase.from('subscribers').select('id, status, source, lead_score, created_at'),
    supabase.from('emails').select('id, subject, sent_at, status'),
    supabase.from('email_events').select('email_id, event_type'),
  ])

  const subscribers = subscribersRes.data ?? []
  const emails = emailsRes.data ?? []
  const events = eventsRes.data ?? []

  const totalActive = subscribers.filter(s => s.status === 'active').length
  const hotLeads = subscribers.filter(s => s.lead_score >= 51).length

  const emailStats = emails.filter(e => e.status === 'sent').map(email => {
    const emailEvents = events.filter(e => e.email_id === email.id)
    const opens = emailEvents.filter(e => e.event_type === 'open').length
    const clicks = emailEvents.filter(e => e.event_type === 'click').length
    return {
      id: email.id,
      subject: email.subject,
      sent_at: email.sent_at,
      opens,
      clicks,
      openRate: totalActive > 0 ? ((opens / totalActive) * 100).toFixed(1) : '0',
      clickRate: totalActive > 0 ? ((clicks / totalActive) * 100).toFixed(1) : '0',
    }
  })

  const sourceCount = subscribers.reduce<Record<string, number>>((acc, s) => {
    const src = s.source ?? 'direct'
    acc[src] = (acc[src] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({ totalActive, hotLeads, emailStats, sourceCount })
}
