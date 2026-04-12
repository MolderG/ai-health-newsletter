import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const authError = verifyAdmin(request)
  if (authError) return authError

  const supabase = createServerClient()
  const { data } = await supabase
    .from('emails')
    .select('id, subject, status, winning_model, created_at, sent_at, scheduled_at')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
