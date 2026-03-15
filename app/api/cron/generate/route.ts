import { NextRequest, NextResponse } from 'next/server'
import { searchHealthAINews } from '@/lib/ai/perplexity'
import { generateNewsletter } from '@/lib/ai/pipeline'
import { createServerClient } from '@/lib/supabase-server'
import { sendDraftNotification, sendErrorNotification } from '@/lib/telegram'
import { randomUUID } from 'crypto'

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

    const news = await searchHealthAINews()
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
