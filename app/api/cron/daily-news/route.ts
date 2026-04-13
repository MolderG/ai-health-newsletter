import { NextRequest, NextResponse } from 'next/server'
import { searchDailyHealthAINews } from '@/lib/ai/perplexity'
import { createServerClient } from '@/lib/supabase-server'
import { sendNewsCandidateNotification, sendErrorNotification } from '@/lib/telegram'

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
    const items = await searchDailyHealthAINews()

    // Deduplicate: skip items whose title already exists in the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: existing } = await supabase
      .from('news_candidates')
      .select('titulo')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const existingTitles = new Set(
      (existing ?? []).map((e: { titulo: string }) => e.titulo.toLowerCase().trim())
    )

    const newItems = items.filter(
      item => !existingTitles.has(item.titulo.toLowerCase().trim())
    )

    let sentCount = 0
    for (const item of newItems) {
      const { data: candidate, error: insertError } = await supabase
        .from('news_candidates')
        .insert({
          titulo: item.titulo,
          resumo: item.resumo,
          fonte: item.fonte,
          status: 'pending',
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Failed to insert news candidate:', insertError)
        continue
      }

      const messageId = await sendNewsCandidateNotification({
        titulo: item.titulo,
        resumo: item.resumo,
        fonte: item.fonte,
        candidateId: candidate.id,
      })

      await supabase
        .from('news_candidates')
        .update({ telegram_message_id: messageId })
        .eq('id', candidate.id)

      sentCount++
    }

    return NextResponse.json({
      ok: true,
      fetched: items.length,
      deduplicated: items.length - newItems.length,
      sent: sentCount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await sendErrorNotification('buscar notícias diárias', message).catch(() => {})
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
