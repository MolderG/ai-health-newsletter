import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Obrigado() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <Card className="max-w-md w-full shadow-md border-zinc-200">
          <CardContent className="p-8 text-center space-y-5">
            <div className="mx-auto h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
              <MailCheck className="h-8 w-8 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-zinc-900">Verifique seu email</h1>
              <p className="text-zinc-500">
                Enviamos um link de confirmação para o seu email.
                Clique no link para ativar sua assinatura.
              </p>
            </div>
            <p className="text-sm text-zinc-400">
              Não encontrou? Verifique a caixa de spam ou lixo eletrônico.
            </p>
            <Button variant="outline" asChild className="mt-2">
              <Link href="/">Voltar ao início</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
