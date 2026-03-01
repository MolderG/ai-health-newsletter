import { CheckCircle2, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import SubscribeForm from '@/components/SubscribeForm'

const bullets = [
  'Curadoria semanal das principais novidades de IA na saúde',
  'Análise prática para decisões em ambiente hospitalar',
  'Zero ruído — apenas o que importa para gestores',
]

interface HeroSectionProps {
  confirmed?: string
}

export default function HeroSection({ confirmed }: HeroSectionProps) {
  return (
    <section className="bg-white py-16 lg:py-24 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[3fr_2fr] gap-12 lg:gap-16 items-start">
        {/* Left column */}
        <div className="space-y-6">
          <Badge variant="secondary" className="text-xs font-semibold tracking-wide uppercase">
            Newsletter semanal • Gratuita
          </Badge>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 leading-tight tracking-tight">
            IA na Saúde — O que todo gestor hospitalar precisa saber antes de decidir
          </h1>

          <p className="text-lg text-zinc-500 leading-relaxed">
            Toda semana: as principais novidades sobre Inteligência Artificial e dados na saúde,
            com análise prática para líderes do setor hospitalar.
          </p>

          <ul className="space-y-3">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <span className="text-zinc-700">{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 text-sm text-zinc-500 pt-2">
            <Users className="h-4 w-4" />
            <span>Mais de 500 líderes de saúde já assinam</span>
          </div>
        </div>

        {/* Right column — form card */}
        <div id="inscricao" className="lg:sticky lg:top-24">
          {confirmed === 'true' ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Assinatura confirmada!</strong>
                <br />
                Bem-vindo(a) à AI Health Newsletter. Você receberá a próxima edição em breve.
              </AlertDescription>
            </Alert>
          ) : confirmed === 'error' ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Link inválido ou expirado.</strong>
                  <br />
                  Não foi possível confirmar sua assinatura. Cadastre-se novamente abaixo.
                </AlertDescription>
              </Alert>
              <Card className="shadow-lg border-zinc-200">
                <CardContent className="p-6">
                  <SubscribeForm />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="shadow-lg border-zinc-200">
              <CardContent className="p-6 space-y-2">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-zinc-900">Receba gratuitamente</h2>
                  <p className="text-sm text-zinc-500 mt-1">Para gestores, diretores e profissionais de TI hospitalar</p>
                </div>
                <SubscribeForm />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  )
}
