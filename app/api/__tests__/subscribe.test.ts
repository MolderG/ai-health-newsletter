import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
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
