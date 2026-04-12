import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = verifyAdmin(request)
  if (authError) return authError

  const { id } = await params
  const supabase = createServerClient()
  const { data } = await supabase.from('emails').select('*').eq('id', id).single()
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = verifyAdmin(request)
  if (authError) return authError

  const { id } = await params
  const supabase = createServerClient()
  const body = await request.json()

  // Only allow editing these fields
  const { subject, preview_text, content_html } = body
  const allowedFields: Record<string, unknown> = {}
  if (subject !== undefined) allowedFields.subject = subject
  if (preview_text !== undefined) allowedFields.preview_text = preview_text
  if (content_html !== undefined) allowedFields.content_html = content_html

  const { data, error } = await supabase
    .from('emails')
    .update(allowedFields)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
