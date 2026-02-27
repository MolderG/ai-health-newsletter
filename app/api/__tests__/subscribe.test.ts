import { describe, it, expect, vi } from 'vitest'

const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
const mockEq = vi.fn().mockReturnThis()
const mockSelect = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockReturnValue({
  select: mockSelect,
  single: mockSingle,
})

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({
    from: () => ({
      insert: mockInsert,
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    }),
  }),
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return {
      emails: { send: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null }) },
    }
  }),
}))

describe('POST /api/subscribe', () => {
  it('rejects missing email', async () => {
    const { POST } = await import('../subscribe/route')
    const request = new Request('http://localhost/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('rejects missing name', async () => {
    const { POST } = await import('../subscribe/route')
    const request = new Request('http://localhost/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })
})
