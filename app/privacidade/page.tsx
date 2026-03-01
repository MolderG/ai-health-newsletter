import { ShieldCheck } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Política de Privacidade | AI Health Newsletter',
  description: 'Saiba como tratamos seus dados pessoais em conformidade com a LGPD.',
}

export default function Privacidade() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Política de Privacidade</h1>
              <p className="text-sm text-zinc-500">Última atualização: março de 2025</p>
            </div>
          </div>

          <div className="prose prose-zinc prose-sm max-w-none space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-zinc-800 mb-3">1. Dados que coletamos</h2>
              <p className="text-zinc-600 leading-relaxed">
                Ao se inscrever no newsletter, coletamos as seguintes informações fornecidas por você:
              </p>
              <ul className="mt-2 space-y-1 text-zinc-600 list-disc pl-5">
                <li>Nome completo</li>
                <li>Endereço de email</li>
                <li>Cargo ou função profissional</li>
                <li>Hospital ou instituição de saúde</li>
                <li>Cidade e estado</li>
              </ul>
            </section>

            <div className="border-t border-zinc-200" />

            <section>
              <h2 className="text-lg font-semibold text-zinc-800 mb-3">2. Finalidade do tratamento</h2>
              <p className="text-zinc-600 leading-relaxed">
                Os dados coletados são utilizados exclusivamente para:
              </p>
              <ul className="mt-2 space-y-1 text-zinc-600 list-disc pl-5">
                <li>Envio periódico do AI Health Newsletter</li>
                <li>Análise de engajamento com os conteúdos enviados (abertura, cliques)</li>
                <li>Personalização e melhoria do conteúdo editorial</li>
              </ul>
            </section>

            <div className="border-t border-zinc-200" />

            <section>
              <h2 className="text-lg font-semibold text-zinc-800 mb-3">3. Base legal</h2>
              <p className="text-zinc-600 leading-relaxed">
                O tratamento dos seus dados pessoais é realizado com base no <strong>consentimento</strong> do
                titular, conforme o Art. 7º, inciso I, da Lei Geral de Proteção de Dados (LGPD — Lei nº
                13.709/2018). Você pode revogar seu consentimento a qualquer momento cancelando sua inscrição.
              </p>
            </section>

            <div className="border-t border-zinc-200" />

            <section>
              <h2 className="text-lg font-semibold text-zinc-800 mb-3">4. Compartilhamento de dados</h2>
              <p className="text-zinc-600 leading-relaxed">
                Seus dados são compartilhados apenas com a <strong>Resend</strong>, plataforma utilizada para o
                envio e entrega dos emails do newsletter. Esse compartilhamento é estritamente necessário para a
                prestação do serviço.
              </p>
              <p className="mt-2 text-zinc-600 leading-relaxed">
                Não vendemos, alugamos nem compartilhamos seus dados pessoais com terceiros para fins
                comerciais ou publicitários.
              </p>
            </section>

            <div className="border-t border-zinc-200" />

            <section>
              <h2 className="text-lg font-semibold text-zinc-800 mb-3">5. Seus direitos</h2>
              <p className="text-zinc-600 leading-relaxed">
                Como titular dos dados, você tem os seguintes direitos garantidos pela LGPD:
              </p>
              <ul className="mt-2 space-y-1 text-zinc-600 list-disc pl-5">
                <li><strong>Acesso:</strong> saber quais dados possuímos sobre você</li>
                <li><strong>Correção:</strong> atualizar dados incompletos ou incorretos</li>
                <li><strong>Exclusão:</strong> solicitar a remoção dos seus dados</li>
                <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado</li>
                <li><strong>Revogação do consentimento:</strong> cancelar sua inscrição a qualquer momento</li>
              </ul>
            </section>

            <div className="border-t border-zinc-200" />

            <section>
              <h2 className="text-lg font-semibold text-zinc-800 mb-3">6. Retenção de dados</h2>
              <p className="text-zinc-600 leading-relaxed">
                Seus dados são mantidos enquanto sua inscrição estiver ativa. Após o cancelamento da
                inscrição, seus dados pessoais serão anonimizados em até <strong>30 dias</strong>.
              </p>
            </section>

            <div className="border-t border-zinc-200" />

            <section>
              <h2 className="text-lg font-semibold text-zinc-800 mb-3">7. Contato</h2>
              <p className="text-zinc-600 leading-relaxed">
                Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento dos seus dados, entre em
                contato pelo email:{' '}
                <a
                  href="mailto:privacidade@aihealthnewsletter.com.br"
                  className="text-blue-600 hover:underline"
                >
                  privacidade@aihealthnewsletter.com.br
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
