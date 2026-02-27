'use client'
import { useEffect, useState } from 'react'

type Analytics = {
  totalActive: number
  hotLeads: number
  emailStats: { id: string; subject: string; sent_at: string; opens: number; clicks: number; openRate: string; clickRate: string }[]
  sourceCount: Record<string, number>
}

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null)

  useEffect(() => {
    fetch('/api/admin/analytics').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <div className="text-gray-400">Carregando...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Assinantes ativos', value: data.totalActive },
          { label: 'Leads quentes 🔥', value: data.hotLeads },
        ].map(card => (
          <div key={card.label} className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="font-medium">Performance das edições</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              {['Assunto', 'Enviado em', 'Aberturas', 'Taxa abertura', 'Cliques', 'Taxa clique'].map(h => (
                <th key={h} className="px-4 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.emailStats.map(e => (
              <tr key={e.id}>
                <td className="px-4 py-3 font-medium">{e.subject ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{e.sent_at ? new Date(e.sent_at).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="px-4 py-3">{e.opens}</td>
                <td className="px-4 py-3">{e.openRate}%</td>
                <td className="px-4 py-3">{e.clicks}</td>
                <td className="px-4 py-3">{e.clickRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-medium mb-3">Origem dos leads</h2>
        <div className="space-y-2">
          {Object.entries(data.sourceCount).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
            <div key={source} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{source}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
