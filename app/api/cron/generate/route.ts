import { NextRequest, NextResponse } from 'next/server'
import { searchHealthAINews } from '@/lib/ai/perplexity'
import { generateNewsletter } from '@/lib/ai/pipeline'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const news = await searchHealthAINews()
    const result = await generateNewsletter(news)

    const supabase = createServerClient()
    const { data, error: insertError } = await supabase
      .from('emails')
      .insert({
        content_html: result.winningContent,
        winning_model: result.winningModel,
        evaluator_justification: result.justification,
        model_outputs: result.allOutputs,
        status: 'draft',
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ ok: true, winningModel: result.winningModel, id: data.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
