import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sendNewsletter } from '@/lib/newsletter-sender'
import { searchHealthAINews } from '@/lib/ai/perplexity'
import { generateNewsletter } from '@/lib/ai/pipeline'
import {
  sendTelegramMessage,
  sendDraftNotification,
  answerCallbackQuery,
  removeInlineKeyboard,
  sendErrorNotification,
} from '@/lib/telegram'
import { randomUUID } from 'crypto'

export const maxDuration = 300

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    chat: { id: number }
    text?: string
  }
  callback_query?: {
    id: string
    message: { message_id: number; chat: { id: number } }
    data: string
  }
}

function getActiveDraft(supabase: ReturnType<typeof createServerClient>) {
  return supabase
    .from('emails')
    .select('id, approval_status, send_immediately, telegram_message_id, subject, preview_text, approval_feedback')
    .in('approval_status', ['pending_approval', 'pending_feedback'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
}

export async function POST(request: NextRequest) {
  // Validate Telegram webhook secret
  const secret = request.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const update: TelegramUpdate = await request.json()
  const expectedChatId = Number(process.env.TELEGRAM_CHAT_ID)

  // Determine chat ID from update type and validate
  const chatId = update.callback_query?.message.chat.id ?? update.message?.chat.id
  if (chatId !== expectedChatId) {
    return NextResponse.json({ ok: true }) // Ignore silently
  }

  const supabase = createServerClient()

  // ── APPROVE / REJECT (inline button) ─────────────────────────────────
  if (update.callback_query) {
    const cbq = update.callback_query
    await answerCallbackQuery(cbq.id)

    const { data: email } = await getActiveDraft(supabase)
    if (!email) {
      return NextResponse.json({ ok: true })
    }

    if (cbq.data === 'approve') {
      // Only approve from pending_approval state — not from pending_feedback
      if (email.approval_status !== 'pending_approval') {
        return NextResponse.json({ ok: true })
      }
      if (email.send_immediately) {
        // Send immediately
        await sendTelegramMessage('✅ Newsletter aprovada! Enviando agora...')
        try {
          await sendNewsletter(email.id)
          await supabase
            .from('emails')
            .update({ approval_status: 'sent', status: 'sent' })
            .eq('id', email.id)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          await sendErrorNotification('enviar newsletter', msg)
        }
      } else {
        // Schedule for Monday send cron
        await supabase
          .from('emails')
          .update({ approval_status: 'approved', status: 'scheduled' })
          .eq('id', email.id)
        await sendTelegramMessage('✅ Newsletter aprovada! Será enviada segunda às 9h.')
      }
    }

    if (cbq.data === 'reject') {
      // Remove buttons from old message so editor can't re-click
      if (email.telegram_message_id) {
        await removeInlineKeyboard(email.telegram_message_id).catch(() => {})
      }
      await supabase
        .from('emails')
        .update({ approval_status: 'pending_feedback' })
        .eq('id', email.id)
      await sendTelegramMessage('Quais são as melhorias a serem feitas?')
    }

    return NextResponse.json({ ok: true })
  }

  // ── FEEDBACK TEXT ────────────────────────────────────────────────────
  if (update.message?.text) {
    const { data: email } = await getActiveDraft(supabase)

    if (!email || email.approval_status !== 'pending_feedback') {
      return NextResponse.json({ ok: true }) // Ignore — not expecting feedback
    }

    const feedback = update.message.text
    await sendTelegramMessage('Recebido! Gerando nova versão...')

    // Optimistically mark as pending_approval to prevent double-processing on Telegram retries
    await supabase
      .from('emails')
      .update({ approval_status: 'pending_approval', approval_feedback: feedback })
      .eq('id', email.id)

    // After responding 200, run regeneration asynchronously
    after(async () => {
      try {
        const news = await searchHealthAINews()
        const result = await generateNewsletter(news, feedback)

        const previewToken = randomUUID()
        const previewTokenExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

        await supabase
          .from('emails')
          .update({
            content_html: result.winningContent,
            subject: result.subject,
            preview_text: result.previewText,
            winning_model: result.winningModel,
            evaluator_justification: result.justification,
            model_outputs: result.allOutputs,
            approval_feedback: feedback,
            approval_status: 'pending_approval',
            preview_token: previewToken,
            preview_token_expires_at: previewTokenExpiresAt,
          })
          .eq('id', email.id)

        const newMessageId = await sendDraftNotification({
          subject: result.subject,
          previewText: result.previewText,
          previewToken: previewToken,
        })

        await supabase
          .from('emails')
          .update({ telegram_message_id: newMessageId })
          .eq('id', email.id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        await sendErrorNotification('regenerar newsletter', msg)
        // Reset so editor can try again
        await supabase
          .from('emails')
          .update({ approval_status: 'pending_feedback' })
          .eq('id', email.id)
      }
    })
  }

  return NextResponse.json({ ok: true })
}
