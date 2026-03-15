// lib/ai/__tests__/pipeline-feedback.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/ai/openrouter', () => ({
  generateWithModel: vi.fn().mockResolvedValue(
    JSON.stringify({
      subject: 'IA no hospital',
      carta: '<p>Esta semana foi intensa.</p><p>Boa leitura,<br>Henrique</p>',
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
  it('returns previewText as plain text extracted from carta', async () => {
    const { generateNewsletter } = await import('@/lib/ai/pipeline')
    const result = await generateNewsletter('some news')
    expect(result.previewText).toBe('Esta semana foi intensa. Boa leitura, Henrique')
  })

  it('accepts feedback and returns a result', async () => {
    const { generateNewsletter } = await import('@/lib/ai/pipeline')
    const result = await generateNewsletter('some news', 'Improve the carta tone')
    expect(result.previewText).toBeDefined()
    expect(result.subject).toBe('IA no hospital')
  })
})
