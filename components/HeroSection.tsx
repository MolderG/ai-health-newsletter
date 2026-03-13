import { CheckCircle2, Users } from 'lucide-react'
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
    <section className="bg-hero-mesh noise-overlay min-h-[90vh] py-32 lg:py-36 px-6 flex items-center">
      <div className="relative z-10 max-w-6xl mx-auto w-full grid lg:grid-cols-[3fr_2fr] gap-12 lg:gap-16 items-start">
        {/* Left column */}
        <div className="space-y-6">
          <div className="animate-fade-up animation-delay-100 inline-flex items-center gap-2 border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-xs font-semibold tracking-wide uppercase px-3 py-1.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Newsletter semanal • Gratuita
          </div>

          <h1 className="animate-fade-up animation-delay-200 font-serif italic text-4xl md:text-5xl lg:text-6xl text-white leading-tight">
            IA na Saúde —{' '}
            <span className="text-emerald-400">
              O que todo gestor hospitalar
            </span>{' '}
            precisa saber antes de decidir
          </h1>

          <p className="animate-fade-up animation-delay-300 text-lg text-slate-300 leading-relaxed">
            Toda semana: as principais novidades sobre Inteligência Artificial e dados na saúde,
            com análise prática para líderes do setor hospitalar.
          </p>

          <ul className="animate-fade-up animation-delay-400 space-y-3">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-slate-200">{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="animate-fade-up animation-delay-500 flex items-center gap-2 text-sm text-slate-400 pt-2">
            <Users className="h-4 w-4" />
            <span>Mais de 500 líderes de saúde já assinam</span>
          </div>
        </div>

        {/* Right column — form card */}
        <div id="inscricao" className="animate-fade-up animation-delay-300 lg:sticky lg:top-24">
          {confirmed === 'true' ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <Alert className="border-emerald-400/30 bg-emerald-400/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <AlertDescription className="text-emerald-200">
                  <strong>Assinatura confirmada!</strong>
                  <br />
                  Bem-vindo(a) à AI Health Newsletter. Você receberá a próxima edição em breve.
                </AlertDescription>
              </Alert>
            </div>
          ) : confirmed === 'error' ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Link inválido ou expirado.</strong>
                  <br />
                  Não foi possível confirmar sua assinatura. Cadastre-se novamente abaixo.
                </AlertDescription>
              </Alert>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <SubscribeForm />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] [&_label]:text-slate-200 [&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input::placeholder]:text-slate-400 [&_button[type=submit]]:bg-emerald-400 [&_button[type=submit]]:text-[#0B1120] [&_button[type=submit]]:font-semibold [&_button[type=submit]]:hover:bg-emerald-300">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">Receba gratuitamente</h2>
                <p className="text-sm text-slate-400 mt-1">Para gestores, diretores e profissionais de TI hospitalar</p>
              </div>
              <SubscribeForm />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
