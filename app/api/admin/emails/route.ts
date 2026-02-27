import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data } = await supabase
    .from('emails')
    .select('id, subject, status, winning_model, created_at, sent_at, scheduled_at')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
