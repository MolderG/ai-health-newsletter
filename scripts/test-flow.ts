/**
 * Script de teste end-to-end do fluxo completo da newsletter.
 * Não salva nada no banco, não afeta inscritos reais.
 *
 * Uso:
 *   npm run test:flow                       (fluxo completo: busca + geração + envio de email)
 *   npm run test:flow -- --to outro@email.com
 *   npm run test:flow -- --daily-only       (busca 3 notícias e envia para Telegram com botões)
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Carrega .env.local antes de qualquer coisa
config({ path: resolve(process.cwd(), '.env.local') })

import { Resend } from 'resend'
import { searchDailyHealthAINews } from '../lib/ai/perplexity'
import { generateNewsletter } from '../lib/ai/pipeline'
import { sendNewsCandidateNotification } from '../lib/telegram'

// ─── Argumentos ──────────────────────────────────────────────────────────────
const toIndex = process.argv.indexOf('--to')
const TO_EMAIL = toIndex !== -1 ? process.argv[toIndex + 1] : 'moldergs@gmail.com'
const DAILY_ONLY = process.argv.includes('--daily-only')

// ─── Helpers de log ───────────────────────────────────────────────────────────
function log(step: string, msg: string) {
  const ts = new Date().toLocaleTimeString('pt-BR')
  console.log(`[${ts}] [${step}] ${msg}`)
}

function logSection(title: string) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(60))
}

// ─── Verificação de variáveis de ambiente ─────────────────────────────────────
function checkEnv() {
  logSection('🔍  Verificando variáveis de ambiente')
  const required = DAILY_ONLY
    ? ['PERPLEXITY_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']
    : ['PERPLEXITY_API_KEY', 'OPENROUTER_API_KEY', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL']
  let ok = true
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`  ❌  ${key} não configurada`)
      ok = false
    } else {
      log('ENV', `✅  ${key} OK`)
    }
  }
  if (!ok) process.exit(1)
}

// ─── Etapa 1: Buscar notícias diárias (Perplexity) ───────────────────────────
async function fetchDailyNews() {
  logSection('📰  Etapa 1 — Buscando 3 notícias do dia (Perplexity sonar-pro)')
  log('PERPLEXITY', 'Iniciando busca de notícias diárias de IA na saúde...')

  const items = await searchDailyHealthAINews()

  log('PERPLEXITY', `✅  ${items.length} notícias recebidas:`)
  items.forEach((item, i) => {
    log('PERPLEXITY', `  ${i + 1}. ${item.titulo}`)
    log('PERPLEXITY', `     Resumo: ${item.resumo.slice(0, 100)}...`)
    log('PERPLEXITY', `     Fonte: ${item.fonte}`)
  })

  return items
}

// ─── Etapa 2: Formatar notícias como input do pipeline ────────────────────────
function formatNewsForPipeline(items: Awaited<ReturnType<typeof searchDailyHealthAINews>>): string {
  return items
    .map((n, i) => `${i + 1}. ${n.titulo}\nResumo: ${n.resumo}\nFonte: ${n.fonte ?? 'não informada'}`)
    .join('\n\n')
}

// ─── Etapa 3: Gerar newsletter (pipeline: 4 modelos + avaliador) ─────────────
async function runGeneration(news: string) {
  logSection('🤖  Etapa 2 — Gerando newsletter (4 modelos em paralelo + avaliador)')

  log('PIPELINE', 'Disparando modelos em paralelo...')
  const start = Date.now()

  const result = await generateNewsletter(news)

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  log('PIPELINE', `✅  Geração concluída em ${elapsed}s`)
  log('PIPELINE', `🏆  Modelo vencedor: ${result.winningModel}`)
  log('PIPELINE', `   Justificativa: ${result.justification}`)
  log('PIPELINE', `   Subject: ${result.subject}`)
  log('PIPELINE', `   Preview: ${result.previewText}`)
  log('PIPELINE', `   Modelos que responderam: ${result.allOutputs.map(o => o.model).join(', ')}`)
  result.allOutputs.forEach(o => log('PIPELINE', `   [${o.model}] ${o.content.length} chars`))

  return {
    content: result.winningContent,
    model: result.winningModel,
    justification: result.justification,
    subject: result.subject,
  }
}

// ─── Etapa 4: Enviar email (Resend) ──────────────────────────────────────────
async function sendTestEmail(html: string, subject: string): Promise<void> {
  logSection(`📧  Etapa 3 — Enviando email para ${TO_EMAIL} (Resend)`)

  const resend = new Resend(process.env.RESEND_API_KEY!)
  const from = `AI Health Newsletter <${process.env.RESEND_FROM_EMAIL ?? 'newsletter@seudominio.com.br'}>`

  const footerHtml = `
  <div style="text-align:center;padding:16px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;margin-top:32px">
    <em>[EMAIL DE TESTE — não enviado para inscritos reais]</em>
  </div>`

  const fullSubject = `[TESTE] ${subject}`

  log('RESEND', `De: ${from}`)
  log('RESEND', `Para: ${TO_EMAIL}`)
  log('RESEND', `Assunto: ${fullSubject}`)
  log('RESEND', 'Enviando...')

  const { data, error } = await resend.emails.send({
    from,
    to: TO_EMAIL!,
    subject: fullSubject,
    html: html + footerHtml,
  })

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)

  log('RESEND', `✅  Email enviado! ID: ${data?.id}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  TEST FLOW — AI Health Newsletter')
  console.log(`   Modo: ${DAILY_ONLY ? 'Busca diária apenas' : 'Fluxo completo (busca + geração + envio)'}`)
  console.log(`   Destino: ${TO_EMAIL}`)
  console.log(`   Data:    ${new Date().toLocaleString('pt-BR')}`)

  const totalStart = Date.now()

  checkEnv()

  // Etapa 1: Buscar notícias diárias
  const dailyItems = await fetchDailyNews()

  if (DAILY_ONLY) {
    logSection('📲  Enviando notícias para Telegram com botões de aprovação')

    for (const item of dailyItems) {
      // Use a fake ID since this is a test (not saved to DB)
      const fakeId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const msgId = await sendNewsCandidateNotification({
        titulo: item.titulo,
        resumo: item.resumo,
        fonte: item.fonte,
        candidateId: fakeId,
      })
      log('TELEGRAM', `✅  "${item.titulo}" — message_id: ${msgId}`)
    }

    const elapsed = ((Date.now() - totalStart) / 1000).toFixed(1)
    logSection('✅  CONCLUÍDO (modo --daily-only)')
    console.log(`  Notícias encontradas: ${dailyItems.length}`)
    console.log(`  Enviadas ao Telegram: ${dailyItems.length}`)
    console.log(`  Tempo total:          ${elapsed}s`)
    console.log(`  ⚠️  Botões são de teste — cliques não salvam no banco\n`)
    return
  }

  // Etapa 2-3: Gerar e enviar
  const news = formatNewsForPipeline(dailyItems)
  const { content, model, justification, subject } = await runGeneration(news)
  await sendTestEmail(content, subject)

  const elapsed = ((Date.now() - totalStart) / 1000).toFixed(1)

  logSection('✅  CONCLUÍDO')
  console.log(`  Modelo vencedor: ${model}`)
  console.log(`  Justificativa:   ${justification}`)
  console.log(`  Tempo total:     ${elapsed}s`)
  console.log(`  Email enviado:   ${TO_EMAIL}\n`)
}

main().catch(err => {
  console.error('\n💥  ERRO FATAL:', err.message ?? err)
  process.exit(1)
})
