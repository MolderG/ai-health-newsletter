import { Resend } from 'resend'
import { createServerClient } from './supabase-server'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

export async function sendNewsletter(emailId: string): Promise<{ sent: number; errors: number }> {
  const supabase = createServerClient()

  // Get the email
  const { data: email } = await supabase
    .from('emails')
    .select('*')
    .eq('id', emailId)
    .single()

  if (!email) throw new Error('Email not found')
  if (!email.subject) throw new Error('Email has no subject')

  // Get all active subscribers
  const { data: subscribers } = await supabase
    .from('subscribers')
    .select('id, email, name')
    .eq('status', 'active')

  if (!subscribers?.length) return { sent: 0, errors: 0 }

  let sent = 0
  let errors = 0

  // Send in batches of 50
  for (let i = 0; i < subscribers.length; i += 50) {
    const batch = subscribers.slice(i, i + 50)
    const results = await Promise.allSettled(
      batch.map(sub =>
        getResend().emails.send({
          from: `AI Health Newsletter <${process.env.RESEND_FROM_EMAIL ?? 'newsletter@seudominio.com.br'}>`,
          to: sub.email,
          subject: email.subject,
          html: email.content_html,
          headers: {
            'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_BASE_URL}/api/unsubscribe?email=${sub.email}>`,
          },
        })
      )
    )
    sent += results.filter(r => r.status === 'fulfilled').length
    errors += results.filter(r => r.status === 'rejected').length
  }

  // Mark as sent
  await supabase
    .from('emails')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', emailId)

  return { sent, errors }
}
