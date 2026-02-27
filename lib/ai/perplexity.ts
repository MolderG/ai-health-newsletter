const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

export async function searchHealthAINews(): Promise<string> {
  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'Você é um pesquisador especializado em saúde digital e IA hospitalar. Responda sempre em português.',
        },
        {
          role: 'user',
          content: `Quais são as principais notícias e avanços sobre Inteligência Artificial na saúde nos últimos 7 dias?
          Foque em: gestão hospitalar, BI hospitalar, integração de dados clínicos, automação em hospitais, IA em diagnósticos.
          Liste 5 a 8 itens com: título, resumo de 2-3 frases e fonte.`,
        },
      ],
    }),
  })

  if (!response.ok) throw new Error(`Perplexity API error: ${response.status}`)

  const data = await response.json()
  return data.choices[0].message.content as string
}
