import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { searchHealthAINews } from '@/lib/ai/perplexity'
import { generateNewsletter } from '@/lib/ai/pipeline'
import { verifyAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const authError = verifyAdmin(request)
  if (authError) return authError

  try {
    // 1. Search for news
    const news = await searchHealthAINews()

    // 2. Generate with 3 models + evaluate
    const result = await generateNewsletter(news)

    // 3. Save draft to Supabase
    const supabase = createServerClient()
    const { data, error } = await supabase
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

    if (error) throw error

    return NextResponse.json({ id: data.id, justification: result.justification, winningModel: result.winningModel })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
