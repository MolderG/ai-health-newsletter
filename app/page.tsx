import SubscribeForm from '@/components/SubscribeForm'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string }>
}) {
  const { confirmed } = await searchParams

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-20 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-block bg-blue-500/30 text-blue-100 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
            Newsletter Gratuita
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            IA na Saúde — O que todo gestor hospitalar precisa saber antes de decidir
          </h1>
          <p className="text-blue-100 text-lg">
            Toda semana: as principais novidades sobre Inteligência Artificial e dados na saúde,
            com análise prática para líderes do setor hospitalar.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-md mx-auto text-center space-y-8">
          {confirmed === 'true' ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 space-y-3">
              <div className="text-4xl">✅</div>
              <h2 className="text-2xl font-bold text-green-800">Assinatura confirmada!</h2>
              <p className="text-green-700">
                Bem-vindo(a) à AI Health Newsletter. Você receberá a próxima edição em breve.
              </p>
            </div>
          ) : confirmed === 'error' ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 space-y-3">
              <div className="text-4xl">❌</div>
              <h2 className="text-2xl font-bold text-red-800">Link inválido ou expirado</h2>
              <p className="text-red-700">
                Não foi possível confirmar sua assinatura. Tente se cadastrar novamente.
              </p>
              <SubscribeForm />
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Receba gratuitamente</h2>
                <p className="text-gray-500 mt-2">Para gestores, diretores e profissionais de TI hospitalar</p>
              </div>
              <SubscribeForm />
            </>
          )}
        </div>
      </section>

      {/* Value props */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          {[
            { icon: '🧠', title: 'Curadoria inteligente', desc: 'Conteúdo filtrado por IA e revisado por especialista' },
            { icon: '📊', title: 'Foco em gestão', desc: 'Análises práticas para decisões em ambiente hospitalar' },
            { icon: '📬', title: 'Semanal', desc: 'Toda semana na sua caixa de entrada, sem ruído' },
          ].map(item => (
            <div key={item.title} className="space-y-3">
              <div className="text-4xl">{item.icon}</div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-gray-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
