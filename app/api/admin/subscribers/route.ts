import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const authError = verifyAdmin(request)
  if (authError) return authError

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('subscribers')
    .select('*')
    .order('lead_score', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
