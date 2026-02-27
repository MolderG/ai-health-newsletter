import { describe, it, expect, vi } from 'vitest'

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    choices: [{
      message: {
        content: 'Artigo 1: IA melhora diagnósticos\nArtigo 2: Hospital usa ML para agendamentos',
      },
    }],
  }),
} as any)

describe('searchHealthAINews', () => {
  it('returns a non-empty string with news', async () => {
    const { searchHealthAINews } = await import('../perplexity')
    const result = await searchHealthAINews()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
