// lib/ai/__tests__/pipeline-feedback.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/ai/openrouter', () => ({
  generateWithModel: vi.fn().mockResolvedValue(
    JSON.stringify({
      subject: 'IA no hospital',
      materias: [{
        titulo: 'Teste',
        oQueAconteceu: 'Algo aconteceu.',
        comoFunciona: 'Funciona assim.',
        porQueImporta: 'É importante.',
        nossaVisao: 'Nossa visão.',
      }],
      numeroDaSemana: null,
      blocoPromo: null,
    })
  ),
}))

describe('generateNewsletter', () => {
  it('returns previewText derived from materia titles', async () => {
    const { generateNewsletter } = await import('@/lib/ai/pipeline')
    const result = await generateNewsletter('some news')
    expect(result.previewText).toBe('Teste')
  })

  it('accepts feedback and returns a result', async () => {
    const { generateNewsletter } = await import('@/lib/ai/pipeline')
    const result = await generateNewsletter('some news', 'Improve the tone')
    expect(result.previewText).toBeDefined()
    expect(result.subject).toBe('IA no hospital')
  })
})
