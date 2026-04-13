import { describe, it, expect, vi } from 'vitest'

// Valid newsletter JSON (no carta) for the winning model output
const validNewsletterJson = JSON.stringify({
  subject: 'IA em diagnósticos, automação hospitalar, regulação ANS',
  materias: [{
    titulo: 'IA melhora diagnósticos em hospitais',
    oQueAconteceu: 'Hospital X implementou IA.',
    comoFunciona: 'O sistema analisa exames.',
    porQueImporta: 'Reduz tempo de diagnóstico.',
    nossaVisao: 'Tendência irreversível.',
  }],
  numeroDaSemana: null,
  blocoPromo: null,
})

vi.mock('../openrouter', () => ({
  generateWithModel: vi.fn()
    // 4 generation models
    .mockResolvedValueOnce(validNewsletterJson)
    .mockResolvedValueOnce(validNewsletterJson)
    .mockResolvedValueOnce(validNewsletterJson)
    .mockResolvedValueOnce(validNewsletterJson)
    // 1 evaluator
    .mockResolvedValueOnce(JSON.stringify({
      winner: 'A',
      justification: 'Melhor tom consultivo',
    })),
}))

describe('generateNewsletter', () => {
  it('returns winning content and stores all outputs', async () => {
    const { generateNewsletter } = await import('../pipeline')
    const result = await generateNewsletter('notícias de teste')

    expect(result.winningContent).toBeDefined()
    expect(result.winningContent).toContain('IA melhora diagnósticos')
    expect(result.winningModel).toBe('deepseek/deepseek-v3.2')
    expect(result.justification).toBe('Melhor tom consultivo')
    expect(result.subject).toBe('IA em diagnósticos, automação hospitalar, regulação ANS')
    expect(result.previewText).toBe('IA melhora diagnósticos em hospitais')
    expect(result.allOutputs).toHaveLength(4)
  })
})
