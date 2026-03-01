import { CheckCircle, XCircle, MailX } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import CancelForm from './CancelForm'

interface Props {
  searchParams: Promise<{ token?: string; status?: string }>
}

export default async function Cancelar({ searchParams }: Props) {
  const params = await searchParams
  const { token, status } = params

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        {token ? (
          <CancelForm token={token} />
        ) : status === 'cancelled' ? (
          <Card className="max-w-md w-full shadow-md border-zinc-200">
            <CardContent className="p-8 text-center space-y-5">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-zinc-900">Inscrição cancelada</h1>
                <p className="text-zinc-500">
                  Sua inscrição foi cancelada com sucesso. Você não receberá mais emails do AI Health
                  Newsletter.
                </p>
              </div>
              <Button variant="outline" asChild className="mt-2">
                <Link href="/">Voltar ao início</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-md w-full shadow-md border-zinc-200">
            <CardContent className="p-8 text-center space-y-5">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
                {status === 'error' ? (
                  <XCircle className="h-8 w-8 text-red-500" />
                ) : (
                  <MailX className="h-8 w-8 text-red-500" />
                )}
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-zinc-900">Link inválido</h1>
                <p className="text-zinc-500">
                  {status === 'error'
                    ? 'Ocorreu um erro ao cancelar sua inscrição. Por favor, tente novamente.'
                    : 'Este link de cancelamento é inválido ou expirou.'}
                </p>
              </div>
              <p className="text-sm text-zinc-400">
                Se precisar de ajuda, entre em contato pelo email do rodapé do newsletter.
              </p>
              <Button variant="outline" asChild className="mt-2">
                <Link href="/">Voltar ao início</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  )
}
