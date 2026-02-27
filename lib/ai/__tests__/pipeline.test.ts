import { describe, it, expect, vi } from 'vitest'

vi.mock('../openrouter', () => ({
  generateWithModel: vi.fn()
    .mockResolvedValueOnce('Output A da minimax')
    .mockResolvedValueOnce('Output B da deepseek')
    .mockResolvedValueOnce('Output C do grok')
    .mockResolvedValueOnce(JSON.stringify({
      winner: 'A',
      justification: 'Melhor tom consultivo',
      content: 'Output A da minimax',
    })),
}))

describe('generateNewsletter', () => {
  it('returns winning content and stores all outputs', async () => {
    const { generateNewsletter } = await import('../pipeline')
    const result = await generateNewsletter('notícias de teste')

    expect(result.winningContent).toBeDefined()
    expect(result.winningModel).toBeDefined()
    expect(result.justification).toBeDefined()
    expect(result.allOutputs).toHaveLength(3)
  })
})
