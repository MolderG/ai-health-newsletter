import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/?confirmed=error', request.url))
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('subscribers')
    .update({ status: 'active', confirmed_at: new Date().toISOString() })
    .eq('confirmation_token', token)
    .eq('status', 'pending')
    .select('id')

  if (error || !data || data.length === 0) {
    return NextResponse.redirect(new URL('/?confirmed=error', request.url))
  }

  return NextResponse.redirect(new URL('/?confirmed=true', request.url))
}
