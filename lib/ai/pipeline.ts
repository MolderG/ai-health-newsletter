import { generateWithModel } from './openrouter'

const GENERATION_MODELS = [
  'minimax/minimax-m2.5',
  'deepseek/deepseek-v3.2',
  'x-ai/grok-4.1-fast',
] as const

const EVALUATOR_MODEL = 'google/gemini-3-flash-preview'

function buildGenerationPrompt(news: string): string {
  return `Você é um especialista em gestão hospitalar e IA na saúde, escrevendo para diretores e gestores de hospitais brasileiros.

Com base nas notícias abaixo, escreva uma edição completa de newsletter semanal em HTML com:
1. Editorial de abertura: 2-3 parágrafos com perspectiva consultiva
2. 3 a 5 notícias comentadas: título + resumo + "O que isso significa para seu hospital"
3. CTA final sutil: convide o leitor a refletir sobre como dados integrados podem ajudar — inclua o texto "saiba mais" com href="https://weknow.com.br?ref=cta-comercial"

Tom: consultivo, direto, sem jargão técnico excessivo. Foco em impacto prático na gestão.

NOTÍCIAS:
${news}

Responda APENAS com o HTML da newsletter, sem explicações.`
}

function buildEvaluatorPrompt(outputs: { model: string; content: string }[]): string {
  return `Você é um especialista em comunicação para o setor de saúde. Avalie os ${outputs.length} rascunhos de newsletter abaixo e escolha o melhor.

Critérios:
- Clareza e tom consultivo adequado para gestores hospitalares
- Relevância prática do conteúdo
- Qualidade e naturalidade do CTA
- Precisão e coerência das informações

${outputs.map((o, i) => `=== RASCUNHO ${String.fromCharCode(65 + i)} (${o.model}) ===\n${o.content}`).join('\n\n')}

Responda APENAS com JSON no formato:
{
  "winner": "A" | "B" | "C",
  "justification": "motivo em 2-3 frases",
  "content": "[copie aqui o HTML do rascunho vencedor exatamente como está]"
}`
}

export interface PipelineResult {
  winningContent: string
  winningModel: string
  justification: string
  allOutputs: { model: string; content: string }[]
}

export async function generateNewsletter(news: string): Promise<PipelineResult> {
  const prompt = buildGenerationPrompt(news)

  // Run 3 models in parallel — if one fails, continue with the rest
  const results = await Promise.allSettled(
    GENERATION_MODELS.map(model => generateWithModel(model, prompt))
  )

  const allOutputs = results
    .map((result, i) => ({
      model: GENERATION_MODELS[i],
      content: result.status === 'fulfilled' ? result.value : null,
    }))
    .filter(o => o.content !== null) as { model: string; content: string }[]

  if (allOutputs.length === 0) throw new Error('All generation models failed')

  // Evaluate with Gemini
  const evaluatorPrompt = buildEvaluatorPrompt(allOutputs)
  const evaluationRaw = await generateWithModel(EVALUATOR_MODEL, evaluatorPrompt)

  let evaluation: { winner: string; justification: string; content: string }
  try {
    const jsonMatch = evaluationRaw.match(/\{[\s\S]*\}/)
    evaluation = JSON.parse(jsonMatch?.[0] ?? evaluationRaw)
  } catch {
    // Fallback: use first output if parsing fails
    evaluation = { winner: 'A', justification: 'Avaliação automática falhou', content: allOutputs[0].content }
  }

  const winnerIndex = evaluation.winner.charCodeAt(0) - 65
  const isValidIndex = winnerIndex >= 0 && winnerIndex < allOutputs.length
  const winningModel = isValidIndex ? allOutputs[winnerIndex].model : allOutputs[0].model
  const winningContent = isValidIndex ? evaluation.content : allOutputs[0].content

  return {
    winningContent,
    winningModel,
    justification: evaluation.justification,
    allOutputs,
  }
}
