'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLES = ['Diretor', 'Gestor Hospitalar', 'TI / Tecnologia', 'Outro']

export default function SubscribeForm() {
  const [form, setForm] = useState({ name: '', email: '', role: '', hospital: '', city: '', state: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const params = new URLSearchParams(window.location.search)
    const utm = params.get('utm_source') ?? 'direct'

    const res = await fetch(`/api/subscribe?utm_source=${utm}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      router.push('/obrigado')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erro ao realizar cadastro. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      <input name="name" placeholder="Nome completo" required value={form.name} onChange={handleChange}
        className="w-full border rounded-lg px-4 py-3 text-sm" />
      <input name="email" type="email" placeholder="Email corporativo" required value={form.email} onChange={handleChange}
        className="w-full border rounded-lg px-4 py-3 text-sm" />
      <select name="role" required value={form.role} onChange={handleChange}
        className="w-full border rounded-lg px-4 py-3 text-sm bg-white">
        <option value="">Cargo</option>
        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <input name="hospital" placeholder="Hospital / Instituição" required value={form.hospital} onChange={handleChange}
        className="w-full border rounded-lg px-4 py-3 text-sm" />
      <div className="flex gap-2">
        <input name="city" placeholder="Cidade" required value={form.city} onChange={handleChange}
          className="flex-1 border rounded-lg px-4 py-3 text-sm" />
        <input name="state" placeholder="Estado" required value={form.state} onChange={handleChange}
          className="w-20 border rounded-lg px-4 py-3 text-sm" maxLength={2} />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-4 py-3 transition disabled:opacity-60">
        {loading ? 'Enviando...' : 'Quero receber gratuitamente'}
      </button>
      <p className="text-xs text-gray-400 text-center">Sem spam. Cancele quando quiser.</p>
    </form>
  )
}
