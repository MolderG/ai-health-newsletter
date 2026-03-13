'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

type Email = { id: string; subject: string; status: string; winning_model: string; created_at: string }

const STATUS_PILLS: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700 border border-amber-200',
  scheduled: 'bg-blue-50 text-blue-700 border border-blue-200',
  sent: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  sent: 'Enviado',
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
        <h1 className="text-xl font-semibold text-slate-900">Edições</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 bg-emerald-400 text-slate-950 hover:bg-emerald-300 font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-60 transition-colors duration-150"
        >
          {generating ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
              Gerando com IA...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Gerar nova edição
            </>
          )}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden divide-y divide-slate-100">
        {emails.map(e => (
          <Link
            key={e.id}
            href={`/admin/editions/${e.id}`}
            className="group flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors duration-100"
          >
            <div>
              <p className="font-medium text-sm text-slate-900 group-hover:text-emerald-700 transition-colors duration-150">
                {e.subject ?? '(sem assunto)'}
              </p>
              <p className="font-mono text-xs text-slate-400 mt-0.5">
                {e.winning_model} · {new Date(e.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_PILLS[e.status] ?? 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
              {STATUS_LABELS[e.status] ?? e.status}
            </span>
          </Link>
        ))}
        {emails.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-400 text-sm">Nenhuma edição ainda. Gere a primeira!</p>
        )}
      </div>
    </div>
  )
}
