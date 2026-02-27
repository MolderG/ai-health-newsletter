'use client'
import { useEffect, useState } from 'react'
import { getLeadTemperature } from '@/lib/lead-scoring'

type Subscriber = {
  id: string; name: string; email: string; role: string
  hospital: string; city: string; state: string
  lead_score: number; status: string; created_at: string
}

const TEMP_COLORS = { cold: 'text-blue-500', warm: 'text-yellow-500', hot: 'text-red-500' }
const TEMP_LABELS = { cold: '❄️ Frio', warm: '🌡️ Morno', hot: '🔥 Quente' }

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
        <h1 className="text-xl font-semibold">Leads ({subscribers.length})</h1>
        <input
          placeholder="Buscar por nome, email ou hospital..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-72"
        />
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {['Nome', 'Hospital', 'Cargo', 'Cidade', 'Score', 'Status', 'Cadastro'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(s => {
              const temp = getLeadTemperature(s.lead_score)
              return (
                <tr key={s.id} className={temp === 'hot' ? 'bg-red-50' : ''}>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.hospital}</td>
                  <td className="px-4 py-3 text-gray-600">{s.role}</td>
                  <td className="px-4 py-3 text-gray-600">{s.city}/{s.state}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${TEMP_COLORS[temp]}`}>
                      {s.lead_score} {TEMP_LABELS[temp]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.status}</td>
                  <td className="px-4 py-3 text-gray-500">
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
