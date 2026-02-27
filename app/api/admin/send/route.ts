import { NextRequest, NextResponse } from 'next/server'
import { sendNewsletter } from '@/lib/newsletter-sender'

export async function POST(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
