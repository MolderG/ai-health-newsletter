import { NextRequest, NextResponse } from 'next/server'
import { searchHealthAINews } from '@/lib/ai/perplexity'
import { generateNewsletter } from '@/lib/ai/pipeline'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const news = await searchHealthAINews()
    const result = await generateNewsletter(news)

    const supabase = createServerClient()
    await supabase.from('emails').insert({
      content_html: result.winningContent,
      winning_model: result.winningModel,
      evaluator_justification: result.justification,
      model_outputs: result.allOutputs,
      status: 'draft',
    })

    return NextResponse.json({ ok: true, winningModel: result.winningModel })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
