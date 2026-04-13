import { NextRequest, NextResponse } from 'next/server'
import { generateNewsletter } from '@/lib/ai/pipeline'
import { getApprovedNewsForGeneration, markNewsAsUsed } from '@/lib/ai/news-selection'
import { createServerClient } from '@/lib/supabase-server'
import { sendDraftNotification, sendErrorNotification, sendTelegramMessage } from '@/lib/telegram'
import { randomUUID } from 'crypto'

function getMondayOfThisWeek(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

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

  try {
    // Mark any unresolved previous drafts as skipped
    await supabase
      .from('emails')
      .update({ status: 'skipped', approval_status: 'skipped' })
      .in('approval_status', ['pending_approval', 'pending_feedback'])

    // Fetch approved, unused news from the current week
    let news: string
    try {
      news = await getApprovedNewsForGeneration(supabase)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await sendTelegramMessage(`⚠️ Geração cancelada: ${msg}`)
      return NextResponse.json({ ok: true, skipped: true, reason: msg })
    }

    // Get IDs of approved news used in this generation (for marking as used later)
    const monday = getMondayOfThisWeek()
    const { data: approvedRows } = await supabase
      .from('news_candidates')
      .select('id')
      .eq('status', 'approved')
      .is('used_in_email_id', null)
      .gte('fetched_at', monday)
      .order('created_at', { ascending: false })
      .limit(5)

    const result = await generateNewsletter(news)

    const previewToken = randomUUID()
    const previewTokenExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

    const { data, error: insertError } = await supabase
      .from('emails')
      .insert({
        content_html: result.winningContent,
        subject: result.subject,
        preview_text: result.previewText,
        winning_model: result.winningModel,
        evaluator_justification: result.justification,
        model_outputs: result.allOutputs,
        status: 'draft',
        approval_status: 'pending_approval',
        preview_token: previewToken,
        preview_token_expires_at: previewTokenExpiresAt,
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    // Mark news candidates as used — prevents reuse in future editions
    if (approvedRows?.length) {
      await markNewsAsUsed(
        supabase,
        approvedRows.map((r: { id: string }) => r.id),
        data.id,
      )
    }

    const telegramMessageId = await sendDraftNotification({
      subject: result.subject,
      previewText: result.previewText,
      previewToken: previewToken,
    })

    await supabase
      .from('emails')
      .update({ telegram_message_id: telegramMessageId })
      .eq('id', data.id)

    return NextResponse.json({ ok: true, winningModel: result.winningModel, id: data.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await sendErrorNotification('gerar newsletter', message).catch(() => {})
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
