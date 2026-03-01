import { Brain, BarChart2, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const props = [
  {
    icon: Brain,
    title: 'Curadoria inteligente',
    desc: 'Conteúdo filtrado por IA e revisado por especialista, sem ruído informacional.',
  },
  {
    icon: BarChart2,
    title: 'Foco em gestão',
    desc: 'Análises práticas orientadas a decisões em ambiente hospitalar e saúde corporativa.',
  },
  {
    icon: Mail,
    title: 'Semanal e gratuita',
    desc: 'Toda semana na sua caixa de entrada — sem spam, cancele quando quiser.',
  },
]

export default function ValueProps() {
  return (
    <section className="py-16 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-zinc-900">Por que assinar?</h2>
          <p className="text-zinc-500 mt-2">O que você recebe toda semana</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {props.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-zinc-200">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-zinc-900">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
