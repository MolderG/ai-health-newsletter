import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('searchHealthAINews', () => {
  it('returns a non-empty string with news', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'Artigo 1: IA melhora diagnósticos\nArtigo 2: Hospital usa ML para agendamentos',
          },
        }],
      }),
    })

    const { searchHealthAINews } = await import('../perplexity')
    const result = await searchHealthAINews()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('searchDailyHealthAINews', () => {
  it('returns an array of 3 daily news items', async () => {
    const mockItems = [
      { titulo: 'IA em diagnósticos', resumo: 'Nova IA...', fonte: 'Reuters' },
      { titulo: 'Hospital automatiza', resumo: 'Sistema ML...', fonte: 'Folha' },
      { titulo: 'Regulação ANS', resumo: 'Nova norma...', fonte: 'Valor' },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: JSON.stringify(mockItems) },
        }],
      }),
    })

    const { searchDailyHealthAINews } = await import('../perplexity')
    const result = await searchDailyHealthAINews()
    expect(result).toHaveLength(3)
    expect(result[0].titulo).toBe('IA em diagnósticos')
    expect(result[0].resumo).toBe('Nova IA...')
    expect(result[0].fonte).toBe('Reuters')
  })
})
