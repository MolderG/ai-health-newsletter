import { describe, it, expect, vi } from 'vitest'

const mockUpdate = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'sub-1', lead_score: 10 }, error: null })
const mockSelect = vi.fn().mockReturnThis()

vi.mock('@/lib/lead-scoring', () => ({
  calculateScoreDelta: vi.fn().mockReturnValue(2),
}))

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({
    from: () => ({
      insert: mockInsert,
      select: mockSelect,
      eq: mockEq,
      update: mockUpdate,
      single: mockSingle,
    }),
  }),
}))

describe('POST /api/webhooks/resend', () => {
  it('returns 400 if no event type', async () => {
    const { POST } = await import('../webhooks/resend/route')
    const request = new Request('http://localhost/api/webhooks/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('returns 200 for valid open event', async () => {
    const { POST } = await import('../webhooks/resend/route')
    const request = new Request('http://localhost/api/webhooks/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email.opened',
        data: { email_to: ['test@example.com'] },
      }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
  })
})
