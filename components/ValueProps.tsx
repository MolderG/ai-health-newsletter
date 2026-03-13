import { Brain, BarChart2, Mail } from 'lucide-react'

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
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-serif italic text-3xl text-zinc-900">Por que assinar?</h2>
          <p className="text-zinc-500 mt-2">O que você recebe toda semana</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {props.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="border border-zinc-200 border-l-4 border-l-emerald-400 rounded-lg p-6 space-y-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-white"
            >
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Icon className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-zinc-900">{title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
