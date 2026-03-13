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

  if (!data) {
    return (
      <div className="flex items-center gap-3 text-slate-400 py-8">
        <span className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin" />
        Carregando...
      </div>
    )
  }

  const totalForBars = Object.values(data.sourceCount).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-slate-200 border-t-4 border-t-emerald-400 rounded-xl p-5 shadow-sm bg-white">
          <p className="text-sm text-slate-500">Assinantes ativos</p>
          <p className="font-mono text-3xl font-bold mt-1 text-slate-900">{data.totalActive}</p>
        </div>
        <div className="border border-slate-200 border-t-4 border-t-red-400 rounded-xl p-5 shadow-sm bg-white">
          <p className="text-sm text-slate-500">Leads quentes</p>
          <p className="font-mono text-3xl font-bold mt-1 text-slate-900">{data.hotLeads}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-medium text-slate-900">Performance das edições</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
            <tr>
              {['Assunto', 'Enviado em', 'Aberturas', 'Taxa abertura', 'Cliques', 'Taxa clique'].map(h => (
                <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.emailStats.map(e => (
              <tr key={e.id} className="hover:bg-slate-50 transition-colors duration-100">
                <td className="px-4 py-3 font-medium text-slate-900">{e.subject ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                  {e.sent_at ? new Date(e.sent_at).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-4 py-3 font-mono font-semibold text-slate-700">{e.opens}</td>
                <td className="px-4 py-3 font-mono text-emerald-600 font-semibold">{e.openRate}%</td>
                <td className="px-4 py-3 font-mono font-semibold text-slate-700">{e.clicks}</td>
                <td className="px-4 py-3 font-mono text-emerald-600 font-semibold">{e.clickRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 shadow-sm bg-white p-5">
        <h2 className="font-medium text-slate-900 mb-4">Origem dos leads</h2>
        <div className="space-y-3">
          {Object.entries(data.sourceCount)
            .sort((a, b) => b[1] - a[1])
            .map(([source, count]) => (
              <div key={source} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{source}</span>
                  <span className="font-mono font-semibold text-slate-700">{count}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${(count / totalForBars) * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
