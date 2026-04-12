import { NextRequest, NextResponse } from 'next/server'
import { sendNewsletter } from '@/lib/newsletter-sender'
import { verifyAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const authError = verifyAdmin(request)
  if (authError) return authError

  const { emailId } = await request.json()
  if (!emailId) return NextResponse.json({ error: 'Missing emailId' }, { status: 400 })

  try {
    const result = await sendNewsletter(emailId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
