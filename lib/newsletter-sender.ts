import { Resend } from 'resend'
import { createServerClient } from './supabase-server'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

const MAX_RETRIES = 3

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === retries) throw err
      // Exponential backoff: 500ms, 1s, 2s
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)))
    }
  }
  throw new Error('unreachable')
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
  if (email.status === 'sent') throw new Error('Newsletter already sent')

  // Get all active subscribers
  const { data: subscribers } = await supabase
    .from('subscribers')
    .select('id, email, name, confirmation_token')
    .eq('status', 'active')

  if (!subscribers?.length) return { sent: 0, errors: 0 }

  let sent = 0
  let errors = 0

  // Send in batches of 50
  for (let i = 0; i < subscribers.length; i += 50) {
    const batch = subscribers.slice(i, i + 50)
    const results = await Promise.allSettled(
      batch.map(sub => {
        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/cancelar?token=${sub.confirmation_token}`
        const footerHtml = `
  <div style="text-align:center;padding:16px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;margin-top:32px">
    Você está recebendo este email porque se inscreveu no newsletter.<br>
    <a href="${unsubscribeUrl}" style="color:#6b7280">Cancelar inscrição</a>
  </div>
`
        return withRetry(() =>
          getResend().emails.send({
            from: `AI Health Newsletter <${process.env.RESEND_FROM_EMAIL ?? 'newsletter@seudominio.com.br'}>`,
            to: sub.email,
            subject: email.subject,
            html: email.content_html + footerHtml,
            tags: [{ name: 'email_id', value: emailId }],
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
            },
          })
        )
      })
    )
    sent += results.filter(r => r.status === 'fulfilled').length
    errors += results.filter(r => r.status === 'rejected').length
  }

  // Mark as sent only if at least one email was delivered
  if (sent > 0) {
    await supabase
      .from('emails')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', emailId)
  }

  return { sent, errors }
}
