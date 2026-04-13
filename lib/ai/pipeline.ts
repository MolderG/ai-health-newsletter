import { generateWithModel } from './openrouter'
import { renderNewsletterHTML, type NewsletterContent } from './newsletter-template'

const GENERATION_MODELS = [
  'deepseek/deepseek-v3.2',
  'google/gemini-3-flash-preview',
  'qwen/qwen3.5-397b-a17b',
  'moonshotai/kimi-k2.5',
] as const

const EVALUATOR_MODEL = 'google/gemini-3.1-pro-preview'

function buildGenerationPrompt(news: string, feedback?: string): string {
  const feedbackBlock = feedback
    ? `\n\n---\n\nNOTA DO EDITOR (melhorias solicitadas — aplique em TODAS as seções):\n${feedback}\n\n---`
    : ''
  return `Você é Henrique, curador da newsletter "AI Health" — escrita para diretores, superintendentes e gestores de hospitais brasileiros.
Seu tom é o de um colega experiente de campo: consultivo, direto, sem jargão técnico excessivo.
Você escreve como Andrew Ng escreve "The Batch": opinião editorial clara, dados com fonte, estrutura consistente.

---

Com base nas notícias aprovadas abaixo, gere o conteúdo de uma edição completa seguindo EXATAMENTE as regras abaixo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMPO "subject"
Lista os 3-4 temas da edição separados por vírgula. Ex: "IA prevê reinternações, glosas em tempo real, o custo do leito ocioso, regulação de IA na ANS"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMPO "materias" (array de 4 a 5 objetos)
Misture os temas: 1-2 sobre IA/tecnologia, 1 sobre gestão/indicadores, 1 sobre regulação/mercado.

Cada matéria tem os campos:
- "titulo": frase-manchete descritiva
- "oQueAconteceu": 2-3 frases. O fato concreto — quem fez, o quê, quando. Cite a fonte entre parênteses.
- "comoFunciona": 3-5 frases. Explicação acessível da tecnologia ou mudança.
- "porQueImporta": 2-4 frases. Implicação prática para a gestão hospitalar brasileira.
- "nossaVisao": 1-3 frases. Opinião editorial do Henrique. Tom de quem está no campo.

TODOS os campos são texto puro (sem HTML, sem bullet points).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMPO "numeroDaSemana" (opcional — null se não houver dado impactante)
- "numero": o dado em destaque, ex: "23 dias"
- "contexto": frase explicando o dado
- "fonte": fonte entre parênteses

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMPO "blocoPromo": sempre null por enquanto

---

REGRAS DE ESCRITA:
- Português brasileiro, frases curtas, parágrafos de 2-3 linhas
- NUNCA use: "nesse sentido", "diante disso", "vale ressaltar", "no cenário atual", "é fundamental", "cada vez mais"
- SEMPRE cite a fonte de dados entre parênteses
- Se não houver fonte verificável, use "em um caso recente" ou "em hospitais que acompanhamos"
- NUNCA invente estatísticas
- Máximo 3 emojis em toda a edição
- Não mencione WeKnow no conteúdo editorial
- Escreva em prosa corrida — sem bullet points

---

NOTÍCIAS APROVADAS DA SEMANA:
${news}${feedbackBlock}

---

Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem texto fora do JSON):
{
  "subject": "tema1, tema2, tema3",
  "materias": [
    {
      "titulo": "...",
      "oQueAconteceu": "...",
      "comoFunciona": "...",
      "porQueImporta": "...",
      "nossaVisao": "..."
    }
  ],
  "numeroDaSemana": {
    "numero": "23 dias",
    "contexto": "...",
    "fonte": "..."
  },
  "blocoPromo": null
}`
}

function buildEvaluatorPrompt(outputs: { model: string; content: string }[]): string {
  return `Você é editor-chefe de uma newsletter de referência para gestores hospitalares brasileiros. Avalie os ${outputs.length} rascunhos JSON abaixo e escolha o melhor.

Critérios de avaliação (em ordem de prioridade):
1. JSON válido e completo com todos os campos obrigatórios?
2. Fontes citadas nas matérias?
3. Prosa corrida nas subseções (sem bullet points)?
4. Ausência de frases proibidas: "nesse sentido", "diante disso", "vale ressaltar", "no cenário atual", "é fundamental", "cada vez mais"
5. Relevância prática para gestão hospitalar brasileira (glosas, leitos, faturamento, dados)
6. 4 a 5 matérias cobrindo temas variados (IA, gestão, regulação)

${outputs.map((o, i) => `=== RASCUNHO ${String.fromCharCode(65 + i)} (${o.model}) ===\n${o.content}`).join('\n\n')}

Responda APENAS com JSON no formato (sem nenhum outro texto):
{
  "winner": "A",
  "justification": "motivo em 2-3 frases"
}`
}

export interface PipelineResult {
  winningContent: string
  winningModel: string
  justification: string
  subject: string
  previewText: string          // NEW: plain text excerpt of the carta editorial
  allOutputs: { model: string; content: string }[]
}

export async function generateNewsletter(
  news: string,
  feedback?: string,        // NEW optional param
): Promise<PipelineResult> {
  const prompt = buildGenerationPrompt(news, feedback)

  // Run all models in parallel — if one fails, continue with the rest
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

  let evaluation: { winner: string; justification: string }
  try {
    const jsonMatch = evaluationRaw.match(/\{[\s\S]*?\}/)
    evaluation = JSON.parse(jsonMatch?.[0] ?? evaluationRaw)
  } catch {
    // Fallback: use first output if parsing fails
    evaluation = { winner: 'A', justification: 'Avaliação automática falhou' }
  }

  const winnerIndex = evaluation.winner.charCodeAt(0) - 65
  const isValidIndex = winnerIndex >= 0 && winnerIndex < allOutputs.length
  const winningModel = isValidIndex ? allOutputs[winnerIndex].model : allOutputs[0].model
  // Use the raw model output directly — avoids JSON-inside-JSON encoding issues
  const winningRaw = isValidIndex ? allOutputs[winnerIndex].content : allOutputs[0].content

  // Parse the winning JSON and render HTML
  let newsletterData: NewsletterContent
  try {
    const jsonMatch = winningRaw.match(/\{[\s\S]*\}/)
    newsletterData = JSON.parse(jsonMatch?.[0] ?? winningRaw)
  } catch {
    throw new Error('Failed to parse winning newsletter JSON')
  }

  const winningContent = renderNewsletterHTML(newsletterData)
  const previewText = newsletterData.materias.map(m => m.titulo).join(' · ')

  return {
    winningContent,
    winningModel,
    justification: evaluation.justification,
    subject: newsletterData.subject,
    previewText,              // NEW
    allOutputs,
  }
}
