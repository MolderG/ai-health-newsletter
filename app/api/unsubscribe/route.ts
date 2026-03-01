import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token } = body

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('id')
    .eq('confirmation_token', token)
    .eq('status', 'active')
    .single()

  if (!subscriber) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  }

  await supabase
    .from('subscribers')
    .update({ status: 'unsubscribed' })
    .eq('id', subscriber.id)

  return NextResponse.json({ ok: true })
}
