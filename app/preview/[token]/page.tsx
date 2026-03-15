import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'

interface Props {
  params: Promise<{ token: string }>
}

export default async function PreviewPage({ params }: Props) {
  const { token } = await params
  const supabase = createServerClient()

  const { data: email } = await supabase
    .from('emails')
    .select('content_html, preview_token_expires_at, subject')
    .eq('preview_token', token)
    .single()

  if (!email) notFound()

  const expired = new Date(email.preview_token_expires_at) < new Date()
  if (expired) notFound()

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <iframe
        srcDoc={email.content_html}
        style={{
          width: '100%',
          height: '100vh',
          border: 'none',
          display: 'block',
        }}
        title={`Preview: ${email.subject ?? 'Newsletter'}`}
        sandbox="allow-same-origin"
      />
    </div>
  )
}
