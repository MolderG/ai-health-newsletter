'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Email = { id: string; subject: string; status: string; winning_model: string; created_at: string }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
}

export default function AdminEditions() {
  const [emails, setEmails] = useState<Email[]>([])
  const [generating, setGenerating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/emails').then(r => r.json()).then(setEmails)
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/generate', { method: 'POST' })
      const data = await res.json()
      if (data.id) router.push(`/admin/editions/${data.id}`)
      else alert('Erro ao gerar: ' + data.error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edições</h1>
        <button onClick={handleGenerate} disabled={generating}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">
          {generating ? 'Gerando com IA...' : '+ Gerar nova edição'}
        </button>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {emails.map(e => (
          <Link key={e.id} href={`/admin/editions/${e.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
            <div>
              <p className="font-medium text-sm">{e.subject ?? '(sem assunto)'}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Modelo: {e.winning_model} · {new Date(e.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[e.status] ?? ''}`}>
              {e.status}
            </span>
          </Link>
        ))}
        {emails.length === 0 && (
          <p className="px-4 py-8 text-center text-gray-400 text-sm">Nenhuma edição ainda. Gere a primeira!</p>
        )}
      </div>
    </div>
  )
}
