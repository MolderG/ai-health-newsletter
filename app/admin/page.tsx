'use client'
import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { getLeadTemperature } from '@/lib/lead-scoring'

type Subscriber = {
  id: string; name: string; email: string; role: string
  hospital: string; city: string; state: string
  lead_score: number; status: string; created_at: string
}

const TEMP_PILLS = {
  cold: 'bg-blue-50 text-blue-700 border border-blue-200',
  warm: 'bg-amber-50 text-amber-700 border border-amber-200',
  hot: 'bg-red-50 text-red-700 border border-red-200',
}
const TEMP_LABELS = { cold: '❄️ Frio', warm: '🌡️ Morno', hot: '🔥 Quente' }

const STATUS_PILLS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pending: 'bg-slate-100 text-slate-600 border border-slate-200',
  unsubscribed: 'bg-zinc-100 text-zinc-500 border border-zinc-200',
}

export default function AdminLeads() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/admin/subscribers').then(r => r.json()).then(setSubscribers)
  }, [])

  const filtered = subscribers.filter(s =>
    s.name?.toLowerCase().includes(filter.toLowerCase()) ||
    s.hospital?.toLowerCase().includes(filter.toLowerCase()) ||
    s.email?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Leads ({subscribers.length})</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            placeholder="Buscar por nome, email ou hospital..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-72 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
            <tr>
              {['Nome', 'Hospital', 'Cargo', 'Cidade', 'Score', 'Status', 'Cadastro'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(s => {
              const temp = getLeadTemperature(s.lead_score)
              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors duration-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.hospital}</td>
                  <td className="px-4 py-3 text-slate-600">{s.role}</td>
                  <td className="px-4 py-3 text-slate-600">{s.city}/{s.state}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 ${TEMP_PILLS[temp]}`}>
                      <span className="font-mono font-semibold">{s.lead_score}</span>
                      {TEMP_LABELS[temp]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full text-xs font-medium px-2.5 py-1 ${STATUS_PILLS[s.status] ?? 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {new Date(s.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
