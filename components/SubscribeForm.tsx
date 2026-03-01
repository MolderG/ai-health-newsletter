'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

const ROLES = ['Diretor', 'Gestor Hospitalar', 'TI/Tecnologia', 'Outro']

export default function SubscribeForm() {
  const [form, setForm] = useState({ name: '', email: '', role: '', hospital: '', city: '', state: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleRoleChange(value: string) {
    setForm(prev => ({ ...prev, role: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const params = new URLSearchParams(window.location.search)
    const utm = params.get('utm_source') ?? 'direct'

    try {
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
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 w-full">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome completo</Label>
        <Input
          id="name"
          name="name"
          placeholder="João Silva"
          required
          value={form.name}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email corporativo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="joao@hospital.com.br"
          required
          value={form.email}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role">Cargo</Label>
        <Select required value={form.role} onValueChange={handleRoleChange}>
          <SelectTrigger id="role">
            <SelectValue placeholder="Selecione seu cargo" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hospital">Hospital / Instituição</Label>
        <Input
          id="hospital"
          name="hospital"
          placeholder="Hospital das Clínicas"
          required
          value={form.hospital}
          onChange={handleChange}
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            name="city"
            placeholder="São Paulo"
            required
            value={form.city}
            onChange={handleChange}
          />
        </div>
        <div className="w-20 space-y-1.5">
          <Label htmlFor="state">UF</Label>
          <Input
            id="state"
            name="state"
            placeholder="SP"
            required
            value={form.state}
            onChange={handleChange}
            maxLength={2}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          'Quero receber gratuitamente'
        )}
      </Button>

      <p className="text-xs text-zinc-400 text-center">Sem spam. Cancele quando quiser.</p>
    </form>
  )
}
