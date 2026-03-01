'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MailX } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  token: string
}

export default function CancelForm({ token }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    setLoading(true)
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        router.push('/cancelar?status=cancelled')
      } else {
        router.push('/cancelar?status=error')
      }
    } catch {
      router.push('/cancelar?status=error')
    }
  }

  return (
    <Card className="max-w-md w-full shadow-md border-zinc-200">
      <CardContent className="p-8 text-center space-y-5">
        <div className="mx-auto h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
          <MailX className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900">Cancelar inscrição</h1>
          <p className="text-zinc-500">
            Tem certeza que deseja cancelar sua inscrição? Você não receberá mais o AI Health Newsletter.
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? 'Cancelando...' : 'Cancelar inscrição'}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            disabled={loading}
          >
            Voltar ao início
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
