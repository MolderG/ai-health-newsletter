'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Email = {
  id: string; subject: string; preview_text: string
  content_html: string; winning_model: string
  evaluator_justification: string; status: string
}

export default function EditEdition() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [email, setEmail] = useState<Email | null>(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/emails/${id}`).then(r => r.json()).then(setEmail)
  }, [id])

  async function save(updates: Partial<Email>) {
    setSaving(true)
    const res = await fetch(`/api/admin/emails/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const updated = await res.json()
    setEmail(updated)
    setSaving(false)
  }

  async function handleSend() {
    if (!confirm(`Enviar para todos os assinantes ativos?`)) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: id }),
      })
      const data = await res.json()
      alert(`Enviado: ${data.sent} | Erros: ${data.errors}`)
      router.push('/admin/editions')
    } finally {
      setSending(false)
    }
  }

  if (!email) return <div className="p-6 text-gray-400">Carregando...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar edição</h1>
        <div className="flex gap-2">
          <button onClick={() => setPreview(!preview)}
            className="border px-4 py-2 rounded-lg text-sm">
            {preview ? 'Editar' : 'Preview'}
          </button>
          <button onClick={handleSend} disabled={sending || email.status === 'sent'}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">
            {sending ? 'Enviando...' : email.status === 'sent' ? 'Já enviado' : 'Aprovar e Enviar'}
          </button>
        </div>
      </div>

      {email.evaluator_justification && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-medium text-blue-800">Modelo vencedor: {email.winning_model}</p>
          <p className="text-blue-600 mt-1">{email.evaluator_justification}</p>
        </div>
      )}

      <div className="space-y-3">
        <input
          placeholder="Assunto do email"
          value={email.subject ?? ''}
          onChange={e => setEmail(prev => prev ? { ...prev, subject: e.target.value } : prev)}
          onBlur={() => save({ subject: email.subject })}
          className="w-full border rounded-lg px-4 py-3 text-sm"
        />
        <input
          placeholder="Preview text (aparece após o assunto no inbox)"
          value={email.preview_text ?? ''}
          onChange={e => setEmail(prev => prev ? { ...prev, preview_text: e.target.value } : prev)}
          onBlur={() => save({ preview_text: email.preview_text })}
          className="w-full border rounded-lg px-4 py-3 text-sm"
        />
      </div>

      {preview ? (
        <div className="border rounded-lg p-6 bg-white" dangerouslySetInnerHTML={{ __html: email.content_html }} />
      ) : (
        <textarea
          value={email.content_html ?? ''}
          onChange={e => setEmail(prev => prev ? { ...prev, content_html: e.target.value } : prev)}
          onBlur={() => save({ content_html: email.content_html })}
          className="w-full border rounded-lg px-4 py-3 text-sm font-mono h-96"
        />
      )}

      {saving && <p className="text-xs text-gray-400">Salvando...</p>}
    </div>
  )
}
