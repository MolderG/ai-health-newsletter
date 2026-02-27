const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function generateWithModel(model: string, prompt: string): Promise<string> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) throw new Error(`OpenRouter error for ${model}: ${response.status}`)

  const data = await response.json()
  return data.choices[0].message.content as string
}
